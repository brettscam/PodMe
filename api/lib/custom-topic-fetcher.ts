import type { SupabaseClient } from '@supabase/supabase-js'
import { parseRssFeed, type RssArticle } from './rss-parser'

export interface FetchedContent {
  articles: RssArticle[]
  feeds_queried: number
  feeds_succeeded: number
}

interface PoolFeed {
  id: string
  url: string
  name: string
  tier: 1 | 2 | 3
  kind: 'rss' | 'reddit' | 'atom'
}

const FETCH_TIMEOUT_MS = 10_000

/**
 * Fetch a single RSS or Reddit feed with timeout.
 * Reddit requires a non-browser User-Agent — generic UAs get 429'd.
 */
async function fetchFeed(feed: PoolFeed): Promise<RssArticle[] | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const userAgent =
      feed.kind === 'reddit'
        ? 'web:com.podme.app:v1.0 (by /u/podme-bot)'
        : 'PodMe/1.0 RSS Reader'

    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) return null

    const xml = await response.text()
    return parseRssFeed(xml, feed.name, feed.tier)
  } catch {
    return null
  }
}

/**
 * Score an article by relevance to the custom topic's search_terms.
 */
function scoreArticle(article: RssArticle, searchTerms: string[]): number {
  if (searchTerms.length === 0) return 0
  let score = 0
  const searchText = `${article.title} ${article.description}`.toLowerCase()
  for (const term of searchTerms) {
    const lower = term.toLowerCase()
    if (article.title.toLowerCase().includes(lower)) score += 10
    if (article.description.toLowerCase().includes(lower)) score += 5
    const words = lower.split(/\s+/)
    for (const word of words) {
      if (word.length > 2 && searchText.includes(word)) score += 2
    }
  }
  if (article.tier === 1) score += 3
  else if (article.tier === 2) score += 1
  return score
}

/**
 * Fetch all feeds linked to a custom topic from feed_pool, score & sort
 * articles by relevance to the topic's search terms.
 */
export async function fetchContentForCustomTopic(
  customTopicId: string,
  searchTerms: string[],
  supabase: SupabaseClient,
): Promise<FetchedContent> {
  // Resolve linked feeds via custom_topic_feeds → feed_pool
  const { data: links, error } = await supabase
    .from('custom_topic_feeds')
    .select('feed_pool!inner(id, url, name, tier, kind, is_valid)')
    .eq('custom_topic_id', customTopicId)

  if (error) {
    console.error(`Error loading feeds for custom topic ${customTopicId}:`, error.message)
    return { articles: [], feeds_queried: 0, feeds_succeeded: 0 }
  }

  // Supabase embeds nested objects; flatten to PoolFeed[]
  type LinkRow = { feed_pool: { id: string; url: string; name: string; tier: number; kind: string; is_valid: boolean } | { id: string; url: string; name: string; tier: number; kind: string; is_valid: boolean }[] }
  const feeds: PoolFeed[] = (links ?? []).flatMap((row: LinkRow) => {
    const pool = Array.isArray(row.feed_pool) ? row.feed_pool : [row.feed_pool]
    return pool
      .filter((f) => f && f.is_valid)
      .map((f) => ({
        id: f.id,
        url: f.url,
        name: f.name,
        tier: (f.tier as 1 | 2 | 3) ?? 3,
        kind: (f.kind as 'rss' | 'reddit' | 'atom') ?? 'rss',
      }))
  })

  const results = await Promise.all(feeds.map(fetchFeed))

  let feedsSucceeded = 0
  let allArticles: RssArticle[] = []
  for (const result of results) {
    if (result !== null) {
      feedsSucceeded++
      allArticles.push(...result)
    }
  }

  // Dedupe by normalized URL
  const seen = new Set<string>()
  allArticles = allArticles.filter((a) => {
    const key = a.url.toLowerCase().replace(/\/+$/, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Score by relevance to search terms, then recency
  const scored = allArticles.map((article) => ({
    article,
    score: scoreArticle(article, searchTerms),
  }))
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const dA = a.article.published_at ? new Date(a.article.published_at).getTime() : 0
    const dB = b.article.published_at ? new Date(b.article.published_at).getTime() : 0
    return dB - dA
  })

  return {
    articles: scored.map((s) => s.article),
    feeds_queried: feeds.length,
    feeds_succeeded: feedsSucceeded,
  }
}

/** Build a Reddit RSS URL from a raw subreddit name or URL. */
export function normalizeSubredditToRss(input: string): string | null {
  const trimmed = input.trim()
  // r/foo or /r/foo
  const bareMatch = trimmed.match(/^\/?r\/([a-zA-Z0-9_]+)\/?$/)
  if (bareMatch) return `https://www.reddit.com/r/${bareMatch[1]}/.rss`

  // Full reddit URL
  try {
    const u = new URL(trimmed)
    if (!/reddit\.com$/.test(u.hostname.replace(/^www\./, ''))) return null
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts[0] !== 'r' || !parts[1]) return null
    return `https://www.reddit.com/r/${parts[1]}/.rss`
  } catch {
    return null
  }
}
