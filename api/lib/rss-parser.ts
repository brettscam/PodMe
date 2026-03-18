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
