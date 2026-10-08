import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { CustomTopic, FeedPoolEntry, DiscoveredFeed } from '../lib/types'

export interface AnalyzeResult {
  existing_matches: FeedPoolEntry[]
  discovered: DiscoveredFeed[]
  discovery_skipped: boolean
  candidate_tags: string[]
}

export function useCustomTopics(session: Session | null) {
  const [topics, setTopics] = useState<CustomTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!session) {
      setTopics([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/custom-topics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to load custom topics')
      const data: CustomTopic[] = await res.json()
      setTopics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom topics')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    refetch()
  }, [refetch])

  const analyze = useCallback(
    async (
      label: string,
      parent_category: string,
      search_terms: string[],
    ): Promise<AnalyzeResult> => {
      if (!session) throw new Error('Not authenticated')
      const res = await fetch('/api/custom-topics/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ label, parent_category, search_terms }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.reason || err.error || 'Failed to analyze topic')
      }
      return res.json()
    },
    [session],
  )

  const create = useCallback(
    async (payload: {
      label: string
      parent_category: string
      search_terms: string[]
      pool_feed_ids: string[]
      new_feeds: DiscoveredFeed[]
    }) => {
      if (!session) throw new Error('Not authenticated')
      const res = await fetch('/api/custom-topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.reason || err.error || 'Failed to create topic')
      }
      await refetch()
      return res.json()
    },
    [session, refetch],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!session) throw new Error('Not authenticated')
      const res = await fetch(`/api/custom-topics/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete topic')
      }
      await refetch()
    },
    [session, refetch],
  )

  return { topics, loading, error, refetch, analyze, create, remove }
}
