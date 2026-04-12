import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'
import { fetchRssForTopic, type FetchedContent } from '../lib/rss-fetcher'
import { callClaude } from '../lib/claude'

const EDITOR_SYSTEM_PROMPT = `You are a senior news editor. Given these articles organized by topic, select the 3-5 most compelling stories per topic. Drop stale or low-quality items. Order stories for maximum narrative flow. Output JSON: { stories: [{ topic_id, title, summary, key_points: string[], sources: [{ name, url, article_title }], needs_verification: string[] }] }`

const RESEARCHER_SYSTEM_PROMPT = `You are a fact-checking researcher. For each story, search for additional context and verify claims flagged for verification. Enrich each story with background and recent developments. Output JSON with the same structure but with enriched summaries and verified/softened claims.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()

  try {
    // 1. Get user's enabled topics with custom_tags
    const { data: userTopics, error: topicsError } = await supabase
      .from('user_topics')
      .select('topic_id, custom_tags, sort_order')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('sort_order')

    if (topicsError) {
      return res.status(500).json({ error: 'Failed to fetch user topics', detail: topicsError.message })
    }

    if (!userTopics || userTopics.length === 0) {
      return res.status(400).json({ error: 'No enabled topics. Please enable at least one topic.' })
    }

    // 2. Get user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('tone, episode_length, delivery_time')
      .eq('user_id', userId)
      .single()

    const tone = prefs?.tone || 'conversational'
    const episodeLength = prefs?.episode_length || 'medium'

    // 3. Create or upsert episode record
    const today = new Date().toISOString().split('T')[0]
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .upsert(
        {
          user_id: userId,
          date: today,
          title: `Your Daily Briefing — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          status: 'gathering',
          stage_progress: 'Fetching RSS feeds...',
          audio_url: null,
          transcript: null,
          duration_seconds: null,
          error_message: null,
          metadata: null,
        },
        { onConflict: 'user_id,date' },
      )
      .select('id')
      .single()

    if (episodeError || !episode) {
      return res.status(500).json({ error: 'Failed to create episode', detail: episodeError?.message })
    }

    const episodeId = episode.id

    // 4. Fetch RSS for each enabled topic in parallel
    const topicResults: { topicId: string; content: FetchedContent }[] = []

    const fetchPromises = userTopics.map(async (ut) => {
      const content = await fetchRssForTopic(ut.topic_id, ut.custom_tags || [], supabase)
      return { topicId: ut.topic_id, content }
    })

    const results = await Promise.all(fetchPromises)
    topicResults.push(...results)

    // Update progress
    const totalArticles = topicResults.reduce((sum, r) => sum + r.content.articles.length, 0)
    const totalFeeds = topicResults.reduce((sum, r) => sum + r.content.feeds_queried, 0)
    const succeededFeeds = topicResults.reduce((sum, r) => sum + r.content.feeds_succeeded, 0)

    await supabase
      .from('episodes')
      .update({
        status: 'building',
        stage_progress: `Gathered ${totalArticles} articles from ${succeededFeeds}/${totalFeeds} feeds. Running editorial selection...`,
      })
      .eq('id', episodeId)

    // 5. Build article digest for the editor agent
    const articleDigest = topicResults.map(({ topicId, content }) => {
      const articleList = content.articles.slice(0, 30).map((a, i) => {
        return `  ${i + 1}. [${a.source_name}] "${a.title}"\n     ${a.description}\n     URL: ${a.url}\n     Published: ${a.published_at || 'unknown'}`
      }).join('\n')

      return `## Topic: ${topicId}\n(${content.articles.length} articles, ${content.feeds_succeeded}/${content.feeds_queried} feeds)\n\n${articleList}`
    }).join('\n\n---\n\n')

    // 6. Call Claude Agent 1: Editor
    const editorPrompt = `${EDITOR_SYSTEM_PROMPT}\n\nUser preferences: tone=${tone}, length=${episodeLength}\n\nHere are the articles by topic:\n\n${articleDigest}\n\nRespond with ONLY valid JSON.`

    let editorResult: string
    try {
      editorResult = await callClaude(editorPrompt, { maxTokens: 4096 })
    } catch (err) {
      await supabase
        .from('episodes')
        .update({ status: 'failed', error_message: `Editor agent failed: ${(err as Error).message}` })
        .eq('id', episodeId)
      return res.status(500).json({ error: 'Editor agent failed', episode_id: episodeId })
    }

    // Parse editor output
    let editorData: { stories: Array<{
      topic_id: string
      title: string
      summary: string
      key_points: string[]
      sources: Array<{ name: string; url: string; article_title: string }>
      needs_verification: string[]
    }> }

    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = editorResult.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in editor response')
      editorData = JSON.parse(jsonMatch[0])
    } catch {
      await supabase
        .from('episodes')
        .update({ status: 'failed', error_message: 'Failed to parse editor output' })
        .eq('id', episodeId)
      return res.status(500).json({ error: 'Failed to parse editor output', episode_id: episodeId })
    }

    // 7. Update progress for researcher
    await supabase
      .from('episodes')
      .update({
        stage_progress: `Selected ${editorData.stories.length} stories. Fact-checking and enriching...`,
      })
      .eq('id', episodeId)

    // 8. Call Claude Agent 2: Researcher with web search
    const researcherPrompt = `${RESEARCHER_SYSTEM_PROMPT}\n\nHere are the curated stories to enrich and fact-check:\n\n${JSON.stringify(editorData, null, 2)}\n\nRespond with ONLY valid JSON in the same format.`

    let researcherResult: string
    try {
      researcherResult = await callClaude(researcherPrompt, {
        maxTokens: 4096,
        webSearch: true,
      })
    } catch (err) {
      // If researcher fails, fall back to editor data
      console.error('Researcher agent failed, using editor data:', (err as Error).message)
      researcherResult = JSON.stringify(editorData)
    }

    // Parse researcher output
    let finalStories: typeof editorData
    try {
      const jsonMatch = researcherResult.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      finalStories = JSON.parse(jsonMatch[0])
    } catch {
      // Fall back to editor data if researcher output is unparseable
      finalStories = editorData
    }

    // 9. Store curated stories in episode metadata
    await supabase
      .from('episodes')
      .update({
        metadata: finalStories,
        stage_progress: 'Content curation complete. Ready for script generation.',
      })
      .eq('id', episodeId)

    return res.status(200).json({
      episode_id: episodeId,
      status: 'building',
      stories_count: finalStories.stories?.length || 0,
      feeds_queried: totalFeeds,
      feeds_succeeded: succeededFeeds,
      total_articles: totalArticles,
    })
  } catch (err) {
    console.error('POST /api/generate error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
