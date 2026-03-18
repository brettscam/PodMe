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
