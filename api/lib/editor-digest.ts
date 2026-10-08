import { articleAgeDays, type RssArticle } from './rss-parser'

/** Most articles shown to the editor for any one topic. */
const MAX_ARTICLES_PER_TOPIC = 30

export interface TopicContent {
  topicId: string
  articles: RssArticle[]
  feedsQueried: number
  feedsSucceeded: number
}

export interface EditorDigest {
  /** Markdown passed to the editor. Empty string when no topic has content. */
  text: string
  /** Topic ids that made it in, in order. */
  includedTopicIds: string[]
  /** Topic ids dropped for having nothing fresh. */
  omittedTopicIds: string[]
}

/**
 * Build the per-topic digest the editor reads.
 *
 * Two behaviours matter here, and both exist because of a real failure: an
 * October briefing that carried World Cup stories from months earlier.
 *
 * 1. A topic with no fresh articles is omitted entirely rather than rendered
 *    as an empty heading. An empty heading reads to the model as a gap to
 *    fill, and it will reach for whatever it has.
 * 2. Every article carries its age in days. Without that the model has no
 *    reference point and cannot act on an instruction to drop stale items.
 *
 * Articles are expected to have been through filterRecent already; this
 * labels and arranges them, it does not re-filter.
 */
export function buildEditorDigest(
  topics: TopicContent[],
  now: number = Date.now(),
): EditorDigest {
  const withContent = topics.filter((t) => t.articles.length > 0)
  const omitted = topics.filter((t) => t.articles.length === 0)

  const text = withContent
    .map((topic) => {
      const list = topic.articles
        .slice(0, MAX_ARTICLES_PER_TOPIC)
        .map((a, i) => {
          const line = `  ${i + 1}. [${a.source_name}] "${a.title}" (${formatAge(a, now)})`
          return `${line}\n     ${a.description}\n     URL: ${a.url}`
        })
        .join('\n')

      const header =
        `## Topic: ${topic.topicId}\n` +
        `(${topic.articles.length} articles within the freshness window, ` +
        `${topic.feedsSucceeded}/${topic.feedsQueried} feeds reachable)`

      return `${header}\n\n${list}`
    })
    .join('\n\n---\n\n')

  return {
    text,
    includedTopicIds: withContent.map((t) => t.topicId),
    omittedTopicIds: omitted.map((t) => t.topicId),
  }
}

function formatAge(article: RssArticle, now: number): string {
  const age = articleAgeDays(article, now)
  if (age === null) return 'age unknown'
  if (age <= 0) return 'today'
  if (age === 1) return '1 day old'
  return `${age} days old`
}
