import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { fetchRssForTopic } from '../lib/rss-fetcher.js'
import { TOPIC_META } from '../lib/topic-meta.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const CRON_SECRET = (process.env.CRON_SECRET || '').trim()

function hashContent(topicId: string, fetchDate: string, claims: string[]): string {
  const input = topicId + fetchDate + JSON.stringify([...claims].sort())
  return createHash('sha256').update(input).digest('hex')
}

export interface IngestionResult {
  topicId: string
  status: 'cached' | 'ingested' | 'failed'
  articleCount?: number
}

export async function ingestAllTopics(today: string): Promise<IngestionResult[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const topicIds = Object.keys(TOPIC_META)

  const results = await Promise.allSettled(
    topicIds.map(async (topicId): Promise<IngestionResult> => {
      // Skip if already cached for today
      const { data: existing } = await supabase
        .from('topic_content')
        .select('id')
        .eq('topic_id', topicId)
        .eq('fetch_date', today)
        .single()

      if (existing) {
        return { topicId, status: 'cached' }
      }

      // Fetch RSS articles
      const rss = await fetchRssForTopic(topicId)

      if (!rss || rss.articles.length === 0) {
        console.warn(`No RSS articles for ${topicId}`)
        return { topicId, status: 'failed' }
      }

      // Store articles as claims/sources for the build-episode pipeline
      const claims = rss.articles.map(a =>
        a.description ? `${a.title}: ${a.description.substring(0, 200)}` : a.title
      )
      const sources = rss.articles.map(a => ({
        outlet: a.outlet,
        domain: new URL(a.url).hostname.replace('www.', ''),
        tier: a.tier,
        title: a.title,
        url: a.url,
        published_at: a.published_at,
        cited_claims: [a.title],
      }))

      const content_hash = hashContent(topicId, today, claims)

      await supabase.from('topic_content').upsert({
        topic_id: topicId,
        fetch_date: today,
        title: rss.articles[0].title,
        claims,
        sources,
        content_hash,
      }, { onConflict: 'topic_id,fetch_date' })

      return { topicId, status: 'ingested', articleCount: rss.articles.length }
    })
  )

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { topicId: topicIds[i], status: 'failed' as const }
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const today = new Date().toISOString().split('T')[0]
  const results = await ingestAllTopics(today)

  const summary = {
    date: today,
    total: results.length,
    cached: results.filter(r => r.status === 'cached').length,
    ingested: results.filter(r => r.status === 'ingested').length,
    failed: results.filter(r => r.status === 'failed').length,
    details: results,
  }

  console.log('Content ingestion complete:', JSON.stringify(summary))
  return res.status(200).json(summary)
}
