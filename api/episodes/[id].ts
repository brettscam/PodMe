import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Episode ID is required' })
  }

  const supabase = getServiceClient()

  try {
    // Get episode
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('id, user_id, title, date, status, stage_progress, audio_url, transcript, duration_seconds, error_message, created_at')
      .eq('id', id)
      .single()

    if (epError || !episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    if (episode.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Get sources
    const { data: sources, error: srcError } = await supabase
      .from('episode_sources')
      .select('id, episode_id, topic_id, story_title, source_name, source_url, article_title, published_at')
      .eq('episode_id', id)

    if (srcError) {
      console.error('Failed to fetch episode sources:', srcError.message)
    }

    return res.status(200).json({
      ...episode,
      sources: sources || [],
    })
  } catch (err) {
    console.error('GET /api/episodes/[id] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
