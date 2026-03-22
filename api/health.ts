import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * /api/health — Tests every external dependency in the pipeline.
 * Returns structured status for each service so you can see exactly what's broken.
 *
 * This is the endpoint the admin console will call to show pipeline health.
 */

interface ServiceCheck {
  service: string
  status: 'ok' | 'error' | 'missing_key'
  latency_ms: number
  error?: string
}

async function checkSupabase(): Promise<ServiceCheck> {
  const start = Date.now()
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { service: 'supabase', status: 'missing_key', latency_ms: 0, error: 'VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' }
  }

  try {
    const supabase = createClient(url, key)
    // Simple query to verify connection
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw new Error(error.message)
    return { service: 'supabase', status: 'ok', latency_ms: Date.now() - start }
  } catch (err) {
    return { service: 'supabase', status: 'error', latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

async function checkAnthropic(): Promise<ServiceCheck> {
  const start = Date.now()
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return { service: 'anthropic', status: 'missing_key', latency_ms: 0, error: 'ANTHROPIC_API_KEY not set' }
  }

  try {
    // Minimal API call to verify the key works
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`)
    }

    const data = await response.json()
    if (!data.content?.[0]?.text) throw new Error('Empty response from API')

    return { service: 'anthropic', status: 'ok', latency_ms: Date.now() - start }
  } catch (err) {
    return { service: 'anthropic', status: 'error', latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

async function checkReplicate(): Promise<ServiceCheck> {
  const start = Date.now()
  const apiToken = process.env.REPLICATE_API_TOKEN

  if (!apiToken) {
    return { service: 'replicate', status: 'missing_key', latency_ms: 0, error: 'REPLICATE_API_TOKEN not set' }
  }

  try {
    // Just verify the token is valid by hitting the account endpoint
    const response = await fetch('https://api.replicate.com/v1/account', {
      headers: { 'Authorization': `Bearer ${apiToken}` },
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`)
    }

    return { service: 'replicate', status: 'ok', latency_ms: Date.now() - start }
  } catch (err) {
    return { service: 'replicate', status: 'error', latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

async function checkSupabaseStorage(): Promise<ServiceCheck> {
  const start = Date.now()
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { service: 'supabase_storage', status: 'missing_key', latency_ms: 0, error: 'Supabase keys not set' }
  }

  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.storage.from('audio-cache').list('', { limit: 1 })
    if (error) throw new Error(error.message)
    return { service: 'supabase_storage', status: 'ok', latency_ms: Date.now() - start }
  } catch (err) {
    return { service: 'supabase_storage', status: 'error', latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

async function checkRssFeeds(): Promise<ServiceCheck> {
  const start = Date.now()
  // Test a known reliable RSS feed
  try {
    const response = await fetch('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', {
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    if (!text.includes('<rss') && !text.includes('<feed')) throw new Error('Response is not valid RSS/Atom')
    return { service: 'rss_feeds', status: 'ok', latency_ms: Date.now() - start }
  } catch (err) {
    return { service: 'rss_feeds', status: 'error', latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkReplicate(),
    checkSupabaseStorage(),
    checkRssFeeds(),
  ])

  const allOk = checks.every(c => c.status === 'ok')
  const summary = {
    healthy: allOk,
    timestamp: new Date().toISOString(),
    services: Object.fromEntries(checks.map(c => [c.service, c])),
    pipeline_ready: {
      can_build_episode: checks.filter(c => ['supabase', 'anthropic', 'rss_feeds'].includes(c.service)).every(c => c.status === 'ok'),
      can_generate_audio: checks.filter(c => ['replicate', 'supabase_storage'].includes(c.service)).every(c => c.status === 'ok'),
    },
  }

  return res.status(allOk ? 200 : 503).json(summary)
}
