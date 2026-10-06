import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'
import { callClaude } from '../lib/claude'
import { normalizeSubredditToRss } from '../lib/custom-topic-fetcher'

const DISCOVERY_SYSTEM_PROMPT = `You are a research librarian who maintains a curated database of RSS feeds and Reddit communities.

Given a user's custom topic (label + parent category + search terms), propose up to 8 high-quality sources that cover it. For each, output:
- url: the RSS/Atom feed URL (not the homepage)
- name: short human-readable name
- kind: "rss" | "reddit" | "atom"
- tier: 1 (authoritative/wire), 2 (mainstream), 3 (niche/community)
- tags: 2-5 keywords
- rationale: one short sentence

Hard rules:
- Only propose feeds you are confident actually exist and are current.
- For Reddit communities, use https://www.reddit.com/r/<subreddit>/.rss form.
- Prefer official, long-lived feeds over aggregators or dead blogs.
- Do not propose feeds behind paywalls that block the RSS XML itself.

Output ONLY valid JSON: { "feeds": [{ ... }, ...] }`

const MIN_POOL_MATCHES = 3

interface AnalyzeBody {
  label?: string
  parent_category?: string
  search_terms?: string[]
}

interface PoolMatch {
  id: string
  url: string
  name: string
  kind: string
  tier: number
  categories: string[]
  tags: string[]
  description: string | null
  match_reason: 'category' | 'tag' | 'both'
}

interface DiscoveredFeed {
  url: string
  name: string
  kind: 'rss' | 'reddit' | 'atom'
  tier: 1 | 2 | 3
  tags: string[]
  rationale: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { label, parent_category, search_terms = [] } = (req.body ?? {}) as AnalyzeBody
  if (!label || !parent_category) {
    return res.status(400).json({ error: 'label and parent_category are required' })
  }

  const supabase = getServiceClient()

  try {
    // 1. Build a candidate set of search tags from label + search_terms
    const candidateTags = buildCandidateTags(label, search_terms)

    // 2. Query feed_pool for matches on category and/or tags
    const { data: poolData, error: poolError } = await supabase
      .from('feed_pool')
      .select('id, url, name, kind, tier, categories, tags, description')
      .eq('is_valid', true)
      .or(
        `categories.cs.{${parent_category}},tags.ov.{${candidateTags.join(',')}}`,
      )
      .limit(30)

    if (poolError) {
      console.error('feed_pool query error:', poolError.message)
    }

    const poolMatches: PoolMatch[] = (poolData ?? []).map((row) => {
      const inCategory = (row.categories as string[]).includes(parent_category)
      const tagOverlap = (row.tags as string[]).some((t) => candidateTags.includes(t))
      return {
        ...row,
        match_reason: inCategory && tagOverlap ? 'both' : tagOverlap ? 'tag' : 'category',
      } as PoolMatch
    })

    // Rank: tag matches first (more specific), then category, then by tier
    poolMatches.sort((a, b) => {
      const rank = (m: PoolMatch) =>
        m.match_reason === 'both' ? 0 : m.match_reason === 'tag' ? 1 : 2
      if (rank(a) !== rank(b)) return rank(a) - rank(b)
      return a.tier - b.tier
    })

    // 3. Decide whether to invoke Claude discovery
    const strongMatches = poolMatches.filter((m) => m.match_reason !== 'category')
    let discovered: DiscoveredFeed[] = []
    let discoverySkipped = false

    if (strongMatches.length < MIN_POOL_MATCHES) {
      try {
        discovered = await discoverViaClaude(label, parent_category, search_terms)
      } catch (err) {
        console.error('Claude discovery failed:', (err as Error).message)
      }

      // Normalize Reddit URLs; drop anything that's not a plausible feed URL
      discovered = discovered
        .map((f) => {
          if (f.kind === 'reddit') {
            const normalized = normalizeSubredditToRss(f.url)
            if (normalized) return { ...f, url: normalized }
          }
          return f
        })
        .filter((f) => isPlausibleFeedUrl(f.url))

      // Drop any discovered feeds already in the pool so we don't duplicate
      const poolUrls = new Set(poolMatches.map((m) => m.url.toLowerCase()))
      discovered = discovered.filter((f) => !poolUrls.has(f.url.toLowerCase()))
    } else {
      discoverySkipped = true
    }

    return res.status(200).json({
      existing_matches: poolMatches.slice(0, 15),
      discovered,
      discovery_skipped: discoverySkipped,
      candidate_tags: candidateTags,
    })
  } catch (err) {
    console.error('POST /api/custom-topics/analyze error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function buildCandidateTags(label: string, searchTerms: string[]): string[] {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')

  const tags = new Set<string>()
  // Full normalized label
  tags.add(normalize(label))
  // Each word of the label (useful for multi-word topics)
  for (const word of label.toLowerCase().split(/\s+/)) {
    const clean = word.replace(/[^a-z0-9]/g, '')
    if (clean.length > 2) tags.add(clean)
  }
  for (const term of searchTerms) {
    tags.add(normalize(term))
    for (const word of term.toLowerCase().split(/\s+/)) {
      const clean = word.replace(/[^a-z0-9]/g, '')
      if (clean.length > 2) tags.add(clean)
    }
  }
  return [...tags].filter(Boolean)
}

function isPlausibleFeedUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

async function discoverViaClaude(
  label: string,
  parentCategory: string,
  searchTerms: string[],
): Promise<DiscoveredFeed[]> {
  const prompt = `${DISCOVERY_SYSTEM_PROMPT}

Topic: "${label}"
Parent category: ${parentCategory}
Search terms: ${searchTerms.length > 0 ? searchTerms.join(', ') : '(none provided)'}

Return ONLY the JSON object. No prose, no markdown fences.`

  const raw = await callClaude(prompt, { maxTokens: 2000, webSearch: true })

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in Claude response')

  const parsed = JSON.parse(match[0]) as { feeds?: unknown }
  const feeds = Array.isArray(parsed.feeds) ? parsed.feeds : []

  return feeds
    .map((f) => f as Partial<DiscoveredFeed>)
    .filter(
      (f): f is DiscoveredFeed =>
        typeof f.url === 'string' &&
        typeof f.name === 'string' &&
        (f.kind === 'rss' || f.kind === 'reddit' || f.kind === 'atom'),
    )
    .map((f) => ({
      ...f,
      tier: ([1, 2, 3].includes(f.tier) ? f.tier : 3) as 1 | 2 | 3,
      tags: Array.isArray(f.tags) ? f.tags : [],
      rationale: f.rationale ?? '',
    }))
}
