import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from './lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()

  try {
    if (req.method === 'GET') {
      // Get user topics joined with topic labels
      const { data, error } = await supabase
        .from('user_topics')
        .select(`
          id,
          user_id,
          topic_id,
          enabled,
          custom_tags,
          sort_order,
          topics (
            label,
            icon,
            color
          )
        `)
        .eq('user_id', userId)
        .order('sort_order')

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch user topics', detail: error.message })
      }

      return res.status(200).json(data || [])
    }

    if (req.method === 'PUT') {
      // Accept either { topics: [...] } or a bare array
      const body = req.body || {}
      const topics: unknown[] = Array.isArray(body) ? body : (body.topics || [])

      if (!Array.isArray(topics)) {
        return res.status(400).json({ error: 'Body must be an array or contain a topics array' })
      }

      // Validate each topic entry
      for (const topic of topics) {
        if (!topic.topic_id || typeof topic.topic_id !== 'string') {
          return res.status(400).json({ error: 'Each topic must have a valid topic_id' })
        }
      }

      // Build upsert rows
      const rows = topics.map((t: {
        topic_id: string
        enabled?: boolean
        custom_tags?: string[]
        sort_order?: number
      }) => ({
        user_id: userId,
        topic_id: t.topic_id,
        enabled: t.enabled ?? false,
        custom_tags: t.custom_tags ?? [],
        sort_order: t.sort_order ?? 0,
      }))

      const { data, error } = await supabase
        .from('user_topics')
        .upsert(rows, { onConflict: 'user_id,topic_id' })
        .select(`
          id,
          user_id,
          topic_id,
          enabled,
          custom_tags,
          sort_order,
          topics (
            label,
            icon,
            color
          )
        `)

      if (error) {
        return res.status(500).json({ error: 'Failed to upsert user topics', detail: error.message })
      }

      return res.status(200).json(data || [])
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('user-topics error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
