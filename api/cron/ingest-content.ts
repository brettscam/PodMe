import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { fetchRssForTopic } from '../lib/rss-fetcher'
import { mergeRssAndWebSearch } from '../lib/content-merger'
import { TOPIC_META } from '../lib/topic-meta'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

function hashContent(topicId: string, fetchDate: string, claims: string[]): string {
  const input = topicId + fetchDate + JSON.stringify([...claims].sort())
  return createHash('sha256').update(input).digest('hex')
}

async function fetchTopicContentViaWebSearch(
  topicId: string, label: string, subs: string[],
): Promise<{ title: string; claims: string[]; sources: any[] } | null> {
  if (!anthropicApiKey) return null
  const prompt = `Search for the latest news about "${label}". Focus on these subtopics: ${subs.join(', ')}.
After searching, return a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{"title":"headline","claims":["claim 1","claim 2"],"sources":[{"outlet":"Name","domain":"example.com","tier":1,"title":"Article","url":"https://...","published_at":"2026-03-18T00:00:00Z","cited_claims":["claim 1"]}]}
Include 3-6 claims and 2-4 sources.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2025-01-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const textBlocks = (data.content || []).filter((b: any) => b.type === 'text')
    const rawText = textBlocks.map((b: any) => b.text).join('')
    let parsed
    try { parsed = JSON.parse(rawText) } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      parsed = JSON.parse(jsonMatch[0])
    }
    if (!parsed.title || !Array.isArray(parsed.claims)) return null
    return parsed
  } catch { return null }
}

export interface IngestionResult {
  topicId: string
  status: 'cached' | 'ingested' | 'failed'
  articlesFromRss?: number
  claimsFromWeb?: number
}

export async function ingestAllTopics(today: string): Promise<IngestionResult[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const topicIds = Object.keys(TOPIC_META)

  const results = await Promise.allSettled(
    topicIds.map(async (topicId): Promise<IngestionResult> => {
      const { data: existing } = await supabase
        .from('topic_content')
        .select('id')
        .eq('topic_id', topicId)
        .eq('fetch_date', today)
        .single()

      if (existing) {
        return { topicId, status: 'cached' }
      }

      const meta = TOPIC_META[topicId]
      const [rssResult, webResult] = await Promise.allSettled([
        fetchRssForTopic(topicId),
        fetchTopicContentViaWebSearch(topicId, meta.label, meta.subs),
      ])

      const rss = rssResult.status === 'fulfilled' ? rssResult.value : null
      const web = webResult.status === 'fulfilled' ? webResult.value : null
      const merged = mergeRssAndWebSearch(rss, web)

      if (!merged) {
        return { topicId, status: 'failed' }
      }

      const content_hash = hashContent(topicId, today, merged.claims)
      await supabase.from('topic_content').upsert({
        topic_id: topicId,
        fetch_date: today,
        title: merged.title,
        claims: merged.claims,
        sources: merged.sources,
        content_hash,
      }, { onConflict: 'topic_id,fetch_date' })

      return {
        topicId,
        status: 'ingested',
        articlesFromRss: rss?.articles.length || 0,
        claimsFromWeb: web?.claims.length || 0,
      }
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
