import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'crypto'
import { TOPIC_META } from './lib/topic-meta.js'
import { fetchRssForTopic, type FetchedRssContent } from './lib/rss-fetcher.js'
import type { RssArticle } from './lib/rss-parser.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || ''

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Duration targets by length preference (word counts)
const WORD_TARGETS: Record<string, number> = {
  quick: 225,    // ~90 seconds
  standard: 450, // ~3 minutes
  deep: 750,     // ~5 minutes
}

const WEIGHT_MULTIPLIERS: Record<string, number> = {
  featured: 1.2,
  standard: 1.0,
  brief: 0.5,
}

const DEFAULT_VOICE = 'anchor'

// --- Core pipeline: RSS articles → script → polish → episode ---

function hashArticles(topicId: string, date: string, articles: RssArticle[]): string {
  const input = topicId + date + articles.map(a => a.title + a.url).join('|')
  return createHash('sha256').update(input).digest('hex')
}

async function callClaude(prompt: string, maxTokens = 1024): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Claude API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

// Optional web search enrichment — adds extra context on top of RSS
async function searchForContext(topicLabel: string, subs: string[], customTags: string[]): Promise<string | null> {
  const tagsFocus = customTags.length > 0
    ? ` Focus especially on: ${customTags.join(', ')}.`
    : ''

  const prompt = `Search for the latest news about "${topicLabel}" (subtopics: ${subs.join(', ')}).${tagsFocus}

Provide a brief summary of the most important developments you find. Include specific facts, figures, and source names. Keep it to 3-5 bullet points.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2025-01-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const textBlocks = (data.content || []).filter((b: { type: string }) => b.type === 'text')
    return textBlocks.map((b: { text: string }) => b.text).join('') || null
  } catch {
    return null
  }
}

function formatArticlesForPrompt(articles: RssArticle[], customTags: string[]): string {
  const lines = articles.map((a, i) =>
    `${i + 1}. [${a.outlet}] "${a.title}"${a.description ? `\n   ${a.description.substring(0, 300)}` : ''}`
  )

  let text = lines.join('\n')
  if (customTags.length > 0) {
    text += `\n\nUser is especially interested in: ${customTags.join(', ')}`
  }
  return text
}

async function writeSegmentScript(
  topicLabel: string,
  articles: RssArticle[],
  customTags: string[],
  tone: string,
  wordTarget: number,
  webContext: string | null,
): Promise<{ script: string; duration: number }> {
  const toneGuide: Record<string, string> = {
    factual: 'dry reporting style, just the facts, no opinion',
    mixed: 'reporting with light commentary, conversational but informative',
    commentary: 'opinionated analysis, strong voice, engaging perspective',
  }

  const webSection = webContext
    ? `\n\nAdditional context from web search:\n${webContext}`
    : ''

  const prompt = `Write a podcast segment about ${topicLabel} based on these news articles:

${formatArticlesForPrompt(articles, customTags)}${webSection}

Rules:
- Tone: ${toneGuide[tone] || toneGuide.mixed}
- Target length: ~${wordTarget} words
- Write for spoken delivery. Use spoken numbers ("five hundred" not "500").
- Reference sources by outlet name naturally (e.g., "according to Reuters" or "the BBC reports").
- No segment headers, no stage directions, no intro/outro — just the content.
- Synthesize the articles into a cohesive segment. Don't just list them.
- The news articles are your primary source. The web context is supplemental — use it to add depth, not replace the articles.

Return ONLY the script text.`

  const script = await callClaude(prompt)
  const wordCount = script.split(/\s+/).length
  const duration = Math.round(wordCount / 2.5) // ~2.5 words/sec for natural speech

  return { script, duration }
}

interface PolishResult {
  cold_open: string
  transitions: string[]
  wrap_up: string
}

async function polishEpisode(
  segments: { title: string; script: string }[],
  tone: string,
  isWeekend: boolean,
): Promise<PolishResult | null> {
  const showType = isWeekend ? 'weekend digest' : 'morning brief'

  const toneGuide: Record<string, string> = {
    factual: 'Professional and authoritative. No jokes, no filler.',
    mixed: 'Warm and conversational. Light personality, but informative.',
    commentary: 'Engaging and opinionated. Strong voice, like a favorite columnist.',
  }

  const segmentSummaries = segments
    .map((s, i) => `[Segment ${i + 1}: ${s.title}]\n${s.script}`)
    .join('\n\n---\n\n')

  const prompt = `You are the show producer for a daily podcast "${showType}".
Below are the raw topic scripts in order. Write:

1. A cold open (2-3 sentences) teasing the top stories to hook the listener.
2. A transition line BEFORE each topic (1-2 sentences bridging from previous).
3. A warm wrap-up (2-3 sentences).

Tone: ${toneGuide[tone] || toneGuide.mixed}
Day: ${isWeekend ? 'Weekend' : 'Weekday'}

${segmentSummaries}

Return ONLY JSON (no markdown, no code fences):
{
  "cold_open": "...",
  "transitions": ["before segment 1", "before segment 2", ...],
  "wrap_up": "..."
}

The transitions array must have exactly ${segments.length} entries.
Write for spoken delivery.`

  try {
    const rawText = await callClaude(prompt)

    let parsed: PolishResult
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      parsed = JSON.parse(jsonMatch[0])
    }

    if (!parsed.cold_open || !Array.isArray(parsed.transitions) || !parsed.wrap_up) return null
    return parsed
  } catch (err) {
    console.error('Polish pass failed:', err)
    return null
  }
}

// --- Handler ---

interface TopicParam {
  topic_id: string
  weight: 'featured' | 'standard' | 'brief'
  pinned: boolean
  voice_override: string | null
  sort_order: number
  custom_tags?: string[]
}

interface SegmentResult {
  topic_id: string | null
  segment_type: 'cold_open' | 'topic' | 'wild_card' | 'wrap_up'
  title: string
  voice: string
  start_time_seconds: number
  duration_seconds: number
  script: string
  sources: { outlet: string; domain: string; tier: number; title: string; url: string; published_at: string; cited_claims: string[] }[]
  sort_order: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const params = req.method === 'GET' ? req.query : (req.body || {})
  const tone = (params.tone as string) || 'mixed'
  const length = (params.length as string) || 'standard'
  const forceRefresh = params.force_refresh === true || params.force_refresh === 'true'
  const userId = params.user_id as string | undefined
  const topicsParam = params.topics as string | TopicParam[] | undefined
  const defaultVoice = (params.default_voice as string) || DEFAULT_VOICE
  const dateOverride = params.date as string | undefined

  if (!anthropicApiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured — add it in Vercel env vars' })
  }

  if (!topicsParam) {
    return res.status(400).json({ error: 'Missing topics parameter' })
  }

  let topics: TopicParam[]
  if (typeof topicsParam === 'string') {
    topics = topicsParam.split(',').map((id, i) => ({
      topic_id: id.trim(),
      weight: i === 0 ? 'featured' as const : 'standard' as const,
      pinned: false,
      voice_override: null,
      sort_order: i,
    }))
  } else {
    topics = topicsParam
  }

  if (!anthropicApiKey) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not configured.',
      hint: 'Set ANTHROPIC_API_KEY in your Vercel environment variables.',
    })
  }

  // Sort: pinned first, then by weight, then sort_order
  const weightOrder: Record<string, number> = { featured: 0, standard: 1, brief: 2 }
  const sorted = [...topics].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.weight !== b.weight) return (weightOrder[a.weight] ?? 1) - (weightOrder[b.weight] ?? 1)
    return a.sort_order - b.sort_order
  })

  try {
    const supabase = supabaseUrl && supabaseServiceKey ? getSupabase() : null
    const today = dateOverride && /^\d{4}-\d{2}-\d{2}$/.test(dateOverride)
      ? dateOverride
      : new Date().toISOString().split('T')[0]

    // --- Step 1: Fetch RSS for all topics in parallel ---
    const rssResults = await Promise.allSettled(
      sorted.map(async (ut) => {
        const topicId = ut.topic_id
        if (!TOPIC_META[topicId]) return { topicId, rss: null }

        // Check Supabase cache first (if available)
        if (supabase && !forceRefresh) {
          const { data: cached } = await supabase
            .from('topic_content')
            .select('*')
            .eq('topic_id', topicId)
            .eq('fetch_date', today)
            .single()

          if (cached && cached.claims?.length > 0) {
            return { topicId, cached }
          }
        }

        const rss = await fetchRssForTopic(topicId)
        return { topicId, rss }
      })
    )

    // Collect RSS articles per topic
    const topicArticles = new Map<string, { articles: RssArticle[]; fromCache: boolean; cachedData?: Record<string, unknown> }>()
    const fetchErrors: string[] = []

    for (const result of rssResults) {
      if (result.status !== 'fulfilled') continue
      const { topicId, rss, cached } = result.value as { topicId: string; rss?: FetchedRssContent | null; cached?: Record<string, unknown> }

      if (cached) {
        topicArticles.set(topicId, { articles: [], fromCache: true, cachedData: cached })
      } else if (rss && rss.articles.length > 0) {
        topicArticles.set(topicId, { articles: rss.articles, fromCache: false })

        // Cache the RSS content in Supabase for later
        if (supabase) {
          const claims = rss.articles.map(a => a.description ? `${a.title}: ${a.description.substring(0, 200)}` : a.title)
          const sources = rss.articles.map(a => ({
            outlet: a.outlet,
            domain: new URL(a.url).hostname.replace('www.', ''),
            tier: a.tier,
            title: a.title,
            url: a.url,
            published_at: a.published_at,
            cited_claims: [a.title],
          }))
          const contentHash = hashArticles(topicId, today, rss.articles)

          supabase.from('topic_content').upsert({
            topic_id: topicId,
            fetch_date: today,
            title: rss.articles[0].title,
            claims,
            sources,
            content_hash: contentHash,
          }, { onConflict: 'topic_id,fetch_date' }).then(() => {}).catch(e => console.error(`Cache write failed for ${topicId}:`, e))
        }
      } else {
        fetchErrors.push(topicId)
      }
    }

    console.log(`RSS fetch: ${topicArticles.size} topics with content, ${fetchErrors.length} failed [${fetchErrors.join(',')}]`)

    if (topicArticles.size === 0) {
      return res.status(502).json({
        error: `RSS fetch failed for all ${sorted.length} topics. No articles could be retrieved.`,
        failed_topics: fetchErrors,
        hint: 'RSS feeds may be temporarily unavailable. Try again shortly.',
      })
    }

    // --- Step 2: Kick off web search enrichment in parallel (best-effort) ---
    const webContextMap = new Map<string, Promise<string | null>>()
    for (const ut of sorted) {
      if (!topicArticles.has(ut.topic_id)) continue
      const meta = TOPIC_META[ut.topic_id]
      if (!meta) continue
      // Fire and forget — we'll await these when generating scripts
      webContextMap.set(
        ut.topic_id,
        searchForContext(meta.label, meta.subs, ut.custom_tags || []).catch(() => null),
      )
    }

    // --- Step 3: Generate scripts from RSS articles + web context ---
    const topicSegments: SegmentResult[] = []
    let elapsed = 0
    let scriptErrors = 0

    for (const ut of sorted) {
      const entry = topicArticles.get(ut.topic_id)
      if (!entry) continue

      const meta = TOPIC_META[ut.topic_id]
      if (!meta) continue

      const baseWords = WORD_TARGETS[length] || 450
      const wordTarget = Math.round(baseWords * (WEIGHT_MULTIPLIERS[ut.weight] || 1))

      // Check script cache if we have cached content
      if (entry.fromCache && entry.cachedData && supabase) {
        const cached = entry.cachedData
        const contentHash = (cached.content_hash as string) || ''

        const { data: scriptCache } = await supabase
          .from('generated_scripts')
          .select('*')
          .eq('content_hash', contentHash)
          .eq('tone', tone)
          .eq('length', length)
          .single()

        if (scriptCache) {
          topicSegments.push({
            topic_id: ut.topic_id,
            segment_type: 'topic',
            title: (cached.title as string) || meta.label,
            voice: defaultVoice,
            start_time_seconds: elapsed,
            duration_seconds: scriptCache.duration_seconds,
            script: scriptCache.script,
            sources: (cached.sources as SegmentResult['sources']) || [],
            sort_order: topicSegments.length + 1,
          })
          elapsed += scriptCache.duration_seconds
          continue
        }
      }

      // Build articles list (from RSS or from cached claims)
      let articles = entry.articles
      if (entry.fromCache && entry.cachedData && articles.length === 0) {
        const claims = (entry.cachedData.claims as string[]) || []
        articles = claims.map(c => ({
          title: c.split(':')[0] || c,
          description: c,
          url: '',
          published_at: today,
          outlet: 'cached',
          tier: 2 as const,
        }))
      }

      if (articles.length === 0) continue

      try {
        // Await web search context (already running in parallel)
        const webContext = await (webContextMap.get(ut.topic_id) || Promise.resolve(null))

        const { script, duration } = await writeSegmentScript(
          meta.label, articles, ut.custom_tags || [], tone, wordTarget, webContext,
        )

        // Cache the script
        if (supabase) {
          const contentHash = entry.fromCache && entry.cachedData
            ? (entry.cachedData.content_hash as string) || ''
            : hashArticles(ut.topic_id, today, entry.articles)

          if (contentHash) {
            supabase.from('generated_scripts').insert({
              content_hash: contentHash, tone, length, script,
              duration_seconds: duration, model_used: 'claude-haiku-4-5-20251001',
            }).then(() => {}).catch(e => console.error('Script cache failed:', e))
          }
        }

        const sources = entry.articles.map(a => ({
          outlet: a.outlet,
          domain: a.url ? new URL(a.url).hostname.replace('www.', '') : 'unknown',
          tier: a.tier as number,
          title: a.title,
          url: a.url,
          published_at: a.published_at,
          cited_claims: [a.title],
        }))

        topicSegments.push({
          topic_id: ut.topic_id,
          segment_type: 'topic',
          title: entry.articles[0]?.title || meta.label,
          voice: defaultVoice,
          start_time_seconds: elapsed,
          duration_seconds: duration,
          script,
          sources,
          sort_order: topicSegments.length + 1,
        })
        elapsed += duration
      } catch (err) {
        console.error(`Script generation failed for ${ut.topic_id}:`, err)
        scriptErrors++
      }
    }

    if (topicSegments.length === 0) {
      return res.status(502).json({
        error: 'Script generation failed for all topics with content.',
        hint: 'Check ANTHROPIC_API_KEY is valid.',
      })
    }

    // --- Step 3: Polish — cold open, transitions, wrap-up ---
    const now = dateOverride ? new Date(dateOverride + 'T12:00:00Z') : new Date()
    const isWeekend = now.getDay() === 0 || now.getDay() === 6
    const showType = isWeekend ? 'weekend digest' : 'morning brief'

    const polished = await polishEpisode(
      topicSegments.map(s => ({ title: s.title, script: s.script })),
      tone,
      isWeekend,
    )

    // Inject transitions into scripts
    if (polished?.transitions) {
      for (let i = 0; i < topicSegments.length; i++) {
        const transition = polished.transitions[i]
        if (transition) {
          topicSegments[i].script = transition + '\n\n' + topicSegments[i].script
          const wordCount = topicSegments[i].script.split(/\s+/).length
          topicSegments[i].duration_seconds = Math.round(wordCount / 2.5)
        }
      }
    }

    const coldOpenScript = polished?.cold_open
      || `Good morning, welcome to your ${showType}. We've got ${topicSegments.length} stories for you today. Let's get into it.`
    const wrapUpScript = polished?.wrap_up
      || `That's your ${showType}. See you ${isWeekend ? 'Monday morning' : 'tomorrow'}. Have a great ${isWeekend ? 'weekend' : 'day'}.`

    const coldOpenDuration = Math.round(coldOpenScript.split(/\s+/).length / 2.5)
    const wrapUpDuration = Math.round(wrapUpScript.split(/\s+/).length / 2.5)

    // Recalculate timing
    let runningTime = coldOpenDuration
    for (const seg of topicSegments) {
      seg.start_time_seconds = runningTime
      runningTime += seg.duration_seconds
    }

    const coldOpen: SegmentResult = {
      topic_id: null, segment_type: 'cold_open', title: 'Cold Open',
      voice: defaultVoice, start_time_seconds: 0, duration_seconds: coldOpenDuration,
      script: coldOpenScript, sources: [], sort_order: 0,
    }

    const wrapUp: SegmentResult = {
      topic_id: null, segment_type: 'wrap_up', title: 'Wrap & Look-Ahead',
      voice: defaultVoice, start_time_seconds: runningTime, duration_seconds: wrapUpDuration,
      script: wrapUpScript, sources: [], sort_order: topicSegments.length + 1,
    }

    const allSegments = [coldOpen, ...topicSegments, wrapUp]
    const totalMinutes = Math.round((runningTime + wrapUpDuration) / 60)

    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const episodeTitle = `${dateStr} — ${isWeekend ? 'Weekend Digest' : 'Morning Brief'}`

    // Compute real source summary from actual articles
    const allSources = topicSegments.flatMap(s => s.sources)
    const uniqueOutlets = new Set(allSources.map(s => s.outlet))

    const episodeData = {
      title: episodeTitle,
      date: today,
      cadence: isWeekend ? 'weekly' : 'daily',
      tone,
      estimated_minutes: totalMinutes,
      status: 'ready' as const,
      show_notes: {
        segments: topicSegments.map(s => ({ title: s.title, sources: s.sources })),
        correction_notes: [],
        source_summary: {
          total_articles: allSources.length,
          total_outlets: uniqueOutlets.size,
          tier_1_count: allSources.filter(s => s.tier === 1).length,
          tier_2_count: allSources.filter(s => s.tier === 2).length,
          tier_3_count: allSources.filter(s => s.tier === 3).length,
        },
      },
      segments: allSegments,
    }

    // Save to Supabase
    if (supabase && userId) {
      try {
        const episodeId = randomUUID()
        await supabase.from('episodes').insert({
          id: episodeId, user_id: userId, title: episodeData.title,
          date: episodeData.date, cadence: episodeData.cadence, tone: episodeData.tone,
          estimated_minutes: episodeData.estimated_minutes, show_notes: episodeData.show_notes,
          status: 'ready',
        })
        await supabase.from('episode_segments').insert(
          allSegments.map((s, i) => ({
            id: randomUUID(), episode_id: episodeId, topic_id: s.topic_id,
            segment_type: s.segment_type, title: s.title, voice: s.voice,
            start_time_seconds: s.start_time_seconds, duration_seconds: s.duration_seconds,
            script: s.script, sources: s.sources, sort_order: i,
          }))
        )
      } catch (saveErr) {
        console.error('Failed to save episode:', saveErr)
      }
    }

    return res.status(200).json({
      episode: episodeData,
      cache_stats: {
        topics_with_content: topicArticles.size,
        topics_failed: fetchErrors.length,
        segments_generated: topicSegments.length,
        script_errors: scriptErrors,
      },
    })
  } catch (err) {
    console.error('build-episode error:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
  }
}
