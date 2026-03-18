import { describe, it, expect, vi } from 'vitest'
import { mergeRssAndWebSearch } from '../lib/content-merger.js'

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
    expect(merged.title).toBe('Web Search Headline')
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
