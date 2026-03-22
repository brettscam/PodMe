import { getFeedsForTopic, type RssFeed } from './rss-feeds.js'
import { parseRssFeed, type RssArticle } from './rss-parser.js'

export interface FetchedRssContent {
  articles: RssArticle[]
  feedsQueried: number
  feedsSucceeded: number
}

const FETCH_TIMEOUT_MS = 15000
const MAX_ARTICLES_PER_FEED = 8
const MAX_AGE_HOURS = 72

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

async function fetchSingleFeed(feed: RssFeed): Promise<RssArticle[]> {
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
}

/**
 * Known RSS feed patterns for common user tag interests.
 * These are discovered dynamically based on tag keywords.
 */
function discoverFeedsForTag(tag: string): RssFeed[] {
  const t = tag.toLowerCase().trim()
  const feeds: RssFeed[] = []

  // --- Local news by city/region ---
  if (t.includes('bend') && t.includes('oregon')) {
    feeds.push(
      { url: 'https://www.bendbulletin.com/search/?f=rss&t=article&c=news&l=50&s=start_time&sd=desc', name: 'Bend Bulletin', tier: 3 },
      { url: 'https://ktvz.com/feed/', name: 'KTVZ Central Oregon', tier: 3 },
    )
  }
  if (t.includes('whitefish') || (t.includes('flathead') && t.includes('mt'))) {
    feeds.push(
      { url: 'https://flatheadbeacon.com/feed/', name: 'Flathead Beacon', tier: 3 },
      { url: 'https://www.dailyinterlake.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc', name: 'Daily Inter Lake', tier: 3 },
    )
  }
  if (t.includes('marin') && (t.includes('housing') || t.includes('county'))) {
    feeds.push(
      { url: 'https://www.marinij.com/feed/', name: 'Marin IJ', tier: 3 },
    )
  }
  if (t.includes('san francisco') || t === 'sf') {
    feeds.push(
      { url: 'https://www.sfchronicle.com/bayarea/feed/Bay-Area-Local-News-702702.php', name: 'SF Chronicle', tier: 2 },
      { url: 'https://sfist.com/feed/', name: 'SFist', tier: 3 },
    )
  }
  if (t.includes('lake tahoe') || t === 'tahoe') {
    feeds.push(
      { url: 'https://www.tahoedailytribune.com/feed/', name: 'Tahoe Daily Tribune', tier: 3 },
    )
  }
  if (t.includes('bart') || t.includes('bay area rapid')) {
    feeds.push(
      { url: 'https://www.bart.gov/rss/news', name: 'BART News', tier: 3 },
    )
  }

  // --- Sports teams/leagues ---
  if (t.includes('liverpool') || t === 'lfc') {
    feeds.push(
      { url: 'https://www.theguardian.com/football/liverpool/rss', name: 'Guardian Liverpool FC', tier: 1 },
      { url: 'https://www.liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss', name: 'Liverpool Echo', tier: 3 },
    )
  }
  if (t.includes('champions league') || t === 'ucl') {
    feeds.push(
      { url: 'https://www.theguardian.com/football/championsleague/rss', name: 'Guardian Champions League', tier: 1 },
      { url: 'https://www.uefa.com/uefachampionsleague/news/rss.xml', name: 'UEFA Champions League', tier: 2 },
    )
  }
  if (t.includes('world cup')) {
    feeds.push(
      { url: 'https://www.theguardian.com/football/world-cup-2026/rss', name: 'Guardian World Cup', tier: 1 },
    )
  }
  if (t.includes('premier league') || t === 'epl') {
    feeds.push(
      { url: 'https://www.theguardian.com/football/premierleague/rss', name: 'Guardian Premier League', tier: 1 },
    )
  }
  if (t.includes('f1') || t.includes('formula 1') || t.includes('formula one')) {
    feeds.push(
      { url: 'https://www.autosport.com/rss/f1/news/', name: 'Autosport F1', tier: 2 },
    )
  }
  if (t.includes('warriors') || t === 'gsw') {
    feeds.push(
      { url: 'https://www.nbcsportsbayarea.com/golden-state-warriors/feed/', name: 'NBC Sports Warriors', tier: 2 },
    )
  }
  if (t.includes('49ers') || t.includes('niners')) {
    feeds.push(
      { url: 'https://www.nbcsportsbayarea.com/san-francisco-49ers/feed/', name: 'NBC Sports 49ers', tier: 2 },
    )
  }
  if (t.includes('giants') && t.includes('sf')) {
    feeds.push(
      { url: 'https://www.nbcsportsbayarea.com/san-francisco-giants/feed/', name: 'NBC Sports Giants', tier: 2 },
    )
  }

  // --- Finance/Investing ---
  if (t.includes('crypto') || t.includes('bitcoin') || t.includes('ethereum')) {
    feeds.push(
      { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', tier: 2 },
    )
  }
  if (t.includes('real estate')) {
    feeds.push(
      { url: 'https://www.housingwire.com/feed/', name: 'HousingWire', tier: 2 },
    )
  }

  return feeds
}

/**
 * Score articles by relevance to user's custom tags.
 * Higher scores = more relevant to what the user cares about.
 */
function scoreArticleRelevance(article: RssArticle, customTags: string[]): number {
  if (customTags.length === 0) return 0
  let score = 0
  const title = article.title.toLowerCase()
  const desc = (article.description || '').toLowerCase()
  for (const tag of customTags) {
    const t = tag.toLowerCase()
    if (title.includes(t)) score += 3
    if (desc.includes(t)) score += 1
  }
  return score
}

/**
 * Fetch RSS for a topic, including dynamic feeds from user's custom tags.
 * Custom tags like "Liverpool", "Bend Oregon", etc. add relevant RSS feeds
 * and boost articles that match the user's interests.
 */
export async function fetchRssForTopic(
  topicId: string,
  customTags: string[] = [],
): Promise<FetchedRssContent | null> {
  // Start with the base feeds for this topic
  const baseFeeds = getFeedsForTopic(topicId)

  // Discover additional feeds based on custom tags
  const tagFeeds: RssFeed[] = []
  for (const tag of customTags) {
    tagFeeds.push(...discoverFeedsForTag(tag))
  }

  // Deduplicate feeds by URL
  const allFeeds = [...baseFeeds]
  const seenUrls = new Set(baseFeeds.map(f => f.url))
  for (const feed of tagFeeds) {
    if (!seenUrls.has(feed.url)) {
      seenUrls.add(feed.url)
      allFeeds.push(feed)
    }
  }

  if (allFeeds.length === 0) return null

  console.log(`[rss-fetcher] ${topicId}: fetching ${allFeeds.length} feeds (${baseFeeds.length} base + ${tagFeeds.length} from tags: ${customTags.join(', ')})`)

  const results = await Promise.allSettled(
    allFeeds.map(feed => fetchSingleFeed(feed))
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

  // Score and sort: tag-relevant articles first, then by recency
  const scored = recent.map(a => ({
    article: a,
    relevance: scoreArticleRelevance(a, customTags),
  }))

  scored.sort((a, b) => {
    // High relevance first
    if (a.relevance !== b.relevance) return b.relevance - a.relevance
    // Then by date
    const da = new Date(a.article.published_at || 0).getTime()
    const db = new Date(b.article.published_at || 0).getTime()
    return db - da
  })

  const sortedArticles = scored.map(s => s.article)

  if (sortedArticles.length === 0) return null

  console.log(`[rss-fetcher] ${topicId}: ${sortedArticles.length} articles from ${succeeded}/${allFeeds.length} feeds`)

  return {
    articles: sortedArticles,
    feedsQueried: allFeeds.length,
    feedsSucceeded: succeeded,
  }
}
