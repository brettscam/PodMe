import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../../lib/supabase'

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
    const { data: episode, error } = await supabase
      .from('episodes')
      .select('id, status, stage_progress, audio_url, error_message')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    return res.status(200).json(episode)
  } catch (err) {
    console.error('GET /api/generate/status error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
