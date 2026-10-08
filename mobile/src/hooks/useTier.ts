import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { apiRequest } from '../lib/api'
import type { Tier, TierInfo } from '../lib/types'

export function useTier(session: Session | null) {
  const [info, setInfo] = useState<TierInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!session) {
      setInfo(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setInfo(await apiRequest<TierInfo>('/api/me'))
    } catch {
      setInfo(null)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    refetch()
  }, [refetch])

  const tier: Tier = info?.tier ?? 'free'
  const episodeLimit = info?.limits.episodesPerWeek ?? null
  const episodeUsed = info?.usage.episodesThisWeek ?? 0

  return {
    tier,
    info,
    loading,
    episodeLimit,
    episodeUsed,
    atEpisodeLimit: episodeLimit !== null && episodeUsed >= episodeLimit,
    customTopicLimit: info?.limits.customTopics ?? null,
    customTopicUsed: info?.usage.customTopics ?? 0,
    refetch,
  }
}
