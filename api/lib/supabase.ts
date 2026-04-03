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
