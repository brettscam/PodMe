import type { VercelRequest, VercelResponse } from '@vercel/node'

const checks: Record<string, string> = {}

// Test each import individually
try {
  await import('./lib/topic-meta')
  checks['topic-meta'] = 'ok'
} catch (e: unknown) {
  checks['topic-meta'] = e instanceof Error ? e.message : String(e)
}

try {
  await import('./lib/rss-parser')
  checks['rss-parser'] = 'ok'
} catch (e: unknown) {
  checks['rss-parser'] = e instanceof Error ? e.message : String(e)
}

try {
  await import('./lib/rss-feeds')
  checks['rss-feeds'] = 'ok'
} catch (e: unknown) {
  checks['rss-feeds'] = e instanceof Error ? e.message : String(e)
}

try {
  await import('./lib/rss-fetcher')
  checks['rss-fetcher'] = 'ok'
} catch (e: unknown) {
  checks['rss-fetcher'] = e instanceof Error ? e.message : String(e)
}

try {
  await import('./lib/content-merger')
  checks['content-merger'] = 'ok'
} catch (e: unknown) {
  checks['content-merger'] = e instanceof Error ? e.message : String(e)
}

try {
  const { createHash } = await import('crypto')
  createHash('sha256').update('test').digest('hex')
  checks['crypto-createHash'] = 'ok'
} catch (e: unknown) {
  checks['crypto-createHash'] = e instanceof Error ? e.message : String(e)
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ imports: checks })
}
