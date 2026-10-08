import { supabase } from './supabase'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL

if (!BASE_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_URL. Copy .env.example to .env.local.')
}

export class ApiError extends Error {
  status: number
  code?: string
  /** Server-supplied human-readable detail, e.g. quota messages. */
  reason?: string

  constructor(status: number, message: string, code?: string, reason?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.reason = reason
  }

  /** True when the request was rejected because the user is over a tier limit. */
  get isQuotaExceeded(): boolean {
    return this.status === 402
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  /** Skip the auth header, for endpoints that don't need it. */
  anonymous?: boolean
}

/**
 * Call the web API with the current Supabase access token attached.
 * Throws ApiError on non-2xx so callers can branch on status/quota.
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, anonymous = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (!anonymous) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new ApiError(401, 'Not signed in')
    }
    headers.Authorization = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      // Non-JSON error page (proxy/gateway); fall through to status-only error.
    }
  }

  if (!res.ok) {
    const obj = (parsed ?? {}) as { error?: string; reason?: string }
    throw new ApiError(
      res.status,
      obj.reason || obj.error || `Request failed (${res.status})`,
      obj.error,
      obj.reason,
    )
  }

  return parsed as T
}
