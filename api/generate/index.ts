import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'
import { fetchRssForTopic, type FetchedContent } from '../lib/rss-fetcher'
import { fetchContentForCustomTopic } from '../lib/custom-topic-fetcher'
import { articleAgeDays, MAX_ARTICLE_AGE_DAYS } from '../lib/rss-parser'
import { callClaude } from '../lib/claude'
import { canCreateEpisode } from '../lib/tier'
import { triggerStage } from '../lib/pipeline'

const EDITOR_SYSTEM_PROMPT = `You are a senior news editor assembling today's briefing.

Select up to 5 stories per topic, ordered for narrative flow.

FRESHNESS IS THE PRIORITY. This is a daily briefing, not an archive.
- Every article is labelled with its age in days. Prefer the last 2 days.
- Anything 4+ days old needs a real reason to be included — an active
  development, not just a topic that is generally interesting.
- "age unknown" means the feed gave no date. Only use one of those if the
  article's own text shows it is current. Dormant feeds keep serving stale
  items with no date, and those are the most common source of old news
  slipping into a briefing.

RETURNING NOTHING FOR A TOPIC IS CORRECT AND EXPECTED.
- A topic with no genuinely fresh news should be omitted entirely. Just
  leave it out of the stories array.
- Do not pad. Do not reach for an old story to give a topic coverage.
- A briefing covering 2 topics well beats one covering 6 topics with filler.
- If no topic has fresh news, return { "stories": [] }. That is a valid
  answer and is handled downstream.

Output JSON: { stories: [{ topic_id, title, summary, key_points: string[], sources: [{ name, url, article_title }], needs_verification: string[] }] }`

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
    // 0. Enforce weekly episode quota, but allow regen of today's existing episode
    const todayDate = new Date().toISOString().split('T')[0]
    const { data: existingToday } = await supabase
      .from('episodes')
      .select('id')
      .eq('user_id', userId)
      .eq('date', todayDate)
      .maybeSingle()

    if (!existingToday) {
      const quota = await canCreateEpisode(supabase, userId)
      if (!quota.allowed) {
        return res.status(402).json({
          error: 'quota_exceeded',
          reason: quota.reason,
          tier: quota.tier,
          limit: quota.limit,
          used: quota.used,
        })
      }
    }

    // 1. Get user's enabled topics (built-in + custom) with custom_tags
    const { data: userTopics, error: topicsError } = await supabase
      .from('user_topics')
      .select(`
        topic_id,
        custom_topic_id,
        custom_tags,
        sort_order,
        custom_topics ( id, label, search_terms )
      `)
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
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .upsert(
        {
          user_id: userId,
          date: todayDate,
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

    // 4. Fetch content for each enabled topic in parallel.
    // Built-in topics pull from topic_feeds via rss-fetcher. Custom topics
    // pull from custom_topic_feeds → feed_pool via custom-topic-fetcher.
    const topicResults: { topicId: string; content: FetchedContent }[] = []

    const fetchPromises = userTopics.map(async (ut) => {
      if (ut.custom_topic_id) {
        const customTopic = Array.isArray(ut.custom_topics) ? ut.custom_topics[0] : ut.custom_topics
        const searchTerms = (customTopic?.search_terms as string[] | null) ?? []
        const content = await fetchContentForCustomTopic(
          ut.custom_topic_id,
          [...(ut.custom_tags || []), ...searchTerms],
          supabase,
        )
        return { topicId: `custom:${ut.custom_topic_id}`, content }
      }
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

    // 5. Build article digest for the editor agent.
    // Topics that returned nothing are left out entirely rather than shown as
    // empty — an empty heading reads as a gap to fill.
    const now = Date.now()
    const topicsWithContent = topicResults.filter((r) => r.content.articles.length > 0)

    const articleDigest = topicsWithContent.map(({ topicId, content }) => {
      const articleList = content.articles.slice(0, 30).map((a, i) => {
        const age = articleAgeDays(a, now)
        const ageLabel =
          age === null
            ? 'age unknown'
            : age === 0
              ? 'today'
              : age === 1
                ? '1 day old'
                : `${age} days old`
        return `  ${i + 1}. [${a.source_name}] "${a.title}" (${ageLabel})\n     ${a.description}\n     URL: ${a.url}`
      }).join('\n')

      return `## Topic: ${topicId}\n(${content.articles.length} articles within the freshness window, ${content.feeds_succeeded}/${content.feeds_queried} feeds reachable)\n\n${articleList}`
    }).join('\n\n---\n\n')

    // Nothing survived the freshness filter anywhere — no point calling Claude.
    if (topicsWithContent.length === 0) {
      await supabase
        .from('episodes')
        .update({
          status: 'failed',
          error_message: `No fresh news found across your topics in the last ${MAX_ARTICLE_AGE_DAYS} days. This episode does not count against your weekly limit.`,
          stage_progress: null,
        })
        .eq('id', episodeId)

      return res.status(200).json({
        episode_id: episodeId,
        status: 'failed',
        reason: 'no_fresh_content',
        feeds_queried: totalFeeds,
        feeds_succeeded: succeededFeeds,
      })
    }

    // 6. Call Claude Agent 1: Editor
    const todayLabel = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })

    // The editor cannot judge staleness without knowing the current date —
    // previously it saw timestamps with no reference point.
    const editorPrompt = `${EDITOR_SYSTEM_PROMPT}\n\nToday is ${todayLabel}.\n\nUser preferences: tone=${tone}, length=${episodeLength}\n\nHere are the articles by topic:\n\n${articleDigest}\n\nRespond with ONLY valid JSON.`

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

    // 7. The editor is allowed to reject everything as stale. An episode with
    // no stories is worse than no episode, so stop here rather than scripting
    // silence. Failed episodes don't consume quota.
    if (!editorData.stories || editorData.stories.length === 0) {
      await supabase
        .from('episodes')
        .update({
          status: 'failed',
          error_message:
            'Nothing newsworthy enough to run today. Your topics were checked but had no fresh stories. This episode does not count against your weekly limit.',
          stage_progress: null,
        })
        .eq('id', episodeId)

      return res.status(200).json({
        episode_id: episodeId,
        status: 'failed',
        reason: 'no_stories_selected',
        topics_with_content: topicsWithContent.length,
      })
    }

    await supabase
      .from('episodes')
      .update({
        stage_progress: `Selected ${editorData.stories.length} stories across ${new Set(editorData.stories.map((s) => s.topic_id)).size} topics. Fact-checking…`,
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
        stage_progress: 'Content curation complete. Writing script…',
      })
      .eq('id', episodeId)

    // 10. Hand off to the script stage server-side. The client polls only to
    // display progress now — closing the tab no longer strands the episode.
    triggerStage('script', episodeId)

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
