import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Episode, UserTopic, Tone, Length, BuildEpisodeResponse } from '../lib/types'
import { supabase } from '../lib/supabase'
import type { PipelineStep } from '../lib/pipeline'
import { createBuildSteps } from '../lib/pipeline'

export interface EpisodeBuildProgress {
  status: 'idle' | 'loading_db' | 'building' | 'complete' | 'error'
  steps: PipelineStep[]
  currentStepId: string | null
  startedAt: number | null
  error: string | null
}

interface UseEpisodeBuilderResult {
  currentEpisode: Episode | null
  pastEpisodes: Episode[]
  loading: boolean
  error: string | null
  buildProgress: EpisodeBuildProgress
  cacheStats: { hits: number; misses: number; fallbacks: number } | null
  refresh: () => void
}

/**
 * Loads today's episode from Supabase if available.
 * Falls back to calling build-episode API only if no cached episode exists.
 * Now with step-by-step pipeline tracking.
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
  const [buildProgress, setBuildProgress] = useState<EpisodeBuildProgress>({
    status: 'idle', steps: [], currentStepId: null, startedAt: null, error: null,
  })
  const abortRef = useRef<AbortController | null>(null)
  const hasFetchedRef = useRef(false)

  // Stabilize topics reference — only change when the actual data changes
  const topicsKey = useMemo(
    () => topics ? JSON.stringify(topics.map(t => ({ id: t.topic_id, w: t.weight, p: t.pinned, tags: t.custom_tags }))) : '',
    [topics],
  )

  const updateStep = useCallback((stepId: string, update: Partial<PipelineStep>) => {
    setBuildProgress(prev => ({
      ...prev,
      currentStepId: update.status === 'running' ? stepId : prev.currentStepId,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, ...update } : s),
    }))
  }, [])

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

    const steps = createBuildSteps()
    const startedAt = Date.now()

    setLoading(true)
    setError(null)
    setBuildProgress({
      status: 'building',
      steps,
      currentStepId: 'health_check',
      startedAt,
      error: null,
    })

    try {
      // Step 1: Health check
      updateStep('health_check', { status: 'running', startedAt: Date.now() })
      try {
        const healthRes = await fetch('/api/health', { signal: controller.signal })
        const healthData = await healthRes.json()

        if (!healthData.pipeline_ready?.can_build_episode) {
          const broken = Object.entries(healthData.services || {})
            .filter(([, v]) => (v as { status: string }).status !== 'ok')
            .map(([k, v]) => `${k}: ${(v as { error?: string }).error || 'failed'}`)
          throw new Error(`Pipeline not ready — ${broken.join('; ')}`)
        }
        updateStep('health_check', { status: 'success', completedAt: Date.now() })
      } catch (healthErr) {
        // Health check is best-effort; log but continue
        if (healthErr instanceof Error && healthErr.name === 'AbortError') throw healthErr
        updateStep('health_check', {
          status: 'error',
          completedAt: Date.now(),
          error: healthErr instanceof Error ? healthErr.message : 'Health check failed',
        })
        // If it's a hard pipeline failure, stop
        if (healthErr instanceof Error && healthErr.message.includes('Pipeline not ready')) {
          throw healthErr
        }
      }

      // Steps 2-5: build-episode API handles these internally
      updateStep('fetch_rss', { status: 'running', startedAt: Date.now() })

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
        const errMsg = errBody.error || `API error: ${response.status}`

        // Mark the appropriate step as failed based on error
        if (errMsg.includes('RSS') || errMsg.includes('articles')) {
          updateStep('fetch_rss', { status: 'error', completedAt: Date.now(), error: errMsg })
        } else if (errMsg.includes('Script') || errMsg.includes('ANTHROPIC')) {
          updateStep('fetch_rss', { status: 'success', completedAt: Date.now() })
          updateStep('generate_scripts', { status: 'error', completedAt: Date.now(), error: errMsg })
        } else {
          updateStep('fetch_rss', { status: 'error', completedAt: Date.now(), error: errMsg })
        }
        throw new Error(errMsg)
      }

      // Mark all build steps as success
      updateStep('fetch_rss', { status: 'success', completedAt: Date.now() })
      updateStep('generate_scripts', { status: 'success', completedAt: Date.now() })
      updateStep('polish_episode', { status: 'success', completedAt: Date.now() })
      updateStep('save_episode', { status: 'success', completedAt: Date.now() })

      const data: BuildEpisodeResponse = await response.json()
      setServerEpisode(data.episode)
      setCacheStats(data.cache_stats)

      setBuildProgress(prev => ({
        ...prev,
        status: 'complete',
        currentStepId: null,
      }))
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Episode generation failed:', err)
      const errMsg = err instanceof Error ? err.message : 'Failed to build episode'
      setError(errMsg)
      setServerEpisode(null)
      setBuildProgress(prev => ({
        ...prev,
        status: 'error',
        error: errMsg,
      }))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey, tone, length, userId, updateStep])

  // On mount: try DB first, fall back to build-episode API
  useEffect(() => {
    if (hasFetchedRef.current) return
    if (!topics || topics.length === 0) return
    hasFetchedRef.current = true

    setLoading(true)
    setBuildProgress(prev => ({ ...prev, status: 'loading_db' }))

    loadFromDb().then(found => {
      if (found) {
        setLoading(false)
        setBuildProgress(prev => ({ ...prev, status: 'complete' }))
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
    buildProgress,
    cacheStats,
    refresh: () => buildEpisode(true),
  }
}
