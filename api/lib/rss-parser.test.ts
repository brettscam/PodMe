import { describe, it, expect } from 'vitest'
import {
  articleAgeDays,
  filterRecent,
  MAX_ARTICLE_AGE_DAYS,
  type RssArticle,
} from './rss-parser'

const NOW = Date.parse('2026-10-07T12:00:00Z')

function article(overrides: Partial<RssArticle> = {}): RssArticle {
  return {
    title: 'Headline',
    url: 'https://example.com/a',
    description: '',
    published_at: new Date(NOW).toISOString(),
    source_name: 'Example',
    tier: 2,
    ...overrides,
  }
}

function daysAgo(n: number): string {
  return new Date(NOW - n * 86_400_000).toISOString()
}

describe('articleAgeDays', () => {
  it('reports whole days since publication', () => {
    expect(articleAgeDays(article({ published_at: daysAgo(0) }), NOW)).toBe(0)
    expect(articleAgeDays(article({ published_at: daysAgo(3) }), NOW)).toBe(3)
    expect(articleAgeDays(article({ published_at: daysAgo(120) }), NOW)).toBe(120)
  })

  it('returns null when the feed gave no usable date', () => {
    expect(articleAgeDays(article({ published_at: '' }), NOW)).toBeNull()
    expect(articleAgeDays(article({ published_at: 'not a date' }), NOW)).toBeNull()
  })
})

describe('filterRecent', () => {
  it('keeps articles inside the window', () => {
    const items = [daysAgo(0), daysAgo(1), daysAgo(6)].map((d) =>
      article({ published_at: d }),
    )
    expect(filterRecent(items, MAX_ARTICLE_AGE_DAYS, NOW)).toHaveLength(3)
  })

  it('drops articles past the window', () => {
    const items = [daysAgo(8), daysAgo(45), daysAgo(400)].map((d) =>
      article({ published_at: d }),
    )
    expect(filterRecent(items, MAX_ARTICLE_AGE_DAYS, NOW)).toHaveLength(0)
  })

  it('keeps exactly-at-the-boundary articles', () => {
    const atBoundary = article({ published_at: daysAgo(MAX_ARTICLE_AGE_DAYS) })
    expect(filterRecent([atBoundary], MAX_ARTICLE_AGE_DAYS, NOW)).toHaveLength(1)
  })

  it('keeps undated articles so sloppy-but-live feeds are not lost', () => {
    const undated = article({ published_at: '' })
    expect(filterRecent([undated], MAX_ARTICLE_AGE_DAYS, NOW)).toHaveLength(1)
  })

  it('keeps future-dated articles, since clock skew is not staleness', () => {
    const ahead = article({ published_at: new Date(NOW + 86_400_000).toISOString() })
    expect(filterRecent([ahead], MAX_ARTICLE_AGE_DAYS, NOW)).toHaveLength(1)
  })

  it('removes the stale-dormant-feed case that motivated this filter', () => {
    // A World Cup feed that stopped updating months ago still serves its last
    // items. They parse fine and look like valid articles; only the date
    // reveals they do not belong in today's briefing.
    const dormantFeed = [
      article({ title: 'World Cup final preview', published_at: daysAgo(115) }),
      article({ title: 'Group stage recap', published_at: daysAgo(130) }),
    ]
    const live = article({ title: 'Transfer news', published_at: daysAgo(1) })

    const kept = filterRecent([...dormantFeed, live], MAX_ARTICLE_AGE_DAYS, NOW)
    expect(kept).toHaveLength(1)
    expect(kept[0].title).toBe('Transfer news')
  })
})
