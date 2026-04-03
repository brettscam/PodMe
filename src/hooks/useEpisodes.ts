import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Episode, EpisodeWithSources, EpisodeStatus } from '../lib/types'

const POLL_INTERVAL = 3000
const GENERATION_TIMEOUT = 5 * 60 * 1000 // 5 minutes

interface GenerationState {
  generating: boolean
  status: EpisodeStatus | null
  stageProgress: string | null
  error: string | null
}

function authHeaders(session: Session) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

export function useEpisodes(session: Session | null) {
  const [todayEpisode, setTodayEpisode] = useState<EpisodeWithSources | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loadingToday, setLoadingToday] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [generation, setGeneration] = useState<GenerationState>({
    generating: false,
    status: null,
    stageProgress: null,
    error: null,
  })
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    pollRef.current = null
    timeoutRef.current = null
  }, [])

  // Fetch today's episode
  const fetchToday = useCallback(async () => {
    if (!session) return
    setLoadingToday(true)
    try {
      const res = await fetch('/api/episodes/today', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.status === 404) {
        setTodayEpisode(null)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch today\'s episode')
      const data = await res.json()
      setTodayEpisode(data)
    } catch {
      setTodayEpisode(null)
    } finally {
      setLoadingToday(false)
    }
  }, [session])

  // Fetch episode list (paginated)
  const fetchEpisodes = useCallback(
    async (pageNum: number, append = false) => {
      if (!session) return
      setLoadingList(true)
      try {
        const res = await fetch(`/api/episodes?page=${pageNum}&limit=10`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch episodes')
        const data: Episode[] = await res.json()
        if (data.length < 10) setHasMore(false)
        setEpisodes((prev) => (append ? [...prev, ...data] : data))
      } catch {
        // silently fail for list
      } finally {
        setLoadingList(false)
      }
    },
    [session]
  )

  useEffect(() => {
    fetchToday()
    fetchEpisodes(0)
  }, [fetchToday, fetchEpisodes])

  const loadMore = useCallback(() => {
    const next = page + 1
    setPage(next)
    fetchEpisodes(next, true)
  }, [page, fetchEpisodes])

  // Poll generation status
  const pollStatus = useCallback(
    (episodeId: string, nextStage: 'script' | 'audio' | 'done') => {
      if (!session) return

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/generate/status/${episodeId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (!res.ok) return
          const data = await res.json()

          setGeneration((prev) => ({
            ...prev,
            status: data.status,
            stageProgress: data.stage_progress,
          }))

          if (data.status === 'failed') {
            clearTimers()
            setGeneration((prev) => ({
              ...prev,
              generating: false,
              error: data.error_message || 'Generation failed',
            }))
            return
          }

          if (data.status === 'ready') {
            clearTimers()
            setGeneration({
              generating: false,
              status: 'ready',
              stageProgress: null,
              error: null,
            })
            fetchToday()
            return
          }

          // Stage transitions
          if (nextStage === 'script' && data.status === 'building' && data.title) {
            // Metadata exists, trigger script generation
            clearTimers()
            try {
              await fetch('/api/generate/script', {
                method: 'POST',
                headers: authHeaders(session),
                body: JSON.stringify({ episode_id: episodeId }),
              })
              setGeneration((prev) => ({
                ...prev,
                status: 'scripting',
                stageProgress: 'Writing script...',
              }))
              pollStatus(episodeId, 'audio')
            } catch {
              setGeneration((prev) => ({
                ...prev,
                generating: false,
                error: 'Failed to start script generation',
              }))
            }
            return
          }

          if (nextStage === 'audio' && data.status === 'scripting' && data.transcript) {
            // Script done, trigger audio
            clearTimers()
            try {
              await fetch('/api/generate/audio', {
                method: 'POST',
                headers: authHeaders(session),
                body: JSON.stringify({ episode_id: episodeId }),
              })
              setGeneration((prev) => ({
                ...prev,
                status: 'voicing',
                stageProgress: 'Generating audio...',
              }))
              pollStatus(episodeId, 'done')
            } catch {
              setGeneration((prev) => ({
                ...prev,
                generating: false,
                error: 'Failed to start audio generation',
              }))
            }
            return
          }
        } catch {
          // continue polling on network errors
        }
      }, POLL_INTERVAL)
    },
    [session, clearTimers, fetchToday]
  )

  // Start generation
  const generateNow = useCallback(async () => {
    if (!session) return
    clearTimers()
    setGeneration({
      generating: true,
      status: 'gathering',
      stageProgress: 'Starting generation...',
      error: null,
    })

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: authHeaders(session),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to start generation')
      }
      const { episode_id } = await res.json()

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        clearTimers()
        setGeneration((prev) => ({
          ...prev,
          generating: false,
          error: 'Generation timed out after 5 minutes',
        }))
      }, GENERATION_TIMEOUT)

      // Start polling
      pollStatus(episode_id, 'script')
    } catch (err) {
      setGeneration((prev) => ({
        ...prev,
        generating: false,
        error: err instanceof Error ? err.message : 'Generation failed',
      }))
    }
  }, [session, clearTimers, pollStatus])

  // Play a specific episode (load it as "today")
  const playEpisode = useCallback(
    async (episodeId: string) => {
      if (!session) return
      try {
        const res = await fetch(`/api/episodes/${episodeId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('Failed to load episode')
        const data = await res.json()
        setTodayEpisode(data)
      } catch {
        // ignore
      }
    },
    [session]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  return {
    todayEpisode,
    episodes,
    loadingToday,
    loadingList,
    generating: generation.generating,
    generationStatus: generation.status,
    generationStageProgress: generation.stageProgress,
    generationError: generation.error,
    generateNow,
    loadMore,
    hasMore,
    playEpisode,
    refetchToday: fetchToday,
  }
}
