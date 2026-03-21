import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || ''
const CRON_SECRET = (process.env.CRON_SECRET || '').trim()

const BUILD_EPISODE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/build-episode`
  : 'http://localhost:3000/api/build-episode'

interface UserForEpisode {
  id: string
  tone: string
  length: string
  default_voice: string
  cadence: string
  delivery_time: string
}

export async function getUsersDueForEpisode(
  windowStart: string,
  windowEnd: string,
  today: string,
  isWeekend: boolean,
): Promise<UserForEpisode[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('profiles')
    .select('id, tone, length, default_voice, cadence, delivery_time, last_episode_date')
    .gte('delivery_time', windowStart)
    .lt('delivery_time', windowEnd)

  if (error || !data) return []

  return data.filter(u => {
    if (u.last_episode_date === today) return false
    if (u.cadence === 'weekly' && !isWeekend) return false
    return true
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!anthropicApiKey) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured. Episode generation requires an API key.' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const isWeekend = now.getDay() === 0 || now.getDay() === 6

  const hours = now.getUTCHours().toString().padStart(2, '0')
  const minutes = now.getUTCMinutes()
  const windowStart = `${hours}:${(Math.floor(minutes / 15) * 15).toString().padStart(2, '0')}`
  const windowEndMin = Math.floor(minutes / 15) * 15 + 15
  const windowEnd = windowEndMin >= 60
    ? `${(parseInt(hours) + 1).toString().padStart(2, '0')}:00`
    : `${hours}:${windowEndMin.toString().padStart(2, '0')}`

  const users = await getUsersDueForEpisode(windowStart, windowEnd, today, isWeekend)

  const results = await Promise.allSettled(
    users.map(async (user) => {
      const { data: topics } = await supabase
        .from('user_topics')
        .select('topic_id, weight, pinned, voice_override, sort_order, custom_tags')
        .eq('user_id', user.id)
        .order('sort_order')

      if (!topics || topics.length === 0) return { userId: user.id, status: 'skipped' }

      const response = await fetch(BUILD_EPISODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: user.tone || 'mixed',
          length: user.length || 'standard',
          default_voice: user.default_voice || 'anchor',
          topics,
        }),
      })

      if (!response.ok) return { userId: user.id, status: 'failed' }

      const data = await response.json()
      const episode = data.episode

      // Don't save episodes that are entirely fallback content
      const stats = data.cache_stats
      if (stats && stats.fallbacks > 0 && stats.hits === 0 && stats.misses === 0) {
        return { userId: user.id, status: 'skipped_all_fallback' }
      }

      const episodeId = crypto.randomUUID()
      await supabase.from('episodes').insert({
        id: episodeId,
        user_id: user.id,
        title: episode.title,
        date: today,
        cadence: episode.cadence,
        tone: episode.tone,
        estimated_minutes: episode.estimated_minutes,
        show_notes: episode.show_notes,
        status: 'ready',
      })

      const segments = episode.segments.map((s: any, i: number) => ({
        id: crypto.randomUUID(),
        episode_id: episodeId,
        topic_id: s.topic_id,
        segment_type: s.segment_type,
        title: s.title,
        voice: s.voice,
        start_time_seconds: s.start_time_seconds,
        duration_seconds: s.duration_seconds,
        script: s.script,
        sources: s.sources,
        sort_order: i,
      }))

      await supabase.from('episode_segments').insert(segments)
      await supabase.from('profiles').update({ last_episode_date: today }).eq('id', user.id)

      return { userId: user.id, status: 'generated', episodeId }
    })
  )

  const summary = {
    time: now.toISOString(),
    window: `${windowStart}-${windowEnd}`,
    usersQueried: users.length,
    results: results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { userId: users[i]?.id, status: 'error' }
    ),
  }

  return res.status(200).json(summary)
}
