import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const id = typeof req.query.id === 'string' ? req.query.id : undefined
  if (!id) return res.status(400).json({ error: 'Missing topic id' })

  const supabase = getServiceClient()

  // delete only if owned by user; cascade handles link rows + user_topics
  const { error, count } = await supabase
    .from('custom_topics')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('DELETE /api/custom-topics/[id] error:', error.message)
    return res.status(500).json({ error: 'Failed to delete topic' })
  }
  if (!count) return res.status(404).json({ error: 'Topic not found' })

  return res.status(204).end()
}
