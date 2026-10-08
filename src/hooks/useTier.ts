import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Tier, TierInfo } from '../lib/types'

export function useTier(session: Session | null) {
  const [info, setInfo] = useState<TierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!session) {
      setInfo(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to load plan')
      const data = (await res.json()) as TierInfo
      setInfo(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan')
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
  const episodesRemaining =
    episodeLimit === null ? Infinity : Math.max(0, episodeLimit - episodeUsed)
  const atEpisodeLimit = episodeLimit !== null && episodeUsed >= episodeLimit

  const customTopicLimit = info?.limits.customTopics ?? null
  const customTopicUsed = info?.usage.customTopics ?? 0
  const atCustomTopicLimit =
    customTopicLimit !== null && customTopicUsed >= customTopicLimit

  return {
    tier,
    info,
    loading,
    error,
    episodeLimit,
    episodeUsed,
    episodesRemaining,
    atEpisodeLimit,
    customTopicLimit,
    customTopicUsed,
    atCustomTopicLimit,
    canUpgrade: tier !== 'unlimited',
    // Default false so a stale/failed /api/me never offers a broken checkout.
    billingEnabled: info?.billingEnabled ?? false,
    refetch,
  }
}
