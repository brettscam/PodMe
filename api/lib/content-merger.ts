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

  const claims: string[] = webSearch?.claims ? [...webSearch.claims] : []
  const sources = webSearch?.sources ? [...webSearch.sources] : []
  let title = webSearch?.title || ''

  if (rss && rss.articles.length > 0) {
    if (!title) title = rss.articles[0].title

    for (const article of rss.articles) {
      const claim = article.description
        ? `${article.title}: ${article.description.substring(0, 200)}`
        : article.title
      claims.push(claim)

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
