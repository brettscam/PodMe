import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient } from './lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getServiceClient()

    // Get all topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, label, icon, color')
      .order('label')

    if (topicsError) {
      return res.status(500).json({ error: 'Failed to fetch topics', detail: topicsError.message })
    }

    // Get feed counts per topic
    const { data: feedCounts, error: feedsError } = await supabase
      .from('topic_feeds')
      .select('topic_id')

    if (feedsError) {
      return res.status(500).json({ error: 'Failed to fetch feed counts', detail: feedsError.message })
    }

    // Count feeds per topic
    const countMap: Record<string, number> = {}
    for (const row of feedCounts || []) {
      countMap[row.topic_id] = (countMap[row.topic_id] || 0) + 1
    }

    const result = (topics || []).map(topic => ({
      ...topic,
      feed_count: countMap[topic.id] || 0,
    }))

    return res.status(200).json(result)
  } catch (err) {
    console.error('GET /api/topics error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
