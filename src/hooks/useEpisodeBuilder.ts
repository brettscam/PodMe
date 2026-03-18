import { useState, useEffect, useCallback, useRef } from 'react'
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
 * Calls the build-episode API to generate a fresh episode.
 * No local fallback — if the API fails, the error is surfaced to the user.
 */
export function useEpisodeBuilder(
  topics: UserTopic[] | undefined,
  tone: Tone,
  length: Length,
  _defaultVoice: string,
  userId?: string,
): UseEpisodeBuilderResult {
  const [serverEpisode, setServerEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; fallbacks: number } | null>(null)
  const [dbPastEpisodes, setDbPastEpisodes] = useState<Episode[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const fetchEpisode = useCallback(async (forceRefresh = false) => {
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

      const body: Record<string, unknown> = { tone, length, topics: topicsPayload }
      if (forceRefresh) body.force_refresh = true

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

      // Reject episodes that are entirely fallback content
      if (data.cache_stats && data.cache_stats.fallbacks > 0 && data.cache_stats.hits === 0 && data.cache_stats.misses === 0) {
        throw new Error(`Content fetch failed for all ${data.cache_stats.fallbacks} topics. No fresh content available.`)
      }

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
  }, [topics, tone, length, userId])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchEpisode()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [fetchEpisode])

  // Load past episodes from DB
  useEffect(() => {
    if (!userId) return
    supabase
      .from('episodes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ready')
      .order('date', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setDbPastEpisodes(data)
      })
  }, [userId])

  return {
    currentEpisode: serverEpisode,
    pastEpisodes: dbPastEpisodes,
    loading,
    error,
    cacheStats,
    refresh: () => fetchEpisode(true),
  }
}
