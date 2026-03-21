import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Episode, UserTopic, Tone, Length, BuildEpisodeResponse } from '../lib/types'
import { supabase } from '../lib/supabase'

interface UseEpisodeBuilderResult {
  currentEpisode: Episode | null
  pastEpisodes: Episode[]
  loading: boolean
  error: string | null
  cacheStats: { hits: number; misses: number; fallbacks: number } | null
  refresh: () => void
}

/**
 * Loads today's episode from Supabase if available.
 * Falls back to calling build-episode API only if no cached episode exists.
 */
export function useEpisodeBuilder(
  topics: UserTopic[] | undefined,
  tone: Tone,
  length: Length,
  defaultVoice: string,
  userId?: string,
): UseEpisodeBuilderResult {
  const [serverEpisode, setServerEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; fallbacks: number } | null>(null)
  const [dbPastEpisodes, setDbPastEpisodes] = useState<Episode[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const hasFetchedRef = useRef(false)

  // Stabilize topics reference — only change when the actual data changes
  const topicsKey = useMemo(
    () => topics ? JSON.stringify(topics.map(t => ({ id: t.topic_id, w: t.weight, p: t.pinned, tags: t.custom_tags }))) : '',
    [topics],
  )

  const loadFromDb = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    const today = new Date().toISOString().split('T')[0]

    const { data: episode } = await supabase
      .from('episodes')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!episode) return false

    const { data: segments } = await supabase
      .from('episode_segments')
      .select('*')
      .eq('episode_id', episode.id)
      .order('sort_order', { ascending: true })

    if (!segments || segments.length === 0) return false

    setServerEpisode({
      ...episode,
      segments,
    })
    return true
  }, [userId])

  const buildEpisode = useCallback(async (forceRefresh = false) => {
    if (!topics || topics.length === 0) return

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const topicsPayload = topics.map(t => ({
        topic_id: t.topic_id,
        weight: t.weight,
        pinned: t.pinned,
        voice_override: t.voice_override,
        sort_order: t.sort_order,
        custom_tags: t.custom_tags || [],
      }))

      const body: Record<string, unknown> = { tone, length, default_voice: defaultVoice, topics: topicsPayload }
      if (forceRefresh) body.force_refresh = true
      if (userId) body.user_id = userId

      const response = await fetch('/api/build-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.error || `API error: ${response.status}`)
      }

      const data: BuildEpisodeResponse = await response.json()
      setServerEpisode(data.episode)
      setCacheStats(data.cache_stats)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Episode generation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to build episode')
      setServerEpisode(null)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey, tone, length, userId])

  // On mount: try DB first, fall back to build-episode API
  useEffect(() => {
    if (hasFetchedRef.current) return
    if (!topics || topics.length === 0) return
    hasFetchedRef.current = true

    setLoading(true)
    loadFromDb().then(found => {
      if (found) {
        setLoading(false)
      } else {
        buildEpisode()
      }
    }).catch(() => {
      buildEpisode()
    })

    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey, userId])

  // Load past episodes from DB (with their segments)
  useEffect(() => {
    if (!userId) return
    supabase
      .from('episodes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ready')
      .order('date', { ascending: false })
      .limit(10)
      .then(async ({ data }) => {
        if (!data || data.length === 0) return
        // Load segments for each past episode
        const episodesWithSegments = await Promise.all(
          data.map(async (ep) => {
            const { data: segments } = await supabase
              .from('episode_segments')
              .select('*')
              .eq('episode_id', ep.id)
              .order('sort_order', { ascending: true })
            return { ...ep, segments: segments || [] }
          })
        )
        setDbPastEpisodes(episodesWithSegments)
      })
  }, [userId])

  return {
    currentEpisode: serverEpisode,
    pastEpisodes: dbPastEpisodes,
    loading,
    error,
    cacheStats,
    refresh: () => buildEpisode(true),
  }
}
