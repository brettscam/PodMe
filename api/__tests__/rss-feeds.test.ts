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
