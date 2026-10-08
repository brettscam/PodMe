import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient } from '../lib/supabase'
import { triggerStage, IN_FLIGHT_STATUSES } from '../lib/pipeline'

/**
 * Safety net for the generation pipeline.
 *
 * Stages chain themselves server-side, but a function can still time out or
 * crash between handoffs. This sweeper re-dispatches episodes that stalled and
 * fails the ones that are past saving, so nothing sits "generating" forever.
 *
 * Failed episodes don't count against the weekly quota (see
 * getWeeklyEpisodeCount), so marking a dead episode failed also returns the
 * user's slot.
 */

/**
 * Leave an episode alone this long before assuming the chain dropped it.
 *
 * Must clear the worst case for a healthy run, or we re-trigger a stage that
 * is still working and end up generating the same episode twice. The three
 * stages cap at 120s each, so ~6 minutes is the ceiling; 8 gives headroom.
 */
const STALL_MINUTES = 8

/** Past this, stop retrying and mark it failed. */
const DEAD_MINUTES = 25

interface StalledEpisode {
  id: string
  status: string
  transcript: string | null
  metadata: { stories?: unknown } | null
  created_at: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return res.status(500).json({ error: 'CRON_SECRET is not configured' })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()
  const now = Date.now()
  const stalledBefore = new Date(now - STALL_MINUTES * 60_000).toISOString()
  const deadBefore = new Date(now - DEAD_MINUTES * 60_000).toISOString()

  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('id, status, transcript, metadata, created_at')
      .in('status', IN_FLIGHT_STATUSES)
      .lt('created_at', stalledBefore)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('sweep-episodes query failed:', error.message)
      return res.status(500).json({ error: 'Query failed' })
    }

    const episodes = (data ?? []) as StalledEpisode[]
    let resumed = 0
    let failed = 0

    for (const ep of episodes) {
      const isDead = ep.created_at < deadBefore

      if (isDead) {
        await supabase
          .from('episodes')
          .update({
            status: 'failed',
            error_message:
              'Generation stalled and could not be recovered. This episode does not count against your weekly limit — please try again.',
            stage_progress: null,
          })
          .eq('id', ep.id)
        failed++
        continue
      }

      // Re-dispatch from whichever stage actually has its inputs ready.
      if (ep.transcript) {
        triggerStage('audio', ep.id)
        resumed++
      } else if (ep.metadata?.stories) {
        triggerStage('script', ep.id)
        resumed++
      }
      // No metadata yet means /api/generate itself never finished. There is
      // nothing to resume from, so let it age out into the failed branch.
    }

    return res.status(200).json({
      checked: episodes.length,
      resumed,
      failed,
    })
  } catch (err) {
    console.error('sweep-episodes error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
