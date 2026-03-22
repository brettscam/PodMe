import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Pipeline Integration Test
 *
 * Tests the FULL episode generation → audio generation flow.
 * Mocks external APIs (Anthropic, Replicate, Supabase) but exercises
 * all internal logic and data transformations.
 *
 * This test answers: "If I click Generate, does an episode get built
 * and can audio be produced for every segment?"
 */

// --- Mock Supabase ---
const mockSupabaseStorage = {
  from: vi.fn(() => ({
    download: vi.fn(() => Promise.resolve({ data: null, error: null })),
    upload: vi.fn(() => Promise.resolve({ error: null })),
    list: vi.fn(() => Promise.resolve({ data: [], error: null })),
  })),
}

const mockSupabaseDb = {
  from: vi.fn((table: string) => {
    if (table === 'topic_content') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }),
        upsert: () => Promise.resolve({ error: null }),
      }
    }
    if (table === 'generated_scripts') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }) }),
        insert: () => Promise.resolve({ error: null }),
      }
    }
    if (table === 'episodes') {
      return { insert: () => Promise.resolve({ error: null }) }
    }
    if (table === 'episode_segments') {
      return { insert: () => Promise.resolve({ error: null }) }
    }
    if (table === 'profiles') {
      return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }
    }
    return { select: () => Promise.resolve({ data: null }) }
  }),
  storage: mockSupabaseStorage,
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseDb,
}))

// --- Mock fetch for external APIs ---
const originalFetch = global.fetch

function createMockFetch() {
  const calls: { url: string; body?: string }[] = []

  const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = url.toString()
    const body = init?.body ? String(init.body) : undefined
    calls.push({ url: urlStr, body })

    // Anthropic API — return a mock script
    if (urlStr.includes('api.anthropic.com')) {
      const parsedBody = body ? JSON.parse(body) : {}
      const prompt = parsedBody.messages?.[0]?.content || ''

      // Polish endpoint returns JSON
      if (prompt.includes('show producer')) {
        return new Response(JSON.stringify({
          content: [{
            type: 'text',
            text: JSON.stringify({
              cold_open: 'Good morning, here are your top stories.',
              transitions: ['First up,', 'Moving on,', 'And finally,'],
              wrap_up: 'That wraps up today. See you tomorrow.',
            }),
          }],
        }), { status: 200 })
      }

      // Web search returns text
      if (parsedBody.tools?.some((t: { type: string }) => t.type === 'web_search_20250305')) {
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: 'Additional context from web search.' }],
        }), { status: 200 })
      }

      // Script generation
      return new Response(JSON.stringify({
        content: [{
          type: 'text',
          text: 'This is a generated podcast script about the topic. It covers the key developments and provides analysis based on multiple sources. The segment discusses recent trends and their implications for listeners.',
        }],
      }), { status: 200 })
    }

    // Replicate API — return mock audio
    if (urlStr.includes('api.replicate.com') && urlStr.includes('predictions')) {
      return new Response(JSON.stringify({
        status: 'succeeded',
        output: 'https://replicate.delivery/mock-audio.wav',
      }), { status: 201 })
    }

    // Replicate account check
    if (urlStr.includes('api.replicate.com/v1/account')) {
      return new Response(JSON.stringify({ username: 'test' }), { status: 200 })
    }

    // Mock audio file download
    if (urlStr.includes('replicate.delivery')) {
      // Return a minimal WAV header (44 bytes)
      const wavHeader = new Uint8Array(44)
      wavHeader.set([0x52, 0x49, 0x46, 0x46]) // "RIFF"
      wavHeader.set([0x57, 0x41, 0x56, 0x45], 8) // "WAVE"
      return new Response(wavHeader, {
        status: 200,
        headers: { 'Content-Type': 'audio/wav' },
      })
    }

    // RSS feeds — return minimal RSS
    if (urlStr.includes('rss') || urlStr.includes('feeds') || urlStr.includes('.xml')) {
      return new Response(`<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Test Article About Tech</title>
      <link>https://example.com/article-1</link>
      <description>A test article description about technology developments.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
    <item>
      <title>Another Article About Markets</title>
      <link>https://example.com/article-2</link>
      <description>Market analysis and financial news coverage.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`, { status: 200, headers: { 'Content-Type': 'application/xml' } })
    }

    // NYT RSS for health check
    if (urlStr.includes('nytimes.com')) {
      return new Response(`<?xml version="1.0"?><rss version="2.0"><channel><title>NYT</title></channel></rss>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      })
    }

    // Default: return RSS-like response for any unmatched URL (likely an RSS feed)
    return new Response(`<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Feed</title>
    <item>
      <title>Breaking News Update</title>
      <link>${urlStr}</link>
      <description>Latest developments in this area.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`, { status: 200, headers: { 'Content-Type': 'application/xml' } })
  })

  return { mockFetch, calls }
}

// --- Set up env vars ---
beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
  process.env.REPLICATE_API_TOKEN = 'test-replicate-token'
})

describe('Full Pipeline Integration', { timeout: 30000 }, () => {
  it('build-episode: generates a complete episode with segments, scripts, and show notes', async () => {
    // This test exercises the full pipeline which makes many mocked API calls
    const { mockFetch, calls } = createMockFetch()
    global.fetch = mockFetch

    // Dynamically import to pick up mocked deps
    const { default: buildEpisodeHandler } = await import('../build-episode.js')

    const req = {
      method: 'POST',
      body: {
        tone: 'mixed',
        length: 'standard',
        default_voice: 'anchor',
        topics: [
          { topic_id: 'tech', weight: 'featured', pinned: false, voice_override: null, sort_order: 0 },
          { topic_id: 'world', weight: 'standard', pinned: false, voice_override: null, sort_order: 1 },
        ],
      },
    }

    let responseBody: Record<string, unknown> = {}
    let responseStatus = 0

    const res = {
      status: (code: number) => ({
        json: (body: Record<string, unknown>) => {
          responseStatus = code
          responseBody = body
        },
      }),
    }

    await buildEpisodeHandler(req as never, res as never)

    // --- Assertions ---
    expect(responseStatus).toBe(200)

    const episode = responseBody.episode as Record<string, unknown>
    expect(episode).toBeDefined()
    expect(episode.title).toBeDefined()
    expect(episode.status).toBe('ready')
    expect(episode.estimated_minutes).toBeGreaterThan(0)
    expect(episode.tone).toBe('mixed')

    // Must have segments
    const segments = episode.segments as Array<Record<string, unknown>>
    expect(segments.length).toBeGreaterThanOrEqual(3) // cold_open + at least 1 topic + wrap_up

    // First segment must be cold_open
    expect(segments[0].segment_type).toBe('cold_open')
    expect(segments[0].script).toBeTruthy()

    // Last segment must be wrap_up
    expect(segments[segments.length - 1].segment_type).toBe('wrap_up')
    expect(segments[segments.length - 1].script).toBeTruthy()

    // Topic segments must have scripts
    const topicSegments = segments.filter(s => s.segment_type === 'topic')
    expect(topicSegments.length).toBeGreaterThanOrEqual(1)
    for (const seg of topicSegments) {
      expect(seg.script).toBeTruthy()
      expect((seg.script as string).length).toBeGreaterThan(20)
      expect(seg.duration_seconds).toBeGreaterThan(0)
      expect(seg.voice).toBe('anchor')
    }

    // Show notes must exist
    const showNotes = episode.show_notes as Record<string, unknown>
    expect(showNotes).toBeDefined()
    expect(showNotes.source_summary).toBeDefined()

    // Cache stats must be reported
    const cacheStats = responseBody.cache_stats as Record<string, unknown>
    expect(cacheStats).toBeDefined()
    expect(typeof cacheStats.topics_with_content).toBe('number')
    expect(typeof cacheStats.segments_generated).toBe('number')

    // Verify Anthropic was called (for scripts + polish)
    const anthropicCalls = calls.filter(c => c.url.includes('api.anthropic.com'))
    expect(anthropicCalls.length).toBeGreaterThanOrEqual(2) // At least script gen + polish

    global.fetch = originalFetch
  })

  it('build-episode: every segment script is suitable for TTS', async () => {
    const { mockFetch } = createMockFetch()
    global.fetch = mockFetch

    const { default: buildEpisodeHandler } = await import('../build-episode.js')

    const req = {
      method: 'POST',
      body: {
        tone: 'mixed',
        length: 'quick',
        default_voice: 'anchor',
        topics: [
          { topic_id: 'tech', weight: 'featured', pinned: false, voice_override: null, sort_order: 0 },
        ],
      },
    }

    let episode: Record<string, unknown> = {}
    const res = {
      status: () => ({
        json: (body: Record<string, unknown>) => { episode = body.episode as Record<string, unknown> },
      }),
    }

    await buildEpisodeHandler(req as never, res as never)

    const segments = episode.segments as Array<Record<string, unknown>>
    for (const seg of segments) {
      const script = seg.script as string
      // Scripts must not be empty
      expect(script.length).toBeGreaterThan(0)
      // Scripts must not contain JSON or code
      expect(script).not.toMatch(/^\s*\{/)
      expect(script).not.toMatch(/^\s*\[/)
      // Scripts must have the voice field set
      expect(seg.voice).toBeTruthy()
    }

    global.fetch = originalFetch
  })

  it('generate-segment: produces valid audio from a script', async () => {
    const { mockFetch } = createMockFetch()
    global.fetch = mockFetch

    const { default: generateSegmentHandler } = await import('../generate-segment.js')

    const req = {
      method: 'POST',
      body: {
        script: 'This is a test podcast segment about technology trends.',
        voice: 'anchor',
        segmentId: 'seg_0',
      },
    }

    let responseBody: Record<string, unknown> = {}
    let responseStatus = 0

    const res = {
      status: (code: number) => ({
        json: (body: Record<string, unknown>) => {
          responseStatus = code
          responseBody = body
        },
      }),
    }

    await generateSegmentHandler(req as never, res as never)

    expect(responseStatus).toBe(200)
    expect(responseBody.segmentId).toBe('seg_0')
    expect(responseBody.audio).toBeTruthy() // base64 audio data
    expect(typeof responseBody.audio).toBe('string')
    expect((responseBody.audio as string).length).toBeGreaterThan(0)
    expect(responseBody.contentType).toMatch(/audio/)

    global.fetch = originalFetch
  })

  it('full pipeline: episode segments can all be sent to audio generation', async () => {
    const { mockFetch } = createMockFetch()
    global.fetch = mockFetch

    // Step 1: Build episode
    const { default: buildEpisodeHandler } = await import('../build-episode.js')
    const { default: generateSegmentHandler } = await import('../generate-segment.js')

    const buildReq = {
      method: 'POST',
      body: {
        tone: 'mixed',
        length: 'quick',
        default_voice: 'anchor',
        topics: [
          { topic_id: 'tech', weight: 'featured', pinned: false, voice_override: null, sort_order: 0 },
        ],
      },
    }

    let episode: Record<string, unknown> = {}
    const buildRes = {
      status: () => ({
        json: (body: Record<string, unknown>) => { episode = body.episode as Record<string, unknown> },
      }),
    }

    await buildEpisodeHandler(buildReq as never, buildRes as never)
    const segments = episode.segments as Array<Record<string, unknown>>
    expect(segments.length).toBeGreaterThanOrEqual(2)

    // Step 2: Generate audio for EVERY segment
    const audioResults: Array<{ segmentId: string; hasAudio: boolean; error?: string }> = []

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const genReq = {
        method: 'POST',
        body: {
          script: seg.script,
          voice: seg.voice,
          segmentId: `seg_${i}`,
        },
      }

      let genStatus = 0
      let genBody: Record<string, unknown> = {}
      const genRes = {
        status: (code: number) => ({
          json: (body: Record<string, unknown>) => {
            genStatus = code
            genBody = body
          },
        }),
      }

      await generateSegmentHandler(genReq as never, genRes as never)

      audioResults.push({
        segmentId: `seg_${i}`,
        hasAudio: genStatus === 200 && !!genBody.audio,
        error: genStatus !== 200 ? (genBody.error as string) : undefined,
      })
    }

    // EVERY segment must produce audio
    for (const result of audioResults) {
      expect(result.hasAudio).toBe(true)
      expect(result.error).toBeUndefined()
    }

    // Report
    console.log(`Pipeline test: ${segments.length} segments built, ${audioResults.filter(r => r.hasAudio).length}/${audioResults.length} audio generated successfully`)

    global.fetch = originalFetch
  })

  it('health endpoint: reports status of all services', async () => {
    const { mockFetch } = createMockFetch()
    global.fetch = mockFetch

    const { default: healthHandler } = await import('../health.js')

    let responseBody: Record<string, unknown> = {}
    let responseStatus = 0

    const res = {
      status: (code: number) => ({
        json: (body: Record<string, unknown>) => {
          responseStatus = code
          responseBody = body
        },
      }),
    }

    await healthHandler({} as never, res as never)

    expect([200, 503]).toContain(responseStatus)
    expect(responseBody.timestamp).toBeDefined()
    expect(responseBody.services).toBeDefined()
    expect(responseBody.pipeline_ready).toBeDefined()

    const pipelineReady = responseBody.pipeline_ready as Record<string, boolean>
    expect(typeof pipelineReady.can_build_episode).toBe('boolean')
    expect(typeof pipelineReady.can_generate_audio).toBe('boolean')

    global.fetch = originalFetch
  })
})
