import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserPreferences } from '../lib/types'

const DEFAULT_PREFERENCES: UserPreferences = {
  user_id: '',
  delivery_time: '07:00',
  tone: 'conversational',
  episode_length: 'medium',
  updated_at: '',
}

export function usePreferences(session: Session | null) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/preferences', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to fetch preferences')
      const data = await res.json()
      setPreferences(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!session) return
      const updated = { ...preferences, ...updates }
      setPreferences(updated)
      try {
        const res = await fetch('/api/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(updates),
        })
        if (!res.ok) throw new Error('Failed to update preferences')
        const data = await res.json()
        setPreferences(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
        // Revert on error
        fetchPreferences()
      }
    },
    [session, preferences, fetchPreferences]
  )

  return { preferences, loading, error, updatePreferences }
}
