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

  const supabase = getServiceClient()

  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: episode, error } = await supabase
      .from('episodes')
      .select('id, user_id, title, date, status, stage_progress, audio_url, transcript, duration_seconds, error_message, created_at')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (error || !episode) {
      return res.status(404).json({ error: 'No episode for today' })
    }

    // Get sources
    const { data: sources } = await supabase
      .from('episode_sources')
      .select('id, episode_id, topic_id, story_title, source_name, source_url, article_title, published_at')
      .eq('episode_id', episode.id)

    return res.status(200).json({
      ...episode,
      sources: sources || [],
    })
  } catch (err) {
    console.error('GET /api/episodes/today error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
