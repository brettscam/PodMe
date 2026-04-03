export interface RssArticle {
  title: string
  url: string
  description: string
  published_at: string
  source_name: string
  tier: 1 | 2 | 3
}

/** Decode common HTML/XML entities. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** Strip CDATA wrappers. */
function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

/** Strip HTML tags and collapse whitespace. */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extract the text content of an XML tag. Handles CDATA and nested tags. */
function getTagContent(xml: string, tag: string): string | null {
  // Try self-closing first
  const selfClosing = new RegExp(`<${tag}[^>]*/\\s*>`, 'i')
  if (selfClosing.test(xml) && !new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'i').test(xml)) {
    return null
  }

  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(pattern)
  if (!match) return null
  return decodeEntities(stripCdata(match[1].trim()))
}

/** Extract an attribute value from an XML tag. */
function getAttr(tag: string, attr: string): string | null {
  const pattern = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i')
  const match = tag.match(pattern)
  return match ? decodeEntities(match[1]) : null
}

/** Parse a date string into ISO format, returning empty string on failure. */
function parseDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toISOString()
  } catch {
    return ''
  }
}

/** Parse RSS 2.0 items from XML. */
function parseRss2Items(xml: string, sourceName: string, tier: 1 | 2 | 3): RssArticle[] {
  const articles: RssArticle[] = []
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    const title = getTagContent(itemXml, 'title')
    const link = getTagContent(itemXml, 'link')
    const description = getTagContent(itemXml, 'description')
    const pubDate = getTagContent(itemXml, 'pubDate')
    const dcDate = getTagContent(itemXml, 'dc:date')

    if (!title || !link) continue

    articles.push({
      title: stripHtml(title),
      url: link.trim(),
      description: description ? stripHtml(description).slice(0, 500) : '',
      published_at: parseDate(pubDate || dcDate),
      source_name: sourceName,
      tier: tier,
    })
  }

  return articles
}

/** Parse Atom entries from XML. */
function parseAtomEntries(xml: string, sourceName: string, tier: 1 | 2 | 3): RssArticle[] {
  const articles: RssArticle[] = []
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi
  let match: RegExpExecArray | null

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1]
    const title = getTagContent(entryXml, 'title')
    const summary = getTagContent(entryXml, 'summary') || getTagContent(entryXml, 'content')
    const published = getTagContent(entryXml, 'published') || getTagContent(entryXml, 'updated')

    // Atom links are in <link> tags with href attribute
    let url = ''
    const linkPattern = /<link[^>]*>/gi
    let linkMatch: RegExpExecArray | null
    while ((linkMatch = linkPattern.exec(entryXml)) !== null) {
      const linkTag = linkMatch[0]
      const rel = getAttr(linkTag, 'rel')
      const href = getAttr(linkTag, 'href')
      if (href && (!rel || rel === 'alternate')) {
        url = href
        break
      }
    }
    // Fallback: if no href found, try link text content
    if (!url) {
      const linkText = getTagContent(entryXml, 'link')
      if (linkText) url = linkText.trim()
    }

    if (!title || !url) continue

    articles.push({
      title: stripHtml(title),
      url: url,
      description: summary ? stripHtml(summary).slice(0, 500) : '',
      published_at: parseDate(published),
      source_name: sourceName,
      tier: tier,
    })
  }

  return articles
}

/**
 * Parse an RSS/Atom feed XML string into an array of RssArticle objects.
 * Supports RSS 2.0, RSS 1.0 (RDF), and Atom formats.
 */
export function parseRssFeed(
  xml: string,
  sourceName: string,
  tier: 1 | 2 | 3 = 2,
): RssArticle[] {
  if (!xml || typeof xml !== 'string') return []

  // Detect format and parse
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml)

  if (isAtom) {
    return parseAtomEntries(xml, sourceName, tier)
  }

  return parseRss2Items(xml, sourceName, tier)
}
