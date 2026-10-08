import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'
import { canAddCustomTopic } from '../lib/tier'

interface CreateBody {
  label?: string
  parent_category?: string
  search_terms?: string[]
  // Feeds already in the pool (chosen from existing_matches)
  pool_feed_ids?: string[]
  // Discovered feeds to add to the pool and link
  new_feeds?: Array<{
    url: string
    name: string
    kind?: 'rss' | 'reddit' | 'atom'
    tier?: 1 | 2 | 3
    tags?: string[]
  }>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return listCustomTopics(req, res)
  if (req.method === 'POST') return createCustomTopic(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}

async function listCustomTopics(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('custom_topics')
    .select(`
      id,
      label,
      parent_category,
      search_terms,
      created_at,
      custom_topic_feeds (
        feed_pool ( id, url, name, kind, tier )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('GET /api/custom-topics error:', error.message)
    return res.status(500).json({ error: 'Failed to load custom topics' })
  }

  const shaped = (data ?? []).map((row) => {
    const links = (row.custom_topic_feeds ?? []) as Array<{ feed_pool: unknown }>
    const feeds = links
      .map((link) => link.feed_pool)
      .flat()
      .filter(Boolean)
    return {
      id: row.id,
      label: row.label,
      parent_category: row.parent_category,
      search_terms: row.search_terms,
      created_at: row.created_at,
      feeds,
    }
  })

  return res.status(200).json(shaped)
}

async function createCustomTopic(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const {
    label,
    parent_category,
    search_terms = [],
    pool_feed_ids = [],
    new_feeds = [],
  } = (req.body ?? {}) as CreateBody

  if (!label || !parent_category) {
    return res.status(400).json({ error: 'label and parent_category are required' })
  }
  if (pool_feed_ids.length === 0 && new_feeds.length === 0) {
    return res.status(400).json({ error: 'At least one feed is required' })
  }

  const supabase = getServiceClient()

  // Enforce tier quota (3 for Free, 10 for Pro, ∞ for Unlimited)
  const quota = await canAddCustomTopic(supabase, userId)
  if (!quota.allowed) {
    return res.status(402).json({
      error: 'quota_exceeded',
      reason: quota.reason,
      tier: quota.tier,
      limit: quota.limit,
      used: quota.used,
    })
  }

  try {
    // 1. Insert into feed_pool (dedup by url) for the new discovered feeds
    const addedFeedIds: string[] = []
    for (const nf of new_feeds) {
      if (!nf.url || !nf.name) continue

      const { data: upserted, error: upsertErr } = await supabase
        .from('feed_pool')
        .upsert(
          {
            url: nf.url,
            name: nf.name,
            kind: nf.kind ?? 'rss',
            tier: nf.tier ?? 3,
            categories: [parent_category],
            tags: nf.tags ?? [],
          },
          { onConflict: 'url' },
        )
        .select('id')
        .single()

      if (upsertErr) {
        console.error('feed_pool upsert error:', upsertErr.message)
        continue
      }
      if (upserted?.id) addedFeedIds.push(upserted.id)
    }

    const allFeedIds = [...new Set([...pool_feed_ids, ...addedFeedIds])]
    if (allFeedIds.length === 0) {
      return res.status(400).json({ error: 'No valid feeds to attach' })
    }

    // 2. Create the custom topic
    const { data: topic, error: topicErr } = await supabase
      .from('custom_topics')
      .insert({
        user_id: userId,
        label,
        parent_category,
        search_terms,
      })
      .select('id')
      .single()

    if (topicErr || !topic) {
      // Unique violation on (user_id, label)
      if (topicErr?.code === '23505') {
        return res.status(409).json({ error: 'A topic with that name already exists' })
      }
      console.error('custom_topics insert error:', topicErr?.message)
      return res.status(500).json({ error: 'Failed to create topic' })
    }

    // 3. Link feeds
    const links = allFeedIds.map((feed_id) => ({
      custom_topic_id: topic.id,
      feed_id,
    }))
    const { error: linkErr } = await supabase.from('custom_topic_feeds').insert(links)
    if (linkErr) {
      console.error('custom_topic_feeds insert error:', linkErr.message)
      // Roll back the topic so the user can retry cleanly
      await supabase.from('custom_topics').delete().eq('id', topic.id)
      return res.status(500).json({ error: 'Failed to attach feeds' })
    }

    // 4. Create the user_topics row (enabled by default)
    const { error: utErr } = await supabase.from('user_topics').insert({
      user_id: userId,
      topic_id: parent_category,
      custom_topic_id: topic.id,
      enabled: true,
    })
    if (utErr) {
      console.error('user_topics insert error:', utErr.message)
    }

    // 5. Bump times_matched on the pool feeds (lightweight popularity signal)
    await supabase.rpc('bump_feed_match_count', { feed_ids: allFeedIds }).then(
      () => {},
      () => {
        // RPC may not exist; non-fatal
      },
    )

    return res.status(201).json({ id: topic.id, feeds_attached: allFeedIds.length })
  } catch (err) {
    console.error('POST /api/custom-topics error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
