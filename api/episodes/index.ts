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
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20))
    const offset = (page - 1) * limit

    // Get total count
    const { count, error: countError } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      return res.status(500).json({ error: 'Failed to count episodes', detail: countError.message })
    }

    const total = count || 0
    const pages = Math.ceil(total / limit)

    // Get paginated episodes
    const { data: episodes, error } = await supabase
      .from('episodes')
      .select('id, user_id, title, date, status, stage_progress, audio_url, duration_seconds, error_message, created_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch episodes', detail: error.message })
    }

    return res.status(200).json({
      episodes: episodes || [],
      total,
      page,
      pages,
    })
  } catch (err) {
    console.error('GET /api/episodes error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
