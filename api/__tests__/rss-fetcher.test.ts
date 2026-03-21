import { describe, it, expect, vi } from 'vitest'
import { fetchRssForTopic, type FetchedRssContent } from '../lib/rss-fetcher.js'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Use a recent date so the article passes the recency filter
const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toUTCString()

const MOCK_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>Breaking: Tech News</title>
    <link>https://example.com/tech1</link>
    <description>Big tech story</description>
    <pubDate>${recentDate}</pubDate>
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
    const oldRss = MOCK_RSS.replace(recentDate, 'Mon, 01 Jan 2024 10:00:00 GMT')
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(oldRss),
    })
    const result = await fetchRssForTopic('tech')
    expect(result === null || result.articles.length === 0).toBe(true)
  })
})
