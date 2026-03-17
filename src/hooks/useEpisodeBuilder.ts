import { useState, useEffect, useCallback, useRef } from 'react'
import type { Episode, UserTopic, Tone, Length, BuildEpisodeResponse } from '../lib/types'
import { buildEpisodeFromTopics, PAST_EPISODES } from '../lib/constants'

interface UseEpisodeBuilderResult {
  currentEpisode: Episode
  pastEpisodes: Episode[]
  loading: boolean
  error: string | null
  cacheStats: { hits: number; misses: number; fallbacks: number } | null
  refresh: () => void
}

/**
 * Replaces useEpisodes with an async version that queries the build-episode API.
 * Falls back to local buildEpisodeFromTopics if the API is unavailable.
 */
export function useEpisodeBuilder(
  topics: UserTopic[] | undefined,
  tone: Tone,
  length: Length,
  defaultVoice: string,
): UseEpisodeBuilderResult {
  const [serverEpisode, setServerEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; fallbacks: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Local fallback — always available synchronously
  const localEpisode = topics && topics.length > 0
    ? buildEpisodeFromTopics(topics, defaultVoice)
    : null

  const fetchEpisode = useCallback(async () => {
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
      }))

      const response = await fetch('/api/build-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, length, topics: topicsPayload }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: BuildEpisodeResponse = await response.json()
      setServerEpisode(data.episode)
      setCacheStats(data.cache_stats)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.warn('build-episode API unavailable, using local fallback:', err)
      setError(err instanceof Error ? err.message : 'Failed to build episode')
      // Server episode stays null — we'll use local fallback
    } finally {
      setLoading(false)
    }
  }, [topics, tone, length])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchEpisode()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [fetchEpisode])

  // Use server episode if available, otherwise local fallback
  const currentEpisode: Episode = serverEpisode || localEpisode || {
    title: 'Your Morning Brief',
    date: new Date().toISOString().split('T')[0],
    cadence: 'daily',
    tone,
    estimated_minutes: 0,
    status: 'pending',
    segments: [],
  }

  return {
    currentEpisode,
    pastEpisodes: PAST_EPISODES,
    loading,
    error,
    cacheStats,
    refresh: fetchEpisode,
  }
}
