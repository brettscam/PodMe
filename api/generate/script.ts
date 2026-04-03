import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'
import { callClaude } from '../lib/claude'

const WORD_TARGETS: Record<string, number> = {
  short: 1500,
  medium: 3500,
  long: 6000,
}

function buildScriptPrompt(tone: string, wordCount: number): string {
  return `You are writing a podcast script for two co-hosts:
- ALEX: The informed analyst. Clear, direct, context and depth. Dry humor.
- JAMIE: The curious enthusiast. Great questions, makes connections, brings energy.

Tone: ${tone}. Target: ~${wordCount} words.

Write a natural dual-host podcast. Include:
- Cold open (quick tease of top stories)
- Topic segments with genuine back-and-forth
- Natural transitions between topics
- A wrap-up

Format every line as: ALEX: [text] or JAMIE: [text]
No stage directions. No [laughs] or [pauses]. Just dialogue.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { episode_id } = req.body || {}
  if (!episode_id) {
    return res.status(400).json({ error: 'episode_id is required' })
  }

  const supabase = getServiceClient()

  try {
    // 1. Get episode and verify ownership
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('id, user_id, metadata, status')
      .eq('id', episode_id)
      .single()

    if (epError || !episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    if (episode.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!episode.metadata || !episode.metadata.stories) {
      return res.status(400).json({ error: 'Episode has no curated stories. Run /api/generate first.' })
    }

    // 2. Get user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('tone, episode_length')
      .eq('user_id', userId)
      .single()

    const tone = prefs?.tone || 'conversational'
    const episodeLength = prefs?.episode_length || 'medium'
    const wordTarget = WORD_TARGETS[episodeLength] || WORD_TARGETS.medium

    // 3. Update status
    await supabase
      .from('episodes')
      .update({ status: 'scripting', stage_progress: 'Writing podcast script...' })
      .eq('id', episode_id)

    // 4. Build prompt and call Claude
    const systemPrompt = buildScriptPrompt(tone, wordTarget)
    const storiesJson = JSON.stringify(episode.metadata.stories, null, 2)

    const scriptPrompt = `${systemPrompt}\n\nHere are the curated stories for today's episode:\n\n${storiesJson}\n\nWrite the full podcast script now.`

    let transcript: string
    try {
      transcript = await callClaude(scriptPrompt, {
        maxTokens: wordTarget <= 2000 ? 4096 : 8192,
      })
    } catch (err) {
      await supabase
        .from('episodes')
        .update({ status: 'failed', error_message: `Script generation failed: ${(err as Error).message}` })
        .eq('id', episode_id)
      return res.status(500).json({ error: 'Script generation failed', episode_id })
    }

    // 5. Extract sources from the curated stories and save to episode_sources
    const stories = episode.metadata.stories as Array<{
      topic_id: string
      title: string
      sources: Array<{ name: string; url: string; article_title: string }>
    }>

    const sourceRows = stories.flatMap((story) =>
      (story.sources || []).map((src) => ({
        episode_id: episode_id,
        topic_id: story.topic_id,
        story_title: story.title,
        source_name: src.name,
        source_url: src.url,
        article_title: src.article_title || story.title,
      })),
    )

    if (sourceRows.length > 0) {
      // Remove any existing sources for this episode first
      await supabase.from('episode_sources').delete().eq('episode_id', episode_id)

      const { error: srcError } = await supabase
        .from('episode_sources')
        .insert(sourceRows)

      if (srcError) {
        console.error('Failed to insert episode sources:', srcError.message)
      }
    }

    // 6. Save transcript and update status
    await supabase
      .from('episodes')
      .update({
        transcript,
        status: 'scripting',
        stage_progress: 'Script complete. Ready for audio generation.',
      })
      .eq('id', episode_id)

    return res.status(200).json({
      episode_id,
      status: 'scripting',
      word_count: transcript.split(/\s+/).length,
    })
  } catch (err) {
    console.error('POST /api/generate/script error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
