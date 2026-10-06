import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { apiRequest, ApiError } from '../lib/api'
import type { Episode, EpisodeWithSources, EpisodeStatus } from '../lib/types'

const POLL_INTERVAL = 3000
const GENERATION_TIMEOUT = 5 * 60 * 1000

type NextStage = 'script' | 'audio' | 'done'

interface StatusResponse {
  status: EpisodeStatus
  stage_progress: string | null
  title?: string | null
  transcript?: string | null
  error_message?: string | null
}

export function useEpisodes(session: Session | null) {
  const [todayEpisode, setTodayEpisode] = useState<EpisodeWithSources | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loadingToday, setLoadingToday] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<EpisodeStatus | null>(null)
  const [stageProgress, setStageProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quotaBlocked, setQuotaBlocked] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    pollRef.current = null
    timeoutRef.current = null
  }, [])

  const fetchToday = useCallback(async () => {
    if (!session) return
    setLoadingToday(true)
    try {
      const data = await apiRequest<EpisodeWithSources>('/api/episodes/today')
      setTodayEpisode(data)
    } catch (err) {
      // 404 just means nothing generated yet today.
      if (err instanceof ApiError && err.status === 404) setTodayEpisode(null)
      else setTodayEpisode(null)
    } finally {
      setLoadingToday(false)
    }
  }, [session])

  const fetchEpisodes = useCallback(
    async (page: number, append = false) => {
      if (!session) return
      setLoadingList(true)
      try {
        const data = await apiRequest<Episode[]>(`/api/episodes?page=${page}&limit=20`)
        setEpisodes((prev) => (append ? [...prev, ...data] : data))
      } catch {
        if (!append) setEpisodes([])
      } finally {
        setLoadingList(false)
      }
    },
    [session],
  )

  useEffect(() => {
    if (!session) return
    fetchToday()
    fetchEpisodes(0)
  }, [session, fetchToday, fetchEpisodes])

  useEffect(() => clearTimers, [clearTimers])

  const pollStatus = useCallback(
    (episodeId: string, nextStage: NextStage) => {
      pollRef.current = setInterval(async () => {
        try {
          const data = await apiRequest<StatusResponse>(
            `/api/generate/status/${episodeId}`,
          )

          setStatus(data.status)
          setStageProgress(data.stage_progress)

          if (data.status === 'failed') {
            clearTimers()
            setGenerating(false)
            setError(data.error_message || 'Generation failed')
            return
          }

          if (data.status === 'ready') {
            clearTimers()
            setGenerating(false)
            setStageProgress(null)
            fetchToday()
            fetchEpisodes(0)
            return
          }

          // Advance the pipeline when the previous stage has produced output.
          if (nextStage === 'script' && data.status === 'building' && data.title) {
            clearTimers()
            setStatus('scripting')
            setStageProgress('Writing script…')
            await apiRequest('/api/generate/script', {
              method: 'POST',
              body: { episode_id: episodeId },
            })
            pollStatus(episodeId, 'audio')
            return
          }

          if (nextStage === 'audio' && data.status === 'scripting' && data.transcript) {
            clearTimers()
            setStatus('voicing')
            setStageProgress('Generating audio…')
            await apiRequest('/api/generate/audio', {
              method: 'POST',
              body: { episode_id: episodeId },
            })
            pollStatus(episodeId, 'done')
            return
          }
        } catch {
          // Keep polling through transient network errors.
        }
      }, POLL_INTERVAL)
    },
    [clearTimers, fetchToday, fetchEpisodes],
  )

  const generateNow = useCallback(async () => {
    if (!session) return
    clearTimers()
    setGenerating(true)
    setError(null)
    setQuotaBlocked(false)
    setStatus('gathering')
    setStageProgress('Starting…')

    try {
      const { episode_id } = await apiRequest<{ episode_id: string }>('/api/generate', {
        method: 'POST',
      })

      timeoutRef.current = setTimeout(() => {
        clearTimers()
        setGenerating(false)
        setError('Generation timed out after 5 minutes')
      }, GENERATION_TIMEOUT)

      pollStatus(episode_id, 'script')
    } catch (err) {
      setGenerating(false)
      setStatus(null)
      setStageProgress(null)
      if (err instanceof ApiError && err.isQuotaExceeded) {
        setQuotaBlocked(true)
        setError(err.reason ?? 'Weekly limit reached')
      } else {
        setError(err instanceof Error ? err.message : 'Generation failed')
      }
    }
  }, [session, clearTimers, pollStatus])

  const loadEpisode = useCallback(
    async (episodeId: string) => {
      if (!session) return
      try {
        const data = await apiRequest<EpisodeWithSources>(`/api/episodes/${episodeId}`)
        setTodayEpisode(data)
      } catch {
        // leave current episode in place
      }
    },
    [session],
  )

  return {
    todayEpisode,
    episodes,
    loadingToday,
    loadingList,
    generating,
    status,
    stageProgress,
    error,
    quotaBlocked,
    generateNow,
    loadEpisode,
    refetchToday: fetchToday,
    refetchEpisodes: fetchEpisodes,
  }
}
