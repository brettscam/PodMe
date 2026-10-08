import { describe, it, expect } from 'vitest'
import { buildEditorDigest, type TopicContent } from './editor-digest'
import { filterRecent, type RssArticle } from './rss-parser'

const NOW = Date.parse('2026-10-08T09:00:00Z')

function article(title: string, daysOld: number | null, source = 'Example'): RssArticle {
  return {
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    description: 'Summary text.',
    published_at: daysOld === null ? '' : new Date(NOW - daysOld * 86_400_000).toISOString(),
    source_name: source,
    tier: 2,
  }
}

function topic(topicId: string, articles: RssArticle[]): TopicContent {
  return { topicId, articles, feedsQueried: 4, feedsSucceeded: 4 }
}

describe('buildEditorDigest', () => {
  it('labels every article with its age so the model has a reference point', () => {
    const { text } = buildEditorDigest(
      [topic('tech', [article('Chip news', 0), article('Older chip news', 3)])],
      NOW,
    )
    expect(text).toContain('(today)')
    expect(text).toContain('(3 days old)')
  })

  it('marks undated articles rather than hiding the gap', () => {
    const { text } = buildEditorDigest([topic('world', [article('No date', null)])], NOW)
    expect(text).toContain('(age unknown)')
  })

  it('omits a topic with no fresh articles instead of rendering an empty heading', () => {
    const digest = buildEditorDigest(
      [
        topic('tech', [article('Fresh chip news', 1)]),
        topic('sports', []),
        topic('travel', []),
      ],
      NOW,
    )

    expect(digest.includedTopicIds).toEqual(['tech'])
    expect(digest.omittedTopicIds).toEqual(['sports', 'travel'])
    expect(digest.text).toContain('## Topic: tech')
    expect(digest.text).not.toContain('sports')
    expect(digest.text).not.toContain('travel')
  })

  it('returns empty text when nothing anywhere is fresh', () => {
    const digest = buildEditorDigest([topic('tech', []), topic('sports', [])], NOW)
    expect(digest.text).toBe('')
    expect(digest.includedTopicIds).toEqual([])
  })
})

describe('the reported failure: months-old content in a current briefing', () => {
  // Reproduces what showed up in an October 2026 episode — a World Cup feed
  // and a "stat of the day" feed that had both gone quiet months earlier,
  // alongside one topic that was genuinely still publishing.
  it('drops the stale topics entirely and keeps only the live one', () => {
    const worldCupFeed = [
      article('World Cup final preview', 118, 'Tournament Daily'),
      article('Group stage recap', 131, 'Tournament Daily'),
      article('Golden Boot race', 126, 'Tournament Daily'),
    ]
    const statOfTheDayFeed = [
      article('Stat of the day: 42 saves', 97, 'Stat Feed'),
      article('Stat of the day: 11 aces', 103, 'Stat Feed'),
    ]
    const liveTechFeed = [
      article('New GPU announced', 0, 'Ars Technica'),
      article('Datacenter outage postmortem', 2, 'The Verge'),
    ]

    // Stage 1: the article-level filter runs during fetch.
    const topics: TopicContent[] = [
      topic('sports', filterRecent(worldCupFeed, 7, NOW)),
      topic('entertainment', filterRecent(statOfTheDayFeed, 7, NOW)),
      topic('tech', filterRecent(liveTechFeed, 7, NOW)),
    ]

    // Stage 2: topics left with nothing are dropped from the digest.
    const digest = buildEditorDigest(topics, NOW)

    expect(digest.includedTopicIds).toEqual(['tech'])
    expect(digest.omittedTopicIds).toEqual(['sports', 'entertainment'])

    // The stale headlines never reach the editor at all.
    expect(digest.text).not.toContain('World Cup')
    expect(digest.text).not.toContain('Stat of the day')
    expect(digest.text).not.toContain('Golden Boot')

    // The live topic survives intact.
    expect(digest.text).toContain('New GPU announced')
    expect(digest.text).toContain('Datacenter outage postmortem')
  })

  it('keeps a topic alive when only some of its articles are stale', () => {
    const mixedFeed = [
      article('Old transfer rumour', 90),
      article('Yesterday: manager sacked', 1),
      article('Ancient preview', 200),
    ]
    const digest = buildEditorDigest(
      [topic('sports', filterRecent(mixedFeed, 7, NOW))],
      NOW,
    )

    expect(digest.includedTopicIds).toEqual(['sports'])
    expect(digest.text).toContain('manager sacked')
    expect(digest.text).not.toContain('Old transfer rumour')
    expect(digest.text).not.toContain('Ancient preview')
  })
})
