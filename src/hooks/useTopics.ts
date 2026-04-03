import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Topic, UserTopic } from '../lib/types'

function authHeaders(session: Session) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

export function useTopics(session: Session | null) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [userTopics, setUserTopics] = useState<UserTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTopics = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const [topicsRes, userTopicsRes] = await Promise.all([
        fetch('/api/topics', { headers: authHeaders(session) }),
        fetch('/api/user-topics', { headers: authHeaders(session) }),
      ])
      if (!topicsRes.ok) throw new Error('Failed to fetch topics')
      if (!userTopicsRes.ok) throw new Error('Failed to fetch user topics')
      const topicsData = await topicsRes.json()
      const userTopicsData = await userTopicsRes.json()
      setTopics(topicsData)
      setUserTopics(userTopicsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  const toggleTopic = useCallback(
    async (topicId: string, enabled: boolean) => {
      setUserTopics((prev) => {
        const existing = prev.find((ut) => ut.topic_id === topicId)
        if (existing) {
          return prev.map((ut) =>
            ut.topic_id === topicId ? { ...ut, enabled } : ut
          )
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            user_id: '',
            topic_id: topicId,
            enabled,
            custom_tags: [],
            sort_order: prev.length,
          },
        ]
      })
    },
    []
  )

  const updateCustomTags = useCallback(
    (topicId: string, tags: string[]) => {
      setUserTopics((prev) => {
        const existing = prev.find((ut) => ut.topic_id === topicId)
        if (existing) {
          return prev.map((ut) =>
            ut.topic_id === topicId ? { ...ut, custom_tags: tags } : ut
          )
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            user_id: '',
            topic_id: topicId,
            enabled: true,
            custom_tags: tags,
            sort_order: prev.length,
          },
        ]
      })
    },
    []
  )

  const saveUserTopics = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch('/api/user-topics', {
        method: 'PUT',
        headers: authHeaders(session),
        body: JSON.stringify(userTopics),
      })
      if (!res.ok) throw new Error('Failed to save user topics')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }, [session, userTopics])

  return {
    topics,
    userTopics,
    loading,
    error,
    toggleTopic,
    updateCustomTags,
    saveUserTopics,
    refetch: fetchTopics,
  }
}
