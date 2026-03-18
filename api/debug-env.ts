import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ELEVENLABS_API_KEY',
  'CRON_SECRET',
  'RESEND_API_KEY',
]

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const result: Record<string, unknown> = {}

  // 1. Check env vars
  try {
    const env: Record<string, string> = {}
    for (const key of ENV_VARS) {
      const val = process.env[key]
      if (val) {
        env[key] = `set (length: ${val.length})`
      } else {
        env[key] = 'NOT SET'
      }
    }
    // Also check VERCEL_URL which is auto-set by Vercel
    const vercelUrl = process.env.VERCEL_URL
    env['VERCEL_URL'] = vercelUrl ? `set (length: ${vercelUrl.length})` : 'NOT SET'
    result.env = env
  } catch (err: unknown) {
    result.env = { status: 'error', error: err instanceof Error ? err.message : String(err) }
  }

  // 2. Supabase connectivity check
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
      result.supabase = {
        status: 'error',
        error: `Missing credentials: url=${supabaseUrl ? 'set' : 'missing'}, key=${supabaseKey ? 'set' : 'missing'}`,
      }
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase
        .from('episodes')
        .select('id')
        .limit(1)
      if (error) {
        result.supabase = { status: 'error', error: error.message, code: error.code }
      } else {
        result.supabase = { status: 'ok', testQuery: 'SELECT id FROM episodes LIMIT 1', rowsReturned: data?.length ?? 0 }
      }
    }
  } catch (err: unknown) {
    result.supabase = { status: 'error', error: err instanceof Error ? err.message : String(err) }
  }

  // 3. Anthropic API check
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || ''
    if (!apiKey) {
      result.anthropic = { status: 'error', error: 'ANTHROPIC_API_KEY not set' }
    } else {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say hi' }],
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        result.anthropic = {
          status: 'error',
          httpStatus: response.status,
          error: body.slice(0, 500),
        }
      } else {
        const data = await response.json()
        result.anthropic = {
          status: 'ok',
          model: data.model,
          usage: data.usage,
        }
      }
    }
  } catch (err: unknown) {
    result.anthropic = { status: 'error', error: err instanceof Error ? err.message : String(err) }
  }

  // 4. Node / runtime info
  result.runtime = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  }

  res.status(200).json(result)
}
