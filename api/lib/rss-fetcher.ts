import type { SupabaseClient } from '@supabase/supabase-js'
import { parseRssFeed, type RssArticle } from './rss-parser'

export interface FetchedContent {
  articles: RssArticle[]
  feeds_queried: number
  feeds_succeeded: number
}

interface TopicFeed {
  id: string
  url: string
  name: string
  tier: 1 | 2 | 3
}

const FETCH_TIMEOUT_MS = 10_000

/**
 * Discover additional RSS feed URLs for a given custom tag.
 * Maps popular tags to well-known feed URLs that cover those topics.
 */
export function discoverFeedsForTag(tag: string): { url: string; name: string; tier: 3 }[] {
  const t = tag.toLowerCase().trim()
  const feeds: { url: string; name: string; tier: 3 }[] = []

  // Sports teams & leagues
  const sportsMap: Record<string, { url: string; name: string }[]> = {
    liverpool: [
      { url: 'https://www.theguardian.com/football/liverpool/rss', name: 'Guardian Liverpool' },
    ],
    arsenal: [
      { url: 'https://www.theguardian.com/football/arsenal/rss', name: 'Guardian Arsenal' },
    ],
    chelsea: [
      { url: 'https://www.theguardian.com/football/chelsea/rss', name: 'Guardian Chelsea' },
    ],
    'manchester united': [
      { url: 'https://www.theguardian.com/football/manchesterunited/rss', name: 'Guardian Man Utd' },
    ],
    'man united': [
      { url: 'https://www.theguardian.com/football/manchesterunited/rss', name: 'Guardian Man Utd' },
    ],
    'manchester city': [
      { url: 'https://www.theguardian.com/football/manchestercity/rss', name: 'Guardian Man City' },
    ],
    'man city': [
      { url: 'https://www.theguardian.com/football/manchestercity/rss', name: 'Guardian Man City' },
    ],
    warriors: [
      { url: 'https://www.espn.com/espn/rss/nba/news', name: 'ESPN NBA' },
    ],
    lakers: [
      { url: 'https://www.espn.com/espn/rss/nba/news', name: 'ESPN NBA' },
    ],
    nba: [
      { url: 'https://www.espn.com/espn/rss/nba/news', name: 'ESPN NBA' },
    ],
    nfl: [
      { url: 'https://www.espn.com/espn/rss/nfl/news', name: 'ESPN NFL' },
    ],
    mlb: [
      { url: 'https://www.espn.com/espn/rss/mlb/news', name: 'ESPN MLB' },
    ],
    f1: [
      { url: 'https://www.motorsport.com/rss/f1/news/', name: 'Motorsport.com F1' },
    ],
    'formula 1': [
      { url: 'https://www.motorsport.com/rss/f1/news/', name: 'Motorsport.com F1' },
    ],
    tennis: [
      { url: 'https://www.espn.com/espn/rss/tennis/news', name: 'ESPN Tennis' },
    ],
    mma: [
      { url: 'https://www.espn.com/espn/rss/mma/news', name: 'ESPN MMA' },
    ],
    ufc: [
      { url: 'https://www.espn.com/espn/rss/mma/news', name: 'ESPN MMA' },
    ],
  }

  // Finance & crypto
  const financeMap: Record<string, { url: string; name: string }[]> = {
    crypto: [
      { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph' },
      { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
    ],
    bitcoin: [
      { url: 'https://cointelegraph.com/rss/tag/bitcoin', name: 'CoinTelegraph Bitcoin' },
    ],
    ethereum: [
      { url: 'https://cointelegraph.com/rss/tag/ethereum', name: 'CoinTelegraph Ethereum' },
    ],
    stocks: [
      { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch' },
    ],
    startups: [
      { url: 'https://techcrunch.com/category/startups/feed/', name: 'TechCrunch Startups' },
    ],
    vc: [
      { url: 'https://techcrunch.com/category/venture/feed/', name: 'TechCrunch Venture' },
    ],
  }

  // Tech topics
  const techMap: Record<string, { url: string; name: string }[]> = {
    ai: [
      { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', name: 'TechCrunch AI' },
    ],
    'artificial intelligence': [
      { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', name: 'TechCrunch AI' },
    ],
    apple: [
      { url: 'https://9to5mac.com/feed/', name: '9to5Mac' },
    ],
    android: [
      { url: 'https://9to5google.com/feed/', name: '9to5Google' },
    ],
    google: [
      { url: 'https://9to5google.com/feed/', name: '9to5Google' },
    ],
    cybersecurity: [
      { url: 'https://feeds.feedburner.com/TheHackersNews', name: 'The Hacker News' },
    ],
    gaming: [
      { url: 'https://kotaku.com/rss', name: 'Kotaku' },
      { url: 'https://www.gamespot.com/feeds/mashup/', name: 'GameSpot' },
    ],
  }

  // Science
  const scienceMap: Record<string, { url: string; name: string }[]> = {
    space: [
      { url: 'https://www.space.com/feeds/all', name: 'Space.com' },
      { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', name: 'NASA' },
    ],
    climate: [
      { url: 'https://www.theguardian.com/environment/climate-crisis/rss', name: 'Guardian Climate' },
    ],
    health: [
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', name: 'NYT Health' },
    ],
  }

  const allMaps = [sportsMap, financeMap, techMap, scienceMap]
  for (const map of allMaps) {
    const found = map[t]
    if (found) {
      feeds.push(...found.map(f => ({ ...f, tier: 3 as const })))
    }
  }

  return feeds
}

/** Fetch a single feed URL with timeout. Returns null on failure. */
async function fetchFeed(
  url: string,
  name: string,
  tier: 1 | 2 | 3,
): Promise<RssArticle[] | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PodMe/1.0 RSS Reader',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) return null

    const xml = await response.text()
    return parseRssFeed(xml, name, tier)
  } catch {
    return null
  }
}

/**
 * Score an article based on relevance to custom tags.
 * Higher score = more relevant.
 */
function scoreArticle(article: RssArticle, customTags: string[]): number {
  if (customTags.length === 0) return 0

  let score = 0
  const searchText = `${article.title} ${article.description}`.toLowerCase()

  for (const tag of customTags) {
    const lower = tag.toLowerCase()
    // Title matches are worth more
    if (article.title.toLowerCase().includes(lower)) {
      score += 10
    }
    // Description match
    if (article.description.toLowerCase().includes(lower)) {
      score += 5
    }
    // Check for partial word matches in the searchable text
    const words = lower.split(/\s+/)
    for (const word of words) {
      if (word.length > 2 && searchText.includes(word)) {
        score += 2
      }
    }
  }

  // Tier bonus: tier 1 sources are more authoritative
  if (article.tier === 1) score += 3
  else if (article.tier === 2) score += 1

  return score
}

/**
 * Fetch RSS feeds for a given topic.
 * Queries the topic_feeds table, discovers additional feeds from custom tags,
 * fetches all in parallel, deduplicates, scores by relevance, and sorts.
 */
export async function fetchRssForTopic(
  topicId: string,
  customTags: string[],
  supabase: SupabaseClient,
): Promise<FetchedContent> {
  // 1. Get feeds from database
  const { data: dbFeeds, error } = await supabase
    .from('topic_feeds')
    .select('id, url, name, tier')
    .eq('topic_id', topicId)

  if (error) {
    console.error(`Error fetching feeds for topic ${topicId}:`, error.message)
  }

  const feeds: TopicFeed[] = (dbFeeds || []) as TopicFeed[]

  // 2. Discover additional feeds from custom tags
  const discoveredUrls = new Set(feeds.map(f => f.url))
  for (const tag of customTags) {
    const tagFeeds = discoverFeedsForTag(tag)
    for (const tf of tagFeeds) {
      if (!discoveredUrls.has(tf.url)) {
        discoveredUrls.add(tf.url)
        feeds.push({ id: `tag-${tag}-${tf.name}`, ...tf })
      }
    }
  }

  // 3. Fetch all feeds in parallel
  const results = await Promise.all(
    feeds.map(feed => fetchFeed(feed.url, feed.name, feed.tier as 1 | 2 | 3)),
  )

  let feedsSucceeded = 0
  let allArticles: RssArticle[] = []

  for (const result of results) {
    if (result !== null) {
      feedsSucceeded++
      allArticles.push(...result)
    }
  }

  // 4. Deduplicate by URL
  const seen = new Set<string>()
  allArticles = allArticles.filter(article => {
    const normalizedUrl = article.url.toLowerCase().replace(/\/+$/, '')
    if (seen.has(normalizedUrl)) return false
    seen.add(normalizedUrl)
    return true
  })

  // 5. Score and sort: relevance first, then recency
  const scored = allArticles.map(article => ({
    article,
    score: scoreArticle(article, customTags),
  }))

  scored.sort((a, b) => {
    // Higher relevance score first
    if (b.score !== a.score) return b.score - a.score
    // Then by recency (newer first)
    const dateA = a.article.published_at ? new Date(a.article.published_at).getTime() : 0
    const dateB = b.article.published_at ? new Date(b.article.published_at).getTime() : 0
    return dateB - dateA
  })

  return {
    articles: scored.map(s => s.article),
    feeds_queried: feeds.length,
    feeds_succeeded: feedsSucceeded,
  }
}
