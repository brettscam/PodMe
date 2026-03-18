import { getFeedsForTopic } from './rss-feeds'
import { parseRssFeed, type RssArticle } from './rss-parser'

export interface FetchedRssContent {
  articles: RssArticle[]
  feedsQueried: number
  feedsSucceeded: number
}

const FETCH_TIMEOUT_MS = 8000
const MAX_ARTICLES_PER_FEED = 5
const MAX_AGE_HOURS = 24

function isRecent(publishedAt: string, maxAgeHours: number): boolean {
  if (!publishedAt) return true
  try {
    const pubDate = new Date(publishedAt)
    if (isNaN(pubDate.getTime())) return true
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000
    return pubDate.getTime() > cutoff
  } catch {
    return true
  }
}

export async function fetchRssForTopic(topicId: string): Promise<FetchedRssContent | null> {
  const feeds = getFeedsForTopic(topicId)
  if (feeds.length === 0) return null

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'PodMe/1.0 RSS Reader' },
        })
        clearTimeout(timeout)
        if (!res.ok) return []
        const xml = await res.text()
        return parseRssFeed(xml, feed.name, feed.tier, MAX_ARTICLES_PER_FEED)
      } catch {
        clearTimeout(timeout)
        return []
      }
    })
  )

  const allArticles: RssArticle[] = []
  let succeeded = 0

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      succeeded++
      allArticles.push(...result.value)
    }
  }

  const recent = allArticles.filter(a => isRecent(a.published_at, MAX_AGE_HOURS))

  recent.sort((a, b) => {
    const da = new Date(a.published_at || 0).getTime()
    const db = new Date(b.published_at || 0).getTime()
    return db - da
  })

  if (recent.length === 0) return null

  return {
    articles: recent,
    feedsQueried: feeds.length,
    feedsSucceeded: succeeded,
  }
}
