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

// Per-SEGMENT word targets (each topic gets this many words)
const WORD_TARGETS: Record<string, number> = {
  quick: 400,     // ~2.5 min per segment
  standard: 700,  // ~4.5 min per segment
  deep: 1100,     // ~7 min per segment
}

const WEIGHT_MULTIPLIERS: Record<string, number> = {
  featured: 1.3,
  standard: 1.0,
  brief: 0.5,
}

// Voice variety — each topic gets a different voice for a podcast feel
const TOPIC_VOICES: Record<string, string> = {
  earnings: 'analyst',
  tech: 'correspondent',
  world: 'anchor',
  local: 'neighbor',
  business: 'analyst',
  science: 'anchor',
  creative: 'correspondent',
  sports: 'correspondent',
  travel: 'neighbor',
  entertainment: 'correspondent',
}

// --- Core pipeline: RSS articles → script → episode ---

function hashArticles(topicId: string, date: string, articles: RssArticle[]): string {
  const input = topicId + date + articles.map(a => a.title + a.url).join('|')
  return createHash('sha256').update(input).digest('hex')
}

async function callClaude(prompt: string, maxTokens = 2048): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250514',
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

// Web search for supplemental context
async function searchForContext(topicLabel: string, subs: string[], customTags: string[]): Promise<string | null> {
  const tagsFocus = customTags.length > 0
    ? ` Focus especially on: ${customTags.join(', ')}.`
    : ''

  const prompt = `Search for the latest news about "${topicLabel}" (subtopics: ${subs.join(', ')}).${tagsFocus}

Provide a brief summary of the most important developments. Include specific facts, figures, and source names. Keep it to 3-5 bullet points.`

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
    `${i + 1}. [${a.outlet}] "${a.title}"${a.description ? `\n   ${a.description.substring(0, 400)}` : ''}\n   URL: ${a.url}`
  )

  let text = lines.join('\n\n')
  if (customTags.length > 0) {
    text += `\n\nThe listener is especially interested in: ${customTags.join(', ')}. Prioritize coverage of these topics.`
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
  segmentPosition: { index: number; total: number },
  prevTopicLabel: string | null,
): Promise<{ script: string; duration: number }> {
  const toneGuide: Record<string, string> = {
    factual: 'Authoritative but accessible. Think NPR — facts-first with clarity, no fluff, but never dry or robotic. Use precise language.',
    mixed: 'The sweet spot between informed and fun. Like your smartest friend explaining the news over coffee. Light humor is welcome. Be curious, not performative.',
    commentary: 'Strong editorial voice. Like a great opinion columnist who does their homework. Take positions, make predictions, connect dots others miss. Be bold but fair.',
  }

  const webSection = webContext
    ? `\n\nAdditional context from web search (use to add depth, not replace the articles):\n${webContext}`
    : ''

  const transitionNote = segmentPosition.index === 0
    ? 'This is the FIRST topic after the cold open. Start with energy — no need for a transition.'
    : prevTopicLabel
      ? `This follows a segment about ${prevTopicLabel}. Write a BRIEF, natural transition (one sentence max) that bridges from that topic to this one before diving in. Make it feel conversational, not formulaic.`
      : ''

  const prompt = `You are a brilliant podcast scriptwriter. Write a segment about "${topicLabel}" for a daily news podcast.

SOURCE MATERIAL (${articles.length} articles):

${formatArticlesForPrompt(articles, customTags)}${webSection}

WRITING GUIDELINES:
- Tone: ${toneGuide[tone] || toneGuide.mixed}
- Target length: ${wordTarget} words (this is important — write enough to properly cover the stories)
- Write for the EAR, not the eye. Short sentences. Conversational rhythm. Varied pace.
- Use spoken numbers: "five hundred" not "500", "twenty twenty-six" not "2026"
- Reference sources naturally: "according to Reuters" or "as the BBC reports" — never "Article 1 says"
- SYNTHESIZE. Don't just list articles one by one. Find the thread that connects them. Tell a story.
- Cover ALL the major stories in your source material. Don't just pick one and ignore the rest.
- Include specific facts, numbers, names. Specificity makes audio compelling.
- Vary your sentence length. Mix short punchy lines with longer explanatory ones.
- Add natural pauses: use "..." for beats, em dashes for asides.
- NO segment headers, NO "let's talk about", NO "moving on to" — just flow naturally.
- NO sign-offs like "that's it for" or "stay tuned" — the next segment handles transitions.
${transitionNote ? `\n${transitionNote}` : ''}

IMPORTANT: You have ${articles.length} articles to work with. Use them! Cover the breadth of what's happening, not just one story. The listener subscribed to "${topicLabel}" because they want COMPREHENSIVE coverage.

Return ONLY the script text. No headers, no stage directions, no meta-commentary.`

  const script = await callClaude(prompt, 3000)
  const wordCount = script.split(/\s+/).length
  const duration = Math.round(wordCount / 2.5) // ~2.5 words/sec

  return { script, duration }
}

async function writeColdOpen(
  segments: { title: string; topicLabel: string; articleCount: number }[],
  tone: string,
  isWeekend: boolean,
): Promise<string> {
  const showType = isWeekend ? 'weekend digest' : 'morning brief'
  const toneGuide: Record<string, string> = {
    factual: 'Professional, authoritative. Think NPR opening.',
    mixed: 'Warm and energetic. Like greeting a friend with exciting news.',
    commentary: 'Bold and engaging. Hook them with your most provocative take.',
  }

  const topics = segments.map(s => `${s.topicLabel} (${s.articleCount} stories)`).join(', ')

  const prompt = `Write a cold open for a daily podcast (${showType}). Today's lineup: ${topics}.

Guidelines:
- 3-4 sentences that HOOK the listener. Tease the most interesting stories.
- Tone: ${toneGuide[tone] || toneGuide.mixed}
- Write for spoken delivery. Conversational, energetic, specific.
- Don't say "Good morning" or "Welcome to" — just launch right in.
- End with something that creates anticipation.

Return ONLY the script text.`

  try {
    return await callClaude(prompt, 500)
  } catch {
    return `Big stories today across ${segments.length} topics. Let's get into it.`
  }
}

async function writeWrapUp(
  segments: { title: string; topicLabel: string }[],
  tone: string,
  isWeekend: boolean,
): Promise<string> {
  const toneGuide: Record<string, string> = {
    factual: 'Brief, professional sign-off.',
    mixed: 'Warm, conversational goodbye.',
    commentary: 'Leave them with one final thought to chew on.',
  }

  const prompt = `Write a wrap-up for a daily podcast. We covered: ${segments.map(s => s.topicLabel).join(', ')}.

Guidelines:
- 2-3 sentences. Quick, satisfying ending.
- Tone: ${toneGuide[tone] || toneGuide.mixed}
- ${isWeekend ? 'Wish them a good weekend.' : 'Set up anticipation for tomorrow.'}
- Don't just list what we covered. Leave them with something memorable.

Return ONLY the script text.`

  try {
    return await callClaude(prompt, 300)
  } catch {
    return isWeekend
      ? `That's your weekend digest. Enjoy the time off — we'll be back Monday.`
      : `That's your briefing for today. See you tomorrow morning.`
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
  const defaultVoice = (params.default_voice as string) || 'anchor'
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

    // --- Step 1: Fetch RSS for all topics in parallel, passing custom tags ---
    const rssResults = await Promise.allSettled(
      sorted.map(async (ut) => {
        const topicId = ut.topic_id
        if (!TOPIC_META[topicId]) return { topicId, rss: null, customTags: ut.custom_tags || [] }

        // Check Supabase cache first (if available)
        if (supabase && !forceRefresh) {
          const { data: cached } = await supabase
            .from('topic_content')
            .select('*')
            .eq('topic_id', topicId)
            .eq('fetch_date', today)
            .single()

          if (cached && cached.claims?.length > 0) {
            return { topicId, cached, customTags: ut.custom_tags || [] }
          }
        }

        // Pass custom tags to RSS fetcher for dynamic feed discovery
        const rss = await fetchRssForTopic(topicId, ut.custom_tags || [])
        return { topicId, rss, customTags: ut.custom_tags || [] }
      })
    )

    // Collect RSS articles per topic
    const topicArticles = new Map<string, { articles: RssArticle[]; fromCache: boolean; cachedData?: Record<string, unknown>; customTags: string[] }>()
    const fetchErrors: string[] = []

    for (const result of rssResults) {
      if (result.status !== 'fulfilled') continue
      const { topicId, rss, cached, customTags: tags } = result.value as {
        topicId: string; rss?: FetchedRssContent | null; cached?: Record<string, unknown>; customTags: string[]
      }

      if (cached) {
        topicArticles.set(topicId, { articles: [], fromCache: true, cachedData: cached, customTags: tags })
      } else if (rss && rss.articles.length > 0) {
        topicArticles.set(topicId, { articles: rss.articles, fromCache: false, customTags: tags })

        // Cache the RSS content
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

    // --- Step 2: Kick off web search enrichment in parallel ---
    const webContextMap = new Map<string, Promise<string | null>>()
    for (const ut of sorted) {
      if (!topicArticles.has(ut.topic_id)) continue
      const meta = TOPIC_META[ut.topic_id]
      if (!meta) continue
      webContextMap.set(
        ut.topic_id,
        searchForContext(meta.label, meta.subs, ut.custom_tags || []).catch(() => null),
      )
    }

    // --- Step 3: Generate scripts with voice variety and better prompts ---
    const topicSegments: SegmentResult[] = []
    let elapsed = 0
    let scriptErrors = 0

    const topicsWithContent = sorted.filter(ut => topicArticles.has(ut.topic_id) && TOPIC_META[ut.topic_id])

    for (let ti = 0; ti < topicsWithContent.length; ti++) {
      const ut = topicsWithContent[ti]
      const entry = topicArticles.get(ut.topic_id)!
      const meta = TOPIC_META[ut.topic_id]!

      const baseWords = WORD_TARGETS[length] || 700
      const wordTarget = Math.round(baseWords * (WEIGHT_MULTIPLIERS[ut.weight] || 1))

      // Check script cache
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
          // Assign varied voice even from cache
          const voice = ut.voice_override || TOPIC_VOICES[ut.topic_id] || defaultVoice
          topicSegments.push({
            topic_id: ut.topic_id,
            segment_type: 'topic',
            title: (cached.title as string) || meta.label,
            voice,
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

      // Build articles list
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
        const webContext = await (webContextMap.get(ut.topic_id) || Promise.resolve(null))
        const prevTopicLabel = ti > 0 ? TOPIC_META[topicsWithContent[ti - 1].topic_id]?.label || null : null

        const { script, duration } = await writeSegmentScript(
          meta.label, articles, ut.custom_tags || [], tone, wordTarget, webContext,
          { index: ti, total: topicsWithContent.length },
          prevTopicLabel,
        )

        // Cache the script
        if (supabase) {
          const contentHash = entry.fromCache && entry.cachedData
            ? (entry.cachedData.content_hash as string) || ''
            : hashArticles(ut.topic_id, today, entry.articles)

          if (contentHash) {
            supabase.from('generated_scripts').insert({
              content_hash: contentHash, tone, length, script,
              duration_seconds: duration, model_used: 'claude-sonnet-4-5-20250514',
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

        // Voice variety: each topic gets a different voice
        const voice = ut.voice_override || TOPIC_VOICES[ut.topic_id] || defaultVoice

        topicSegments.push({
          topic_id: ut.topic_id,
          segment_type: 'topic',
          title: meta.label,
          voice,
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

    // --- Step 4: Cold open and wrap-up (separate from topic scripts) ---
    const now = dateOverride ? new Date(dateOverride + 'T12:00:00Z') : new Date()
    const isWeekend = now.getDay() === 0 || now.getDay() === 6

    const [coldOpenScript, wrapUpScript] = await Promise.all([
      writeColdOpen(
        topicSegments.map(s => ({
          title: s.title,
          topicLabel: TOPIC_META[s.topic_id || '']?.label || s.title,
          articleCount: s.sources.length,
        })),
        tone, isWeekend,
      ),
      writeWrapUp(
        topicSegments.map(s => ({
          title: s.title,
          topicLabel: TOPIC_META[s.topic_id || '']?.label || s.title,
        })),
        tone, isWeekend,
      ),
    ])

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
      voice: 'anchor', start_time_seconds: 0, duration_seconds: coldOpenDuration,
      script: coldOpenScript, sources: [], sort_order: 0,
    }

    const wrapUp: SegmentResult = {
      topic_id: null, segment_type: 'wrap_up', title: 'Wrap Up',
      voice: 'anchor', start_time_seconds: runningTime, duration_seconds: wrapUpDuration,
      script: wrapUpScript, sources: [], sort_order: topicSegments.length + 1,
    }

    const allSegments = [coldOpen, ...topicSegments, wrapUp]
    const totalMinutes = Math.round((runningTime + wrapUpDuration) / 60)

    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const episodeTitle = `${dateStr} — ${isWeekend ? 'Weekend Digest' : 'Morning Brief'}`

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
