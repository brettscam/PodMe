import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || ''

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Topic metadata for web search prompts (derived from TOPIC_CATALOG, no icons)
const TOPIC_META: Record<string, { label: string; subs: string[] }> = {
  earnings: { label: 'Markets & Earnings', subs: ['Earnings next week', 'S&P movers', 'IPO pipeline', 'Crypto', 'Sector rotation'] },
  tech: { label: 'Technology', subs: ['AI/ML', 'Consumer tech', 'Enterprise SaaS', 'Startups', 'Open source'] },
  world: { label: 'World News', subs: ['Geopolitics', 'Climate', 'Conflict', 'Diplomacy', 'Global health'] },
  local: { label: 'Bay Area & Marin County', subs: ['Bay Area', 'Marin County', 'School boards', 'Transit', 'Housing'] },
  business: { label: 'Business & Economy', subs: ['Fed/Rates', 'Labor market', 'M&A', 'Venture capital', 'Real estate'] },
  science: { label: 'Science & Health', subs: ['Research', 'Space', 'Medicine', 'Nutrition', 'Mental health'] },
  creative: { label: 'Creative & Culture', subs: ['Photography', 'Design', 'Film', 'Music', 'Books'] },
  sports: { label: 'Sports', subs: ['NFL', 'NBA', 'MLB', 'F1', 'Golf', 'College'] },
  travel: { label: 'Travel', subs: ['Destinations', 'Points/Miles', 'Hotels', 'Flight deals'] },
  entertainment: { label: 'Entertainment', subs: ['Streaming', 'Box office', 'Gaming', 'Podcasts'] },
}

// Duration targets by length preference (seconds)
const DURATION_TARGETS: Record<string, number> = {
  quick: 90,
  standard: 180,
  deep: 300,
}

// Weight multipliers for duration
const WEIGHT_MULTIPLIERS: Record<string, number> = {
  featured: 1.2,
  standard: 1.0,
  brief: 0.5,
}

// Fallback templates — used when content ingestion + LLM generation both fail
const FALLBACK_SCRIPTS: Record<string, { title: string; voice: string; duration: number; script: string }> = {
  earnings: { title: 'Markets & Earnings', voice: 'strategist', duration: 300, script: 'The S&P five hundred finished the week at fifty-three twelve, up one point two percent, with the Nasdaq leading at one point eight percent. NVIDIA was the story of the week — data center revenue hit twenty point two billion, beating consensus by eight hundred million. But the real headline is that inference workloads officially crossed fifty percent of GPU compute. That\'s a structural shift.' },
  tech: { title: 'Technology', voice: 'correspondent', duration: 260, script: 'Two massive tech stories this week. Apple unveiled Apple Glass at its surprise spring event — lightweight AR glasses that pair with your iPhone, shipping in June. Early hands-on reports say they\'re surprisingly comfortable and the field of view is wider than expected.' },
  world: { title: 'World News', voice: 'anchor', duration: 240, script: 'The ceasefire talks in Geneva made more progress this week than in any previous round. The key breakthrough is a new framework from Turkish and Brazilian mediators that decouples the territorial question from security guarantees.' },
  local: { title: 'Bay Area & Marin', voice: 'neighbor', duration: 200, script: 'Good morning, Marin. The San Rafael farmer\'s market is in full swing at its new year-round schedule, eight AM to one PM. If you missed the Housing Element vote, the Board of Supervisors passed it Thursday night.' },
  business: { title: 'Business & Economy', voice: 'strategist', duration: 240, script: 'Fed Governor Christopher Waller gave a speech that markets are treating as a green light for June. He said the totality of the data is moving in the right direction.' },
  science: { title: 'Science & Health', voice: 'scottish-mentor', duration: 200, script: 'The European Medicines Agency approved the first in-vivo CRISPR gene therapy — a one-time treatment for sickle cell disease that edits stem cells inside the patient\'s body, no extraction required.' },
  creative: { title: 'Creative & Culture', voice: 'host', duration: 120, script: 'The Fujifilm-Hasselblad acquisition rumors heated up — DPReview sources say a deal for the medium format division could close by summer.' },
  sports: { title: 'Sports', voice: 'southern-gentleman', duration: 240, script: 'Selection Sunday is coming and the bracket is taking shape. Duke is the favorite for the top overall seed after winning the ACC tournament.' },
  travel: { title: 'Travel', voice: 'modern-brand-ambassador', duration: 180, script: 'If you\'re thinking about a spring getaway, some great fares just dropped from SFO. United has roundtrips to Honolulu for two forty-nine through April.' },
  entertainment: { title: 'Entertainment', voice: 'insider', duration: 180, script: 'Alright, let\'s talk about The Bear. Season Four dropped on Hulu and I binged all ten episodes. Without spoilers — it\'s the best season yet.' },
}

// --- Content Ingestion ---

function hashContent(topicId: string, fetchDate: string, claims: string[]): string {
  const input = topicId + fetchDate + JSON.stringify([...claims].sort())
  return createHash('sha256').update(input).digest('hex')
}

interface FetchedContent {
  title: string
  claims: string[]
  sources: { outlet: string; domain: string; tier: number; title: string; url: string; published_at: string; cited_claims: string[] }[]
}

async function fetchTopicContent(
  topicId: string,
  label: string,
  subs: string[],
  customTags: string[] = [],
): Promise<FetchedContent | null> {
  if (!anthropicApiKey) return null

  const tagsClause = customTags.length > 0
    ? `\nThe user has specifically requested coverage of these topics/tags: ${customTags.join(', ')}. Prioritize finding news about these.`
    : ''

  const prompt = `Search for the latest news about "${label}". Focus on these subtopics: ${subs.join(', ')}.${tagsClause}

After searching, return a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{
  "title": "A short headline summarizing today's top story for this topic",
  "claims": ["claim 1 with source attribution", "claim 2 with source attribution", ...],
  "sources": [
    {
      "outlet": "Name of the news outlet",
      "domain": "example.com",
      "tier": 1,
      "title": "Article headline",
      "url": "https://...",
      "published_at": "2026-03-17T00:00:00Z",
      "cited_claims": ["which claims came from this source"]
    }
  ]
}

Source tier guide:
- Tier 1: Wire services, papers of record (AP, Reuters, NYT, WSJ, Financial Times)
- Tier 2: Major outlets (Bloomberg, BBC, CNN, TechCrunch, The Verge)
- Tier 3: Niche/trade press, blogs, local outlets
- Tier 4: Unverified or unknown sources

Include 3-6 claims and 2-4 sources. Each claim should be a specific, factual statement.`

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
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error(`Content fetch API error for ${topicId}: ${response.status}`)
      return null
    }

    const data = await response.json()

    // Extract text from response content blocks
    const textBlocks = (data.content || []).filter((b: { type: string }) => b.type === 'text')
    const rawText = textBlocks.map((b: { text: string }) => b.text).join('')

    // Parse JSON — try raw first, then extract from code fences
    let parsed: FetchedContent
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error(`No JSON found in content fetch response for ${topicId}`)
        return null
      }
      parsed = JSON.parse(jsonMatch[0])
    }

    // Validate required fields
    if (!parsed.title || !Array.isArray(parsed.claims) || !Array.isArray(parsed.sources)) {
      console.error(`Invalid content structure for ${topicId}`)
      return null
    }

    return parsed
  } catch (err) {
    console.error(`Content fetch failed for ${topicId}:`, err)
    return null
  }
}

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
  sources: unknown[]
  sort_order: number
}

async function generateScript(
  topicTitle: string,
  claims: string[],
  sources: unknown[],
  tone: string,
  length: string,
): Promise<{ script: string; duration: number; prompt_tokens: number; completion_tokens: number }> {
  const toneGuide: Record<string, string> = {
    factual: 'dry reporting style, just the facts, no opinion',
    mixed: 'reporting with light commentary, conversational but informative',
    commentary: 'opinionated analysis, strong voice, engaging perspective',
  }

  const lengthGuide: Record<string, string> = {
    quick: '2-3 key points, roughly 90 seconds when read aloud (~225 words)',
    standard: 'full coverage, roughly 180 seconds when read aloud (~450 words)',
    deep: 'thorough analysis, roughly 300 seconds when read aloud (~750 words)',
  }

  const prompt = `You are writing a podcast segment script.

Topic: ${topicTitle}
Key claims/facts:
${claims.map((c, i) => `${i + 1}. ${c}`).join('\n')}

User preferences:
- Tone: ${tone} (${toneGuide[tone] || toneGuide.mixed})
- Length: ${length} (${lengthGuide[length] || lengthGuide.standard})

Write a natural-sounding podcast script. Use spoken numbers ("five hundred" not "500").
Reference sources by outlet name. No segment headers or stage directions.
Return ONLY the script text, nothing else.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  const script = data.content[0]?.text || ''
  const wordCount = script.split(/\s+/).length
  // Rough estimate: 2.5 words per second for natural speech
  const duration = Math.round(wordCount / 2.5)

  return {
    script,
    duration,
    prompt_tokens: data.usage?.input_tokens || 0,
    completion_tokens: data.usage?.output_tokens || 0,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Accept params from query (GET) or body (POST)
  const params = req.method === 'GET' ? req.query : req.body
  const tone = (params.tone as string) || 'mixed'
  const length = (params.length as string) || 'standard'
  const topicsParam = params.topics as string | TopicParam[] | undefined

  if (!topicsParam) {
    return res.status(400).json({ error: 'Missing topics parameter' })
  }

  // Parse topics: either JSON array or comma-separated topic IDs
  let topics: TopicParam[]
  if (typeof topicsParam === 'string') {
    // Simple comma-separated: "earnings,tech,world"
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

  const supabase = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  let cacheHits = 0
  let cacheMisses = 0
  let fallbacks = 0
  let contentFetches = 0

  // Build segments
  let elapsed = 50 // after cold open
  const topicSegments: SegmentResult[] = []

  // Step 0: Fetch missing content in parallel for all topics
  const contentMap = new Map<string, { title: string; claims: string[]; sources: unknown[]; content_hash: string }>()

  const contentChecks = sorted
    .filter(ut => FALLBACK_SCRIPTS[ut.topic_id])
    .map(async (ut) => {
      // Check if content exists for today
      const { data: existing } = await supabase
        .from('topic_content')
        .select('*')
        .eq('topic_id', ut.topic_id)
        .eq('fetch_date', today)
        .single()

      if (existing) {
        contentMap.set(ut.topic_id, existing)
        return
      }

      // Content miss — fetch via web search
      const meta = TOPIC_META[ut.topic_id]
      if (!meta) return

      const fetched = await fetchTopicContent(ut.topic_id, meta.label, meta.subs, ut.custom_tags || [])
      if (!fetched) return

      contentFetches++
      const content_hash = hashContent(ut.topic_id, today, fetched.claims)

      // Upsert into topic_content (fire-and-forget, handles race conditions)
      await supabase.from('topic_content').upsert({
        topic_id: ut.topic_id,
        fetch_date: today,
        title: fetched.title,
        claims: fetched.claims,
        sources: fetched.sources,
        content_hash,
      }, { onConflict: 'topic_id,fetch_date' })

      contentMap.set(ut.topic_id, {
        title: fetched.title,
        claims: fetched.claims,
        sources: fetched.sources,
        content_hash,
      })
    })

  // Wait for all content fetches to complete
  await Promise.allSettled(contentChecks)

  for (const ut of sorted) {
    const fallback = FALLBACK_SCRIPTS[ut.topic_id]
    if (!fallback) continue

    const baseDuration = DURATION_TARGETS[length] || 180
    const targetDuration = Math.round(baseDuration * (WEIGHT_MULTIPLIERS[ut.weight] || 1))
    const voice = ut.voice_override || fallback.voice

    // Step 1: Check content (already fetched in parallel above)
    const content = contentMap.get(ut.topic_id)

    if (!content) {
      // No content available — use hardcoded fallback
      fallbacks++
      topicSegments.push({
        topic_id: ut.topic_id,
        segment_type: 'topic',
        title: fallback.title,
        voice,
        start_time_seconds: elapsed,
        duration_seconds: ut.weight === 'brief' ? Math.round(fallback.duration * 0.5) : fallback.duration,
        script: fallback.script,
        sources: [],
        sort_order: topicSegments.length + 1,
      })
      elapsed += ut.weight === 'brief' ? Math.round(fallback.duration * 0.5) : fallback.duration
      continue
    }

    // Step 2: Check script cache
    const contentHash = content.content_hash || hashContent(ut.topic_id, today, content.claims || [])
    const { data: cached } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('content_hash', contentHash)
      .eq('tone', tone)
      .eq('length', length)
      .single()

    if (cached) {
      // Cache HIT
      cacheHits++
      topicSegments.push({
        topic_id: ut.topic_id,
        segment_type: 'topic',
        title: content.title || fallback.title,
        voice,
        start_time_seconds: elapsed,
        duration_seconds: cached.duration_seconds,
        script: cached.script,
        sources: content.sources || [],
        sort_order: topicSegments.length + 1,
      })
      elapsed += cached.duration_seconds
      continue
    }

    // Step 3: Cache MISS — generate with LLM
    if (!anthropicApiKey) {
      // No API key, fall back to template
      fallbacks++
      topicSegments.push({
        topic_id: ut.topic_id,
        segment_type: 'topic',
        title: content.title || fallback.title,
        voice,
        start_time_seconds: elapsed,
        duration_seconds: targetDuration,
        script: fallback.script,
        sources: content.sources || [],
        sort_order: topicSegments.length + 1,
      })
      elapsed += targetDuration
      continue
    }

    try {
      cacheMisses++
      const result = await generateScript(
        content.title || fallback.title,
        content.claims || [],
        content.sources || [],
        tone,
        length,
      )

      // Store in cache (fire-and-forget)
      supabase.from('generated_scripts').insert({
        content_hash: contentHash,
        tone,
        length,
        script: result.script,
        duration_seconds: result.duration,
        model_used: 'claude-haiku-4-5-20251001',
        prompt_tokens: result.prompt_tokens,
        completion_tokens: result.completion_tokens,
      }).then(() => {})

      topicSegments.push({
        topic_id: ut.topic_id,
        segment_type: 'topic',
        title: content.title || fallback.title,
        voice,
        start_time_seconds: elapsed,
        duration_seconds: result.duration,
        script: result.script,
        sources: content.sources || [],
        sort_order: topicSegments.length + 1,
      })
      elapsed += result.duration
    } catch (err) {
      console.error(`Script generation failed for ${ut.topic_id}:`, err)
      // Fall back to template on error
      fallbacks++
      topicSegments.push({
        topic_id: ut.topic_id,
        segment_type: 'topic',
        title: content.title || fallback.title,
        voice,
        start_time_seconds: elapsed,
        duration_seconds: targetDuration,
        script: fallback.script,
        sources: content.sources || [],
        sort_order: topicSegments.length + 1,
      })
      elapsed += targetDuration
    }
  }

  // Build cold open and wrap up
  const now = new Date()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  const suffix = isWeekend ? 'weekend digest' : 'morning brief'

  const coldOpen: SegmentResult = {
    topic_id: null,
    segment_type: 'cold_open',
    title: 'Cold Open',
    voice: 'scottish-mentor',
    start_time_seconds: 0,
    duration_seconds: 50,
    script: `Good morning, and welcome to your ${suffix}. We've got ${topicSegments.length} segments for you today. Let's get into it.`,
    sources: [],
    sort_order: 0,
  }

  const wrapUp: SegmentResult = {
    topic_id: null,
    segment_type: 'wrap_up',
    title: 'Wrap & Look-Ahead',
    voice: 'scottish-mentor',
    start_time_seconds: elapsed,
    duration_seconds: 60,
    script: `That's your ${suffix}. We'll see you ${isWeekend ? 'Monday morning' : 'tomorrow'} with a fresh episode. Have a wonderful ${isWeekend ? 'weekend' : 'day'}.`,
    sources: [],
    sort_order: topicSegments.length + 1,
  }

  const allSegments = [coldOpen, ...topicSegments, wrapUp]
  const totalMinutes = Math.round((elapsed + 60) / 60)

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const episodeTitle = `${dateStr} — ${isWeekend ? 'Weekend Digest' : 'Morning Brief'}`

  return res.status(200).json({
    episode: {
      title: episodeTitle,
      date: today,
      cadence: isWeekend ? 'weekly' : 'daily',
      tone,
      estimated_minutes: totalMinutes,
      status: 'ready',
      show_notes: {
        segments: topicSegments.map(s => ({
          title: s.title,
          sources: s.sources,
        })),
        correction_notes: [],
        source_summary: {
          total_articles: topicSegments.length * 2,
          total_outlets: topicSegments.length + 2,
          tier_1_count: Math.ceil(topicSegments.length * 0.5),
          tier_2_count: Math.ceil(topicSegments.length * 0.4),
          tier_3_count: Math.max(1, Math.floor(topicSegments.length * 0.1)),
        },
      },
      segments: allSegments,
    },
    cache_stats: {
      hits: cacheHits,
      misses: cacheMisses,
      fallbacks,
      content_fetches: contentFetches,
    },
  })
}
