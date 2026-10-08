import { waitUntil } from '@vercel/functions'
import { INTERNAL_SECRET_HEADER } from './supabase'

export type Stage = 'script' | 'audio'

/** Episode statuses that mean work is still outstanding. */
export const IN_FLIGHT_STATUSES = [
  'pending',
  'gathering',
  'building',
  'scripting',
  'voicing',
] as const

/**
 * Where to send the next stage.
 *
 * VERCEL_URL comes first on purpose: it addresses the *current* deployment, so
 * a preview chains within itself. APP_URL points at the production alias,
 * which is right for user-facing redirects but would make preview traffic
 * leak into production mid-pipeline.
 */
function baseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.APP_URL || 'http://localhost:3000'
}

/**
 * Hand an episode to the next stage without blocking the HTTP response.
 *
 * Generation used to be chained by the browser: the page polled for status
 * and fired the next endpoint itself. That made the tab the orchestrator, so
 * backgrounding it stranded the episode — fatal on iOS, where WebKit suspends
 * timers outright when the user locks the phone or switches apps.
 *
 * Now each stage triggers the next here. waitUntil keeps this invocation alive
 * just long enough to dispatch the request; the next stage runs as its own
 * invocation with its own time budget, so it survives this one exiting.
 *
 * Best-effort by design. If the dispatch fails the episode stays in its
 * current status and the cron sweeper picks it up.
 */
export function triggerStage(stage: Stage, episodeId: string): void {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error(`Cannot chain to ${stage}: CRON_SECRET is not configured`)
    return
  }

  const url = `${baseUrl()}/api/generate/${stage}`

  const dispatch = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [INTERNAL_SECRET_HEADER]: secret,
    },
    body: JSON.stringify({ episode_id: episodeId }),
  })
    .then((res) => {
      if (!res.ok) {
        console.error(`Chain to ${stage} returned ${res.status} for ${episodeId}`)
      }
    })
    .catch((err) => {
      console.error(`Chain to ${stage} failed for ${episodeId}:`, err?.message ?? err)
    })

  try {
    waitUntil(dispatch)
  } catch {
    // waitUntil needs a Vercel request context, which the local dev server
    // doesn't provide. The dispatch is already in flight either way.
  }
}
