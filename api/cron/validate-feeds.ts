import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient } from '../lib/supabase'
import { parseRssFeed, articleAgeDays } from '../lib/rss-parser'

/**
 * Prove which pooled feeds actually work.
 *
 * The pool was seeded from knowledge, not from fetching, so `is_valid` has
 * been true for everything since day one and `last_validated_at` only ever
 * meant "row inserted". This is what makes those columns honest.
 *
 * A feed is retired when it is unreachable, unparseable, or dormant. Dormant
 * matters as much as broken: a feed that stopped publishing months ago still
 * returns HTTP 200 and still parses, and its stale items are exactly what
 * leaks old news into a daily briefing.
 */

/** Re-check a feed at most this often. */
const RECHECK_AFTER_HOURS = 24

/** Feeds per run. Keeps the invocation inside its time budget. */
const BATCH_SIZE = 25

/** No item newer than this means the feed has gone quiet. */
const DORMANT_AFTER_DAYS = 45

const FETCH_TIMEOUT_MS = 10_000

interface PoolRow {
  id: string
  url: string
  name: string
  kind: string
  is_valid: boolean
}

type Verdict =
  | { ok: true; newestAgeDays: number | null; itemCount: number }
  | { ok: false; reason: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return res.status(500).json({ error: 'CRON_SECRET is not configured' })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()
  const staleBefore = new Date(Date.now() - RECHECK_AFTER_HOURS * 3_600_000).toISOString()

  try {
    // Never-validated rows first (last_validated_at nulls first), then the
    // least recently checked.
    const { data, error } = await supabase
      .from('feed_pool')
      .select('id, url, name, kind, is_valid')
      .or(`last_validated_at.is.null,last_validated_at.lt.${staleBefore}`)
      .order('last_validated_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE)

    if (error) {
      console.error('validate-feeds query failed:', error.message)
      return res.status(500).json({ error: 'Query failed' })
    }

    const feeds = (data ?? []) as PoolRow[]
    const verdicts = await Promise.all(
      feeds.map(async (feed) => ({ feed, verdict: await checkFeed(feed) })),
    )

    const now = new Date().toISOString()
    let revived = 0
    let retired = 0

    await Promise.all(
      verdicts.map(({ feed, verdict }) => {
        const nextValid = verdict.ok
        if (nextValid && !feed.is_valid) revived++
        if (!nextValid && feed.is_valid) retired++

        return supabase
          .from('feed_pool')
          .update({
            is_valid: nextValid,
            last_validated_at: now,
            description: verdict.ok
              ? undefined
              : `[auto-retired: ${verdict.reason}]`,
          })
          .eq('id', feed.id)
      }),
    )

    const failures = verdicts
      .filter((v) => !v.verdict.ok)
      .map((v) => ({
        name: v.feed.name,
        url: v.feed.url,
        reason: (v.verdict as { ok: false; reason: string }).reason,
      }))

    return res.status(200).json({
      checked: feeds.length,
      healthy: feeds.length - failures.length,
      retired,
      revived,
      failures,
    })
  } catch (err) {
    console.error('validate-feeds error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function checkFeed(feed: PoolRow): Promise<Verdict> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const userAgent =
      feed.kind === 'reddit'
        ? 'web:com.puckpuck.app:v1.0 (by /u/puckpuck-bot)'
        : 'PuckPuck/1.0 (+https://puckpuck.ai) RSS Reader'

    const response = await fetch(feed.url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` }

    const xml = await response.text()
    const articles = parseRssFeed(xml, feed.name, 3)

    if (articles.length === 0) {
      return { ok: false, reason: 'parsed but contained no items' }
    }

    // Newest item's age tells us whether the feed is still publishing.
    const ages = articles
      .map((a) => articleAgeDays(a))
      .filter((n): n is number => n !== null)

    if (ages.length === 0) {
      // Undated feeds can't be assessed for dormancy. Reachable and parseable
      // is the most we can confirm, so accept rather than retire.
      return { ok: true, newestAgeDays: null, itemCount: articles.length }
    }

    const newest = Math.min(...ages)
    if (newest > DORMANT_AFTER_DAYS) {
      return { ok: false, reason: `dormant — newest item is ${newest} days old` }
    }

    return { ok: true, newestAgeDays: newest, itemCount: articles.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      reason: message.includes('abort') ? 'timed out' : `unreachable: ${message}`,
    }
  }
}
