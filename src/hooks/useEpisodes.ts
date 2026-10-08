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
  /** Episode currently being watched, so polling can resume after the tab wakes. */
  const watchingRef = useRef<string | null>(null)

  /** Stop the status poll but leave the overall deadline running. */
  const clearPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
  }, [])

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    pollRef.current = null
    timeoutRef.current = null
    watchingRef.current = null
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

  /**
   * Watch an episode's status.
   *
   * Display only. The server chains gathering → script → audio itself, so
   * this never advances the pipeline and the page can be closed mid-run
   * without stranding the episode.
   */
  const pollStatus = useCallback(
    (episodeId: string) => {
      if (!session) return
      watchingRef.current = episodeId

      const check = async () => {
        try {
          const res = await fetch(`/api/generate/status/${episodeId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (!res.ok) return
          const data = await res.json()

          if (data.status === 'failed') {
            clearTimers()
            setGeneration({
              generating: false,
              status: 'failed',
              stageProgress: null,
              error: data.error_message || 'Generation failed',
            })
            fetchToday()
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

          setGeneration((prev) => ({
            ...prev,
            generating: true,
            status: data.status,
            stageProgress: data.stage_progress,
          }))
        } catch {
          // Keep watching through transient network errors.
        }
      }

      clearPoll()
      pollRef.current = setInterval(check, POLL_INTERVAL)
      check()
    },
    [session, clearPoll, clearTimers, fetchToday]
  )

  // iOS suspends timers when the tab is backgrounded or the phone locks, so
  // the interval can be frozen for minutes. Re-sync as soon as we're visible
  // again rather than waiting for the next tick that may never come.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const episodeId = watchingRef.current
      if (episodeId) pollStatus(episodeId)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [pollStatus])

  // Reattach to an episode still in flight — after a reload, or when the
  // generation was kicked off on another device.
  useEffect(() => {
    if (!todayEpisode || watchingRef.current) return
    const inFlight = ['pending', 'gathering', 'building', 'scripting', 'voicing']
    if (!inFlight.includes(todayEpisode.status)) return

    setGeneration({
      generating: true,
      status: todayEpisode.status,
      stageProgress: todayEpisode.stage_progress,
      error: null,
    })
    pollStatus(todayEpisode.id)
  }, [todayEpisode, pollStatus])

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
        // Prefer human-readable reason (e.g. quota messages) over error code
        throw new Error(errData.reason || errData.error || 'Failed to start generation')
      }
      const { episode_id } = await res.json()

      // Stop watching after a while. The run itself continues on the server
      // and the sweeper finishes or fails it, so this only ends the live view.
      timeoutRef.current = setTimeout(() => {
        clearTimers()
        setGeneration((prev) => ({
          ...prev,
          generating: false,
          error:
            'Still working on this one. It finishes on our servers — reload in a minute to check.',
        }))
      }, GENERATION_TIMEOUT)

      pollStatus(episode_id)
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
