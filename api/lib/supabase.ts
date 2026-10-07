import { createClient } from '@supabase/supabase-js'
import type { VercelRequest } from '@vercel/node'

const url = process.env.VITE_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

/** Service-role client — bypasses RLS, use for writes and admin queries. */
export function getServiceClient() {
  return createClient(url, serviceKey || anonKey)
}

/** Extract user ID from the JWT in the Authorization header. Returns null if invalid/missing. */
export async function getUserId(req: VercelRequest): Promise<string | null> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null

  try {
    const client = createClient(url, anonKey)
    const { data: { user } } = await client.auth.getUser(token)
    return user?.id ?? null
  } catch {
    return null
  }
}

export const INTERNAL_SECRET_HEADER = 'x-internal-secret'

export type Caller =
  /** Request carried a valid user JWT. Ownership must still be checked. */
  | { kind: 'user'; userId: string }
  /** Request came from another one of our functions (stage chaining, cron). */
  | { kind: 'internal' }
  | { kind: 'none' }

/**
 * Identify who is calling an endpoint.
 *
 * Generation stages chain server-side, and the sweeper runs with no user
 * present, so those callers authenticate with CRON_SECRET instead of a JWT.
 * An internal caller is trusted to act for the episode's owner; endpoints
 * read user_id off the episode row rather than from the request.
 */
export async function resolveCaller(req: VercelRequest): Promise<Caller> {
  const provided = req.headers[INTERNAL_SECRET_HEADER]
  const expected = process.env.CRON_SECRET

  if (expected && typeof provided === 'string' && timingSafeEqual(provided, expected)) {
    return { kind: 'internal' }
  }

  const userId = await getUserId(req)
  return userId ? { kind: 'user', userId } : { kind: 'none' }
}

/** Constant-time string compare so the secret can't be recovered by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
