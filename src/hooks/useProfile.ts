import { useState, useCallback, useEffect } from 'react'
import type { UserProfile, Tone, Length, Cadence } from '../lib/types'
import { DEFAULT_PROFILE } from '../lib/constants'
import { supabase } from '../lib/supabase'

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE })
  const [loaded, setLoaded] = useState(false)

  // Load profile from Supabase
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (cancelled) return

      if (data && !error) {
        setProfile({
          id: data.id,
          display_name: data.display_name || 'You',
          timezone: data.timezone || 'America/Los_Angeles',
          delivery_time: data.delivery_time || '06:00',
          tone: data.tone || 'mixed',
          length: data.length || 'standard',
          cadence: data.cadence || 'daily',
          default_voice: data.default_voice || 'anchor',
          discovery_enabled: data.discovery_enabled ?? true,
          email_digest: data.email_digest ?? false,
        })
      }
      setLoaded(true)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }))

    if (userId) {
      const dbUpdates: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
      delete dbUpdates.id
      delete dbUpdates.display_name

      await supabase.from('profiles').update(dbUpdates).eq('id', userId)
    }
  }, [userId])

  const setTone = useCallback((tone: Tone) => updateProfile({ tone }), [updateProfile])
  const setLength = useCallback((length: Length) => updateProfile({ length }), [updateProfile])
  const setCadence = useCallback((cadence: Cadence) => updateProfile({ cadence }), [updateProfile])
  const setDefaultVoice = useCallback((voice: string) => updateProfile({ default_voice: voice }), [updateProfile])
  const setDeliveryTime = useCallback((time: string) => updateProfile({ delivery_time: time }), [updateProfile])
  const setDiscoveryEnabled = useCallback((enabled: boolean) => updateProfile({ discovery_enabled: enabled }), [updateProfile])
  const setEmailDigest = useCallback((enabled: boolean) => updateProfile({ email_digest: enabled }), [updateProfile])

  return {
    profile,
    loaded,
    updateProfile,
    setTone,
    setLength,
    setCadence,
    setDefaultVoice,
    setDeliveryTime,
    setDiscoveryEnabled,
    setEmailDigest,
  }
}
