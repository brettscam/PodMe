import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token } = req.query
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: share } = await supabase
    .from('shared_episodes')
    .select('*, episodes(*, episode_segments(*))')
    .eq('share_token', token)
    .single()

  if (!share) {
    return res.status(404).json({ error: 'Episode not found' })
  }

  // Increment listen count
  await supabase
    .from('shared_episodes')
    .update({ listen_count: (share.listen_count || 0) + 1 })
    .eq('share_token', token)

  const episode = (share as any).episodes
  if (!episode) {
    return res.status(404).json({ error: 'Episode data not found' })
  }

  return res.status(200).json({
    sharer_name: share.sharer_name,
    episode: {
      ...episode,
      segments: (episode.episode_segments || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    },
  })
}
