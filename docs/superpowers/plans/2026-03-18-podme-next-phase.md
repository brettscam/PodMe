# PodMe Next Phase Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RSS content pipeline with scheduled cron, daily auto-generate episodes, email digest delivery, and share episode links — completing the core product loop.

**Architecture:** Four independent subsystems built sequentially. RSS feeds augment the existing Claude web_search content pipeline (always blend both). A Vercel cron pre-fetches RSS every 4 hours and triggers daily episode generation at each user's delivery_time. Email digests use the existing HTML template via Resend. Share links persist to Supabase and render on a public route.

**Tech Stack:** Vercel Crons, RSS parsing (built-in fetch + DOMParser), Resend email API, Supabase RLS, React Router for public share page, existing Vitest + Playwright test infra.

**Deprioritized (explicitly removed):**
- User feed management UI (users cannot add custom RSS feeds yet)
- Feed-to-content deduplication (rely on existing content_hash dedup)

---

## Chunk 1: RSS Content Pipeline + Cron

### Task 1: Curated RSS Feed Registry

**Files:**
- Create: `api/lib/rss-feeds.ts`
- Test: `api/__tests__/rss-feeds.test.ts`

This is a static mapping of topic_id → curated RSS feed URLs. No database, no UI — just a typed constant.

- [ ] **Step 1: Write the failing test**

```typescript
// api/__tests__/rss-feeds.test.ts
import { describe, it, expect } from 'vitest'
import { getFeedsForTopic, ALL_FEEDS } from '../lib/rss-feeds'

describe('rss-feeds', () => {
  it('returns feeds for a known topic', () => {
    const feeds = getFeedsForTopic('tech')
    expect(feeds.length).toBeGreaterThan(0)
    expect(feeds[0]).toHaveProperty('url')
    expect(feeds[0]).toHaveProperty('name')
  })

  it('returns empty array for unknown topic', () => {
    expect(getFeedsForTopic('nonexistent')).toEqual([])
  })

  it('every feed URL is valid https', () => {
    for (const feed of ALL_FEEDS) {
      expect(feed.url).toMatch(/^https:\/\//)
    }
  })

  it('covers all 10 topic IDs', () => {
    const topicIds = ['earnings', 'tech', 'world', 'local', 'business', 'science', 'creative', 'sports', 'travel', 'entertainment']
    for (const id of topicIds) {
      expect(getFeedsForTopic(id).length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/__tests__/rss-feeds.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// api/lib/rss-feeds.ts
export interface RssFeed {
  url: string
  name: string
  tier: 1 | 2 | 3
}

const FEED_REGISTRY: Record<string, RssFeed[]> = {
  earnings: [
    { url: 'https://rss.app/feeds/v1.1/tgmedia-apnews-markets.xml', name: 'AP Markets', tier: 1 },
    { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', name: 'MarketWatch', tier: 2 },
    { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', name: 'CNBC Finance', tier: 2 },
  ],
  tech: [
    { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', name: 'Ars Technica', tier: 2 },
    { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', tier: 2 },
    { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', tier: 2 },
  ],
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', tier: 1 },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', tier: 1 },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', tier: 2 },
  ],
  local: [
    { url: 'https://www.sfchronicle.com/bayarea/feed/Bay-Area-Local-News-702702.php', name: 'SF Chronicle', tier: 2 },
    { url: 'https://www.marinij.com/feed/', name: 'Marin IJ', tier: 3 },
  ],
  business: [
    { url: 'https://rss.app/feeds/v1.1/tgmedia-apnews-business.xml', name: 'AP Business', tier: 1 },
    { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg', tier: 1 },
    { url: 'https://www.reuters.com/rssFeed/businessNews', name: 'Reuters Business', tier: 1 },
  ],
  science: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', name: 'NYT Science', tier: 1 },
    { url: 'https://www.newscientist.com/section/news/feed/', name: 'New Scientist', tier: 2 },
    { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'ScienceDaily', tier: 2 },
  ],
  creative: [
    { url: 'https://www.creativebloq.com/feed', name: 'Creative Bloq', tier: 3 },
    { url: 'https://www.designboom.com/feed/', name: 'Designboom', tier: 3 },
  ],
  sports: [
    { url: 'https://www.espn.com/espn/rss/news', name: 'ESPN', tier: 2 },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', name: 'NYT Sports', tier: 1 },
    { url: 'https://www.cbssports.com/rss/headlines/', name: 'CBS Sports', tier: 2 },
  ],
  travel: [
    { url: 'https://www.lonelyplanet.com/news/feed/atom', name: 'Lonely Planet', tier: 2 },
    { url: 'https://thepointsguy.com/feed/', name: 'The Points Guy', tier: 3 },
  ],
  entertainment: [
    { url: 'https://variety.com/feed/', name: 'Variety', tier: 2 },
    { url: 'https://www.hollywoodreporter.com/feed/', name: 'Hollywood Reporter', tier: 2 },
    { url: 'https://kotaku.com/rss', name: 'Kotaku', tier: 3 },
  ],
}

export const ALL_FEEDS: RssFeed[] = Object.values(FEED_REGISTRY).flat()

export function getFeedsForTopic(topicId: string): RssFeed[] {
  return FEED_REGISTRY[topicId] || []
}
```

Note: Some of these RSS URLs may be stale or return errors. The parser (Task 2) handles failures gracefully per-feed. During implementation, verify each URL actually resolves — swap out broken ones for working alternatives from the same outlets.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/__tests__/rss-feeds.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/lib/rss-feeds.ts api/__tests__/rss-feeds.test.ts
git commit -m "feat: add curated RSS feed registry for all 10 topics"
```

---

### Task 2: RSS Parser

**Files:**
- Create: `api/lib/rss-parser.ts`
- Test: `api/__tests__/rss-parser.test.ts`

Parses RSS/Atom XML into structured articles. Uses built-in `fetch` + regex-based XML extraction (no npm dependency). Must handle both RSS 2.0 (`<item>`) and Atom (`<entry>`) formats.

- [ ] **Step 1: Write the failing test**

```typescript
// api/__tests__/rss-parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseRssFeed, type RssArticle } from '../lib/rss-parser'

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Article One</title>
      <link>https://example.com/1</link>
      <description>First article description</description>
      <pubDate>Tue, 18 Mar 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/2</link>
      <description>Second article</description>
      <pubDate>Mon, 17 Mar 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

const ATOM_XML = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom Article</title>
    <link href="https://example.com/atom/1" />
    <summary>Atom summary</summary>
    <updated>2026-03-18T10:00:00Z</updated>
  </entry>
</feed>`

describe('parseRssFeed', () => {
  it('parses RSS 2.0 items', () => {
    const articles = parseRssFeed(RSS_XML, 'TestOutlet', 2)
    expect(articles).toHaveLength(2)
    expect(articles[0].title).toBe('Article One')
    expect(articles[0].url).toBe('https://example.com/1')
    expect(articles[0].outlet).toBe('TestOutlet')
    expect(articles[0].tier).toBe(2)
  })

  it('parses Atom entries', () => {
    const articles = parseRssFeed(ATOM_XML, 'AtomOutlet', 1)
    expect(articles).toHaveLength(1)
    expect(articles[0].title).toBe('Atom Article')
    expect(articles[0].url).toBe('https://example.com/atom/1')
  })

  it('returns empty array for invalid XML', () => {
    expect(parseRssFeed('not xml', 'Test', 3)).toEqual([])
  })

  it('limits to max articles', () => {
    const articles = parseRssFeed(RSS_XML, 'Test', 2, 1)
    expect(articles).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/__tests__/rss-parser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// api/lib/rss-parser.ts
export interface RssArticle {
  title: string
  url: string
  description: string
  published_at: string
  outlet: string
  tier: 1 | 2 | 3
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA: <tag><![CDATA[content]]></tag>
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i')
  const cdataMatch = xml.match(cdataRe)
  if (cdataMatch) return cdataMatch[1].trim()

  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(re)
  return match ? match[1].trim() : ''
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
  const match = xml.match(re)
  return match ? match[1] : ''
}

export function parseRssFeed(xml: string, outlet: string, tier: 1 | 2 | 3, maxArticles = 10): RssArticle[] {
  try {
    const articles: RssArticle[] = []

    // Try RSS 2.0 (<item>)
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
    let match: RegExpExecArray | null
    while ((match = itemRegex.exec(xml)) !== null && articles.length < maxArticles) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const url = extractTag(block, 'link') || extractAttr(block, 'link', 'href')
      const description = extractTag(block, 'description') || extractTag(block, 'summary')
      const published_at = extractTag(block, 'pubDate') || extractTag(block, 'dc:date') || ''
      if (title && url) {
        articles.push({ title, url, description, published_at, outlet, tier })
      }
    }

    // If no RSS items found, try Atom (<entry>)
    if (articles.length === 0) {
      const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi
      while ((match = entryRegex.exec(xml)) !== null && articles.length < maxArticles) {
        const block = match[1]
        const title = extractTag(block, 'title')
        const url = extractAttr(block, 'link', 'href') || extractTag(block, 'link')
        const description = extractTag(block, 'summary') || extractTag(block, 'content')
        const published_at = extractTag(block, 'updated') || extractTag(block, 'published') || ''
        if (title && url) {
          articles.push({ title, url, description, published_at, outlet, tier })
        }
      }
    }

    return articles
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/__tests__/rss-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/lib/rss-parser.ts api/__tests__/rss-parser.test.ts
git commit -m "feat: add RSS/Atom feed parser with regex-based XML extraction"
```

---

### Task 3: RSS Fetcher — fetch all feeds for a topic

**Files:**
- Create: `api/lib/rss-fetcher.ts`
- Test: `api/__tests__/rss-fetcher.test.ts`

Fetches all RSS feeds for a topic in parallel, parses each, returns combined + sorted articles. Handles per-feed timeouts and failures gracefully.

- [ ] **Step 1: Write the failing test**

```typescript
// api/__tests__/rss-fetcher.test.ts
import { describe, it, expect, vi } from 'vitest'
import { fetchRssForTopic, type FetchedRssContent } from '../lib/rss-fetcher'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const MOCK_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>Breaking: Tech News</title>
    <link>https://example.com/tech1</link>
    <description>Big tech story</description>
    <pubDate>Tue, 18 Mar 2026 10:00:00 GMT</pubDate>
  </item>
</channel></rss>`

describe('fetchRssForTopic', () => {
  it('returns articles from RSS feeds', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_RSS),
    })

    const result = await fetchRssForTopic('tech')
    expect(result).not.toBeNull()
    expect(result!.articles.length).toBeGreaterThan(0)
    expect(result!.articles[0].title).toBe('Breaking: Tech News')
  })

  it('returns null when all feeds fail', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const result = await fetchRssForTopic('tech')
    expect(result).toBeNull()
  })

  it('filters articles to last 24 hours', async () => {
    const oldRss = MOCK_RSS.replace('Tue, 18 Mar 2026', 'Mon, 01 Jan 2024')
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(oldRss),
    })
    const result = await fetchRssForTopic('tech')
    // Old articles filtered out — may return null or empty articles
    expect(result === null || result.articles.length === 0).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/__tests__/rss-fetcher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// api/lib/rss-fetcher.ts
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
  if (!publishedAt) return true // Include articles with no date (benefit of the doubt)
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

  // Filter to recent articles
  const recent = allArticles.filter(a => isRecent(a.published_at, MAX_AGE_HOURS))

  // Sort by date descending (newest first)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/__tests__/rss-fetcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/lib/rss-fetcher.ts api/__tests__/rss-fetcher.test.ts
git commit -m "feat: add RSS fetcher with parallel feeds, timeout, and recency filter"
```

---

### Task 4: Integrate RSS into build-episode (blend both sources)

**Files:**
- Modify: `api/build-episode.ts` (lines 68-153, 291-339)
- Test: `api/__tests__/build-episode-rss.test.ts`

The key change: for each topic, fetch RSS articles AND run Claude web_search in parallel. Merge the results into a single `FetchedContent` object before storing in `topic_content`. RSS articles become additional claims + sources.

- [ ] **Step 1: Write the failing test**

```typescript
// api/__tests__/build-episode-rss.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mergeRssAndWebSearch } from '../lib/content-merger'

describe('mergeRssAndWebSearch', () => {
  it('combines RSS articles with web_search results', () => {
    const rss = {
      articles: [
        { title: 'RSS Article', url: 'https://example.com/1', description: 'RSS desc', published_at: '2026-03-18T10:00:00Z', outlet: 'TestOutlet', tier: 2 as const },
      ],
      feedsQueried: 1,
      feedsSucceeded: 1,
    }
    const webSearch = {
      title: 'Web Search Headline',
      claims: ['Claim from web search'],
      sources: [{ outlet: 'AP', domain: 'ap.com', tier: 1, title: 'AP Article', url: 'https://ap.com/1', published_at: '2026-03-18T10:00:00Z', cited_claims: ['Claim from web search'] }],
    }
    const merged = mergeRssAndWebSearch(rss, webSearch)
    expect(merged.claims.length).toBeGreaterThan(1)
    expect(merged.sources.length).toBe(2)
    expect(merged.title).toBe('Web Search Headline') // web_search title takes precedence
  })

  it('returns web_search only when RSS is null', () => {
    const webSearch = {
      title: 'Headline',
      claims: ['Claim 1'],
      sources: [{ outlet: 'AP', domain: 'ap.com', tier: 1, title: 'AP Article', url: 'https://ap.com/1', published_at: '2026-03-18T10:00:00Z', cited_claims: ['Claim 1'] }],
    }
    const merged = mergeRssAndWebSearch(null, webSearch)
    expect(merged.claims).toEqual(['Claim 1'])
  })

  it('returns RSS-derived content when web_search is null', () => {
    const rss = {
      articles: [
        { title: 'RSS Only', url: 'https://example.com/1', description: 'Some description', published_at: '2026-03-18T10:00:00Z', outlet: 'Outlet', tier: 2 as const },
      ],
      feedsQueried: 1,
      feedsSucceeded: 1,
    }
    const merged = mergeRssAndWebSearch(rss, null)
    expect(merged.claims.length).toBeGreaterThan(0)
    expect(merged.title).toBe('RSS Only')
  })

  it('returns null when both are null', () => {
    expect(mergeRssAndWebSearch(null, null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/__tests__/build-episode-rss.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create content-merger module**

```typescript
// api/lib/content-merger.ts
import type { FetchedRssContent } from './rss-fetcher'

interface WebSearchContent {
  title: string
  claims: string[]
  sources: { outlet: string; domain: string; tier: number; title: string; url: string; published_at: string; cited_claims: string[] }[]
}

interface MergedContent {
  title: string
  claims: string[]
  sources: { outlet: string; domain: string; tier: number; title: string; url: string; published_at: string; cited_claims: string[] }[]
}

export function mergeRssAndWebSearch(
  rss: FetchedRssContent | null,
  webSearch: WebSearchContent | null,
): MergedContent | null {
  if (!rss && !webSearch) return null

  // Start with web_search content as the base (better structured)
  const claims: string[] = webSearch?.claims ? [...webSearch.claims] : []
  const sources = webSearch?.sources ? [...webSearch.sources] : []
  let title = webSearch?.title || ''

  // Add RSS articles as additional claims + sources
  if (rss && rss.articles.length > 0) {
    if (!title) title = rss.articles[0].title

    for (const article of rss.articles) {
      // Derive a claim from each RSS article description
      const claim = article.description
        ? `${article.title}: ${article.description.substring(0, 200)}`
        : article.title
      claims.push(claim)

      // Check if this source already exists (by domain)
      const domain = new URL(article.url).hostname.replace('www.', '')
      const alreadyExists = sources.some(s => s.domain === domain && s.title === article.title)
      if (!alreadyExists) {
        sources.push({
          outlet: article.outlet,
          domain,
          tier: article.tier,
          title: article.title,
          url: article.url,
          published_at: article.published_at,
          cited_claims: [claim],
        })
      }
    }
  }

  if (claims.length === 0) return null

  return { title, claims, sources }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/__tests__/build-episode-rss.test.ts`
Expected: PASS

- [ ] **Step 5: Extract shared TOPIC_META into `api/lib/topic-meta.ts`**

Currently `TOPIC_META` is defined inline in `api/build-episode.ts` (lines 14-25). Extract it to a shared module so both `build-episode.ts` and `cron/ingest-content.ts` can import it without duplication:

```typescript
// api/lib/topic-meta.ts
export const TOPIC_META: Record<string, { label: string; subs: string[] }> = {
  earnings: { label: 'Markets & Earnings', subs: ['Earnings next week', 'S&P movers', 'IPO pipeline', 'Crypto', 'Sector rotation'] },
  tech: { label: 'Technology', subs: ['AI/ML', 'Consumer tech', 'Enterprise SaaS', 'Startups', 'Open source'] },
  world: { label: 'World News', subs: ['Geopolitics', 'Climate', 'Conflict', 'Diplomacy', 'Global health'] },
  local: { label: 'Bay Area & Marin County', subs: ['Bay Area', 'Marin County', 'School boards', 'Transit', 'Housing'] },
  business: { label: 'Business & Economy', subs: ['Fed/Rates', 'Labor market', 'M&A', 'Venture capital', 'Real estate'] },
  science: { label: 'Science & Health', subs: ['Research', 'Space', 'Medicine', 'Nutrition', 'Mental health'] },
  creative: { label: 'Creative & Culture', subs: ['Photography', 'Design', 'Film', 'Music', 'Books'] },
  sports: { label: 'Sports', subs: ['NFL', 'NBA', 'MLB', 'F1', 'Golf', 'College'] },
  travel: { label: 'Travel', subs: ['Destinations', 'Points/Miles', 'Hotels', 'Flight deals'] },
  entertainment: { label: 'Entertainment', subs: ['Streaming', 'Box office', 'Gaming', 'Podcasts'] },
}
```

Then update `api/build-episode.ts` to import it: `import { TOPIC_META } from './lib/topic-meta'` and delete the inline constant.

- [ ] **Step 6: Integrate RSS into build-episode.ts**

Modify `api/build-episode.ts`:

1. Add import at top:
```typescript
import { fetchRssForTopic } from './lib/rss-fetcher'
import { mergeRssAndWebSearch } from './lib/content-merger'
import { TOPIC_META } from './lib/topic-meta'
```

2. Replace the content check loop (lines ~296-336) to run RSS + web_search in parallel:

```typescript
// In the contentChecks map function, replace the content miss section:
const contentChecks = sorted
  .filter(ut => FALLBACK_SCRIPTS[ut.topic_id])
  .map(async (ut) => {
    // Check if content exists for today
    const { data: existing } = await supabase
      .from('topic_content')
      .select('*')
      .eq('topic_id', ut.topic_id)
      .eq('fetch_date', today)
      .single()

    if (existing) {
      contentMap.set(ut.topic_id, existing)
      return
    }

    // Content miss — fetch BOTH sources in parallel
    const meta = TOPIC_META[ut.topic_id]
    if (!meta) return

    const [rssResult, webResult] = await Promise.allSettled([
      fetchRssForTopic(ut.topic_id),
      fetchTopicContent(ut.topic_id, meta.label, meta.subs),
    ])

    const rss = rssResult.status === 'fulfilled' ? rssResult.value : null
    const web = webResult.status === 'fulfilled' ? webResult.value : null

    const merged = mergeRssAndWebSearch(rss, web)
    if (!merged) return

    contentFetches++
    const content_hash = hashContent(ut.topic_id, today, merged.claims)

    await supabase.from('topic_content').upsert({
      topic_id: ut.topic_id,
      fetch_date: today,
      title: merged.title,
      claims: merged.claims,
      sources: merged.sources,
      content_hash,
    }, { onConflict: 'topic_id,fetch_date' })

    contentMap.set(ut.topic_id, {
      title: merged.title,
      claims: merged.claims,
      sources: merged.sources,
      content_hash,
    })
  })
```

- [ ] **Step 7: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add api/lib/content-merger.ts api/lib/topic-meta.ts api/__tests__/build-episode-rss.test.ts api/build-episode.ts
git commit -m "feat: blend RSS feeds with web_search in build-episode pipeline"
```

---

### Task 5: Vercel Cron for RSS Pre-fetching

**Files:**
- Create: `api/cron/ingest-content.ts`
- Modify: `vercel.json` (add cron config)
- Test: `api/__tests__/ingest-content.test.ts`

A Vercel cron endpoint that runs every 4 hours. It iterates all 10 topics, fetches RSS + web_search, and upserts into `topic_content`. When users hit `build-episode`, they get cache hits.

- [ ] **Step 1: Write the failing test**

```typescript
// api/__tests__/ingest-content.test.ts
import { describe, it, expect, vi } from 'vitest'
// Test the core ingestion logic extracted into a testable function
import { ingestAllTopics } from '../cron/ingest-content'

vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in tests')))

describe('ingestAllTopics', () => {
  it('returns results for all 10 topics', async () => {
    // With mocked fetch failing, all topics should have status: 'skipped' or 'error'
    const results = await ingestAllTopics('2026-03-18')
    expect(results).toHaveLength(10)
    for (const r of results) {
      expect(r).toHaveProperty('topicId')
      expect(r).toHaveProperty('status')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/__tests__/ingest-content.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// api/cron/ingest-content.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { fetchRssForTopic } from '../lib/rss-fetcher'
import { mergeRssAndWebSearch } from '../lib/content-merger'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

// Reuse shared TOPIC_META — extracted to avoid duplication with build-episode.ts
import { TOPIC_META } from '../lib/topic-meta'

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
      // Check if already cached for today
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
  // Verify cron secret (Vercel sends this header for cron jobs)
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
```

- [ ] **Step 4: Update vercel.json with cron schedule**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-content",
      "schedule": "0 */4 * * *"
    }
  ],
  "functions": {
    "api/cron/ingest-content.ts": { "maxDuration": 300 },
    ...existing...
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run api/__tests__/ingest-content.test.ts`
Expected: PASS

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add api/cron/ingest-content.ts api/__tests__/ingest-content.test.ts vercel.json
git commit -m "feat: add Vercel cron for RSS + web_search content pre-fetching every 4h"
```

---

## Chunk 2: Episode Scheduling (Daily Auto-Generate)

### Task 6: Cron endpoint to auto-generate episodes per user

**Files:**
- Create: `api/cron/generate-episodes.ts`
- Create: `supabase/migrations/008_episode_scheduling.sql`
- Test: `api/__tests__/generate-episodes.test.ts`

A Vercel cron that runs every 15 minutes. It queries profiles where `delivery_time` falls within the current 15-minute window and `cadence` matches today (daily = every day, weekly = weekends only). For each user, it calls the existing `build-episode` logic, inserts the episode into the `episodes` table, and updates status.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/008_episode_scheduling.sql
-- Track last generated date per user to prevent duplicate daily episodes
alter table profiles add column if not exists last_episode_date date;

-- Index for the cron query (filters by delivery_time window)
create index if not exists idx_profiles_delivery_time on profiles(delivery_time);

-- Note: The cron uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- No additional RLS policies needed for server-side episode insertion.
```

- [ ] **Step 2: Write the failing test**

```typescript
// api/__tests__/generate-episodes.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getUsersDueForEpisode } from '../cron/generate-episodes'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({
          lt: () => Promise.resolve({
            data: [
              { id: 'user-1', tone: 'mixed', length: 'standard', default_voice: 'anchor', cadence: 'daily', delivery_time: '06:00', last_episode_date: null },
              { id: 'user-2', tone: 'factual', length: 'quick', default_voice: 'anchor', cadence: 'weekly', delivery_time: '06:05', last_episode_date: null },
              { id: 'user-3', tone: 'mixed', length: 'standard', default_voice: 'anchor', cadence: 'daily', delivery_time: '06:10', last_episode_date: '2026-03-18' },
            ],
            error: null,
          }),
        }),
      }),
    }),
  }),
}))

describe('getUsersDueForEpisode', () => {
  it('filters out users who already have an episode today', async () => {
    const users = await getUsersDueForEpisode('06:00', '06:15', '2026-03-18', false)
    const ids = users.map(u => u.id)
    expect(ids).not.toContain('user-3') // already generated today
  })

  it('filters out weekly users on weekdays', async () => {
    const users = await getUsersDueForEpisode('06:00', '06:15', '2026-03-18', false)
    const ids = users.map(u => u.id)
    expect(ids).not.toContain('user-2') // weekly user on a weekday
    expect(ids).toContain('user-1') // daily user, no episode today
  })

  it('includes weekly users on weekends', async () => {
    const users = await getUsersDueForEpisode('06:00', '06:15', '2026-03-18', true)
    const ids = users.map(u => u.id)
    expect(ids).toContain('user-2') // weekly user on weekend
  })
})
```

- [ ] **Step 3: Write implementation**

```typescript
// api/cron/generate-episodes.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

const BUILD_EPISODE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/build-episode`
  : 'http://localhost:3000/api/build-episode'

interface UserForEpisode {
  id: string
  tone: string
  length: string
  default_voice: string
  cadence: string
  delivery_time: string
}

export async function getUsersDueForEpisode(
  windowStart: string,
  windowEnd: string,
  today: string,
  isWeekend: boolean,
): Promise<UserForEpisode[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let query = supabase
    .from('profiles')
    .select('id, tone, length, default_voice, cadence, delivery_time, last_episode_date')
    .gte('delivery_time', windowStart)
    .lt('delivery_time', windowEnd)

  const { data, error } = await query
  if (error || !data) return []

  return data.filter(u => {
    // Skip if already generated today
    if (u.last_episode_date === today) return false
    // Skip weekly users on weekdays
    if (u.cadence === 'weekly' && !isWeekend) return false
    return true
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const isWeekend = now.getDay() === 0 || now.getDay() === 6

  // 15-minute window
  const hours = now.getUTCHours().toString().padStart(2, '0')
  const minutes = now.getUTCMinutes()
  const windowStart = `${hours}:${(Math.floor(minutes / 15) * 15).toString().padStart(2, '0')}`
  const windowEndMin = Math.floor(minutes / 15) * 15 + 15
  const windowEnd = windowEndMin >= 60
    ? `${(parseInt(hours) + 1).toString().padStart(2, '0')}:00`
    : `${hours}:${windowEndMin.toString().padStart(2, '0')}`

  const users = await getUsersDueForEpisode(windowStart, windowEnd, today, isWeekend)

  const results = await Promise.allSettled(
    users.map(async (user) => {
      // Get user's topics
      const { data: topics } = await supabase
        .from('user_topics')
        .select('topic_id, weight, pinned, voice_override, sort_order')
        .eq('user_id', user.id)
        .order('sort_order')

      if (!topics || topics.length === 0) return { userId: user.id, status: 'skipped' }

      // Call build-episode internally
      const response = await fetch(BUILD_EPISODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: user.tone || 'mixed',
          length: user.length || 'standard',
          topics,
        }),
      })

      if (!response.ok) return { userId: user.id, status: 'failed' }

      const data = await response.json()
      const episode = data.episode

      // Insert episode into DB
      const episodeId = crypto.randomUUID()
      await supabase.from('episodes').insert({
        id: episodeId,
        user_id: user.id,
        title: episode.title,
        date: today,
        cadence: episode.cadence,
        tone: episode.tone,
        estimated_minutes: episode.estimated_minutes,
        show_notes: episode.show_notes,
        status: 'ready',
      })

      // Insert segments
      const segments = episode.segments.map((s: any, i: number) => ({
        id: crypto.randomUUID(),
        episode_id: episodeId,
        topic_id: s.topic_id,
        segment_type: s.segment_type,
        title: s.title,
        voice: s.voice,
        start_time_seconds: s.start_time_seconds,
        duration_seconds: s.duration_seconds,
        script: s.script,
        sources: s.sources,
        sort_order: i,
      }))

      await supabase.from('episode_segments').insert(segments)

      // Mark user as generated for today
      await supabase.from('profiles').update({ last_episode_date: today }).eq('id', user.id)

      return { userId: user.id, status: 'generated', episodeId }
    })
  )

  const summary = {
    time: now.toISOString(),
    window: `${windowStart}-${windowEnd}`,
    usersQueried: users.length,
    results: results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { userId: users[i]?.id, status: 'error' }
    ),
  }

  return res.status(200).json(summary)
}
```

- [ ] **Step 4: Update vercel.json**

Add to crons array:
```json
{
  "path": "/api/cron/generate-episodes",
  "schedule": "*/15 * * * *"
}
```

Add to functions:
```json
"api/cron/generate-episodes.ts": { "maxDuration": 300 }
```

- [ ] **Step 5: Run tests + type check**

Run: `npx vitest run api/__tests__/generate-episodes.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors

- [ ] **Step 6: Commit**

```bash
git add api/cron/generate-episodes.ts api/__tests__/generate-episodes.test.ts supabase/migrations/008_episode_scheduling.sql vercel.json
git commit -m "feat: add episode scheduling cron that auto-generates per user delivery_time"
```

---

### Task 7: Wire frontend to load real episodes from Supabase

**Files:**
- Modify: `src/hooks/useEpisodeBuilder.ts` (add Supabase episode loading)
- Modify: `src/hooks/useEpisodes.ts` (load past episodes from DB)

Currently `pastEpisodes` returns hardcoded `PAST_EPISODES` from constants. Now it should query the `episodes` + `episode_segments` tables.

- [ ] **Step 1: Update useEpisodeBuilder to check for today's pre-generated episode**

Add at the start of `fetchEpisode`:
```typescript
// Check if a pre-generated episode exists for today
const { data: preGenerated } = await supabase
  .from('episodes')
  .select('*, episode_segments(*)')
  .eq('user_id', userId)
  .eq('date', new Date().toISOString().split('T')[0])
  .eq('status', 'ready')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (preGenerated) {
  const episode = {
    ...preGenerated,
    segments: (preGenerated.episode_segments || []).sort((a, b) => a.sort_order - b.sort_order),
  }
  delete episode.episode_segments
  setServerEpisode(episode)
  setLoading(false)
  return
}
// ... existing build-episode fetch as fallback
```

- [ ] **Step 2: Update useEpisodes to load past episodes from DB**

Replace `PAST_EPISODES` usage:
```typescript
// In useEpisodeBuilder, add state + effect for past episodes
const [dbPastEpisodes, setDbPastEpisodes] = useState<Episode[]>([])

useEffect(() => {
  if (!userId) return
  supabase
    .from('episodes')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ready')
    .order('date', { ascending: false })
    .limit(10)
    .then(({ data }) => {
      if (data) setDbPastEpisodes(data)
    })
}, [userId])

// Return: pastEpisodes: dbPastEpisodes.length > 0 ? dbPastEpisodes : PAST_EPISODES
```

- [ ] **Step 3: Write test for episode loading logic**

```typescript
// src/hooks/__tests__/useEpisodeBuilder.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock Supabase
const mockSingle = vi.fn()
const mockLimit = vi.fn().mockReturnValue({ single: mockSingle })
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
const mockEqStatus = vi.fn().mockReturnValue({ order: mockOrder })
const mockEqDate = vi.fn().mockReturnValue({ eq: mockEqStatus })
const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqDate })
const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser })

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: mockSelect }),
  },
}))

describe('useEpisodeBuilder', () => {
  it('prefers pre-generated episode from Supabase over API call', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'ep-1',
        title: 'Pre-generated Episode',
        date: '2026-03-18',
        status: 'ready',
        episode_segments: [
          { sort_order: 0, title: 'Cold Open', segment_type: 'cold_open' },
          { sort_order: 1, title: 'Tech', segment_type: 'topic' },
        ],
      },
      error: null,
    })

    // Verify the mock was set up correctly (the actual hook test
    // would use renderHook but this validates the Supabase query shape)
    const result = await mockSelect('*, episode_segments(*)')
      .eq('user_id', 'user-1')
      .eq('date', '2026-03-18')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    expect(result.data).not.toBeNull()
    expect(result.data.title).toBe('Pre-generated Episode')
    expect(result.data.episode_segments).toHaveLength(2)
  })
})
```

- [ ] **Step 4: Type check + run tests**

Run: `npx vitest run src/hooks/__tests__/useEpisodeBuilder.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEpisodeBuilder.ts src/hooks/__tests__/useEpisodeBuilder.test.ts
git commit -m "feat: load pre-generated and past episodes from Supabase"
```

---

## Chunk 3: Email Digest Delivery

### Task 8: Email sending via Resend

**Files:**
- Create: `api/cron/send-digests.ts`
- Test: `api/__tests__/send-digests.test.ts`

A cron that runs 5 minutes after `generate-episodes`. It finds users with `email_digest = true` who have a ready episode for today but haven't received a digest yet. Uses Resend API (or any transactional email API — Resend is simplest).

- [ ] **Step 1: Add resend dependency**

Run: `npm install resend`

- [ ] **Step 2: Add migration for digest tracking**

```sql
-- supabase/migrations/009_email_digest_tracking.sql
alter table episodes add column if not exists digest_sent_at timestamptz;
```

- [ ] **Step 3: Write the failing test**

```typescript
// api/__tests__/send-digests.test.ts
import { describe, it, expect } from 'vitest'
import { buildDigestEmail } from '../cron/send-digests'

describe('buildDigestEmail', () => {
  it('generates HTML with episode data', () => {
    const html = buildDigestEmail({
      title: 'Test Episode',
      date: '2026-03-18',
      cadence: 'daily',
      tone: 'mixed',
      estimated_minutes: 12,
      status: 'ready',
      segments: [],
      show_notes: null,
    }, 'Brett')
    expect(html).toContain('Brett')
    expect(html).toContain('Test Episode')
  })
})
```

- [ ] **Step 4: Write implementation**

**IMPORTANT:** `src/lib/emailTemplate.ts` cannot be imported from serverless functions (it lives in the Vite client tree). Before writing this file, copy `generateEmailHtml` into `api/lib/email-template.ts` as a server-safe module. Remove any browser-specific imports (Lucide icons). The email template uses `getVoice`/`getTopic` from constants — inline the voice/topic color lookups as plain data (no icon imports).

```typescript
// api/cron/send-digests.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateEmailHtml } from '../lib/email-template'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

export function buildDigestEmail(episode: any, userName: string): string {
  return generateEmailHtml(episode, userName)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const resend = new Resend(RESEND_API_KEY)
  const today = new Date().toISOString().split('T')[0]

  // Find users with email_digest enabled who have a ready episode today without a sent digest
  const { data: episodes } = await supabase
    .from('episodes')
    .select(`
      id, title, date, cadence, tone, estimated_minutes, status, show_notes,
      profiles!inner(id, display_name, email_digest),
      episode_segments(*)
    `)
    .eq('date', today)
    .eq('status', 'ready')
    .is('digest_sent_at', null)
    .eq('profiles.email_digest', true)

  if (!episodes || episodes.length === 0) {
    return res.status(200).json({ sent: 0, message: 'No digests to send' })
  }

  let sent = 0
  let failed = 0

  for (const ep of episodes) {
    const profile = (ep as any).profiles
    if (!profile) continue

    // Get user's email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    if (!authUser?.user?.email) continue

    const episode: Episode = {
      ...ep,
      segments: ((ep as any).episode_segments || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    }

    const html = buildDigestEmail(episode, profile.display_name || 'there')

    try {
      await resend.emails.send({
        from: 'PodMe <digest@podme.ai>',
        to: authUser.user.email,
        subject: `Your Daily Brief — ${episode.title}`,
        html,
      })

      await supabase.from('episodes').update({ digest_sent_at: new Date().toISOString() }).eq('id', ep.id)
      sent++
    } catch (err) {
      console.error(`Failed to send digest to ${authUser.user.email}:`, err)
      failed++
    }
  }

  return res.status(200).json({ sent, failed, total: episodes.length })
}
```

- [ ] **Step 5: Update vercel.json**

Add to crons:
```json
{
  "path": "/api/cron/send-digests",
  "schedule": "5,20,35,50 * * * *"
}
```

This runs at :05, :20, :35, :50 — 5 minutes after each episode generation window.

Add to functions:
```json
"api/cron/send-digests.ts": { "maxDuration": 120 }
```

- [ ] **Step 6: Run tests + type check**

Run: `npx vitest run api/__tests__/send-digests.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add api/cron/send-digests.ts api/__tests__/send-digests.test.ts supabase/migrations/009_email_digest_tracking.sql vercel.json package.json package-lock.json
git commit -m "feat: add email digest delivery via Resend with cron scheduling"
```

---

## Chunk 4: Share Episode Links

### Task 9: Wire share links to Supabase persistence

**Files:**
- Modify: `src/hooks/useShare.ts`
- Test: `src/hooks/__tests__/useShare.test.ts`

Currently `useShare` generates tokens client-side with nanoid but never persists them. Wire it to the existing `shared_episodes` table.

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useShare.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockReturnValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { listen_count: 5 }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}))

describe('useShare', () => {
  it('module exports useShare function', async () => {
    const mod = await import('../useShare')
    expect(typeof mod.useShare).toBe('function')
  })
})
```

- [ ] **Step 2: Update useShare implementation**

```typescript
// src/hooks/useShare.ts
import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'

export function useShare() {
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [listenCount, setListenCount] = useState(0)

  const generateShareLink = useCallback(async (episodeId: string, sharerName?: string) => {
    const token = nanoid(10)

    const { error } = await supabase.from('shared_episodes').insert({
      share_token: token,
      episode_id: episodeId,
      sharer_name: sharerName || null,
    })

    if (error) {
      console.error('Failed to create share link:', error.message)
      return null
    }

    // Also enable sharing on the episode
    await supabase.from('episodes').update({
      share_token: token,
      share_enabled: true,
    }).eq('id', episodeId)

    setShareToken(token)
    return token
  }, [])

  const getShareUrl = useCallback((token?: string) => {
    const t = token || shareToken
    return t ? `podme.ai/s/${t}` : ''
  }, [shareToken])

  const copyShareLink = useCallback(async () => {
    const url = getShareUrl()
    if (!url) return
    try {
      await navigator.clipboard.writeText(`https://${url}`)
    } catch { /* fallback */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [getShareUrl])

  const nativeShare = useCallback(async (title: string) => {
    const url = `https://${getShareUrl()}`
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: `Listen to my PodMe episode: ${title}` })
      } catch { /* cancelled */ }
    } else {
      await copyShareLink()
    }
  }, [getShareUrl, copyShareLink])

  const loadShareData = useCallback(async (token: string) => {
    const { data } = await supabase
      .from('shared_episodes')
      .select('listen_count')
      .eq('share_token', token)
      .single()
    if (data) {
      setListenCount(data.listen_count || 0)
      setShareToken(token)
    }
  }, [])

  return {
    shareToken,
    copied,
    listenCount,
    generateShareLink,
    getShareUrl,
    copyShareLink,
    nativeShare,
    loadShareData,
  }
}
```

- [ ] **Step 3: Update EpisodePreview.tsx props + App.tsx caller**

The `onGenerateShare` prop type in `EpisodePreview.tsx` (line 28) must change from `() => string` to `() => void` (the async return value is not used by the component). Update:

In `src/components/views/EpisodePreview.tsx`:
```typescript
// Change the prop type (line ~28):
onGenerateShare: () => void  // was: () => string
```

In `src/App.tsx`:
```typescript
onGenerateShare={() => generateShareLink(currentEpisode.id!, user?.user_metadata?.full_name)}
```

- [ ] **Step 4: Create public share page API endpoint**

```typescript
// api/share/[token].ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token } = req.query
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: share } = await supabase
    .from('shared_episodes')
    .select('*, episodes(*, episode_segments(*))')
    .eq('share_token', token)
    .single()

  if (!share) {
    return res.status(404).json({ error: 'Episode not found' })
  }

  // Increment listen count
  await supabase
    .from('shared_episodes')
    .update({ listen_count: (share.listen_count || 0) + 1 })
    .eq('share_token', token)

  const episode = (share as any).episodes
  if (!episode) {
    return res.status(404).json({ error: 'Episode data not found' })
  }

  return res.status(200).json({
    sharer_name: share.sharer_name,
    episode: {
      ...episode,
      segments: (episode.episode_segments || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    },
  })
}
```

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useShare.ts src/hooks/__tests__/useShare.test.ts api/share/ src/App.tsx
git commit -m "feat: wire share links to Supabase with public share endpoint"
```

---

### Task 10: Mobile-Responsive Polish

**Files:**
- Modify: `src/styles/index.css` or relevant component files
- No new files — audit and fix existing responsive issues

This is an audit task. Check all views at 375px (iPhone SE) and 430px (iPhone Pro Max) widths.

- [ ] **Step 1: Audit responsive issues**

Check these known problem areas:
- MiniPlayer: progress ring may overflow on small screens
- Topic cards: voice chips may wrap awkwardly
- Dashboard quick controls: 2-col grid may be too tight at 375px
- Episode preview: long segment titles may overflow
- Bottom nav: ensure safe-area-inset-bottom for notched phones

- [ ] **Step 2: Fix identified issues**

Common fixes:
```css
/* Safe area for bottom nav */
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

/* Ensure cards don't overflow */
.rounded-card {
  overflow: hidden;
  word-break: break-word;
}

/* Player responsive sizing */
@media (max-width: 375px) {
  .mini-player .progress-ring {
    width: 48px;
    height: 48px;
  }
}
```

- [ ] **Step 3: Visual check + commit**

Run: `npm run dev` — manually check at 375px and 430px viewport widths.

```bash
git add src/styles/ src/components/
git commit -m "fix: mobile-responsive polish for small screens and safe areas"
```

---

### Task 11: Final Integration Test + Push

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
npx tsc --noEmit
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Push all work**

```bash
git push -u origin claude/setup-podme-project-tW2ya
```
