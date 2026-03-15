import { useState, useCallback } from 'react'
import type { UserProfile, Tone, Length, Cadence } from '../lib/types'
import { DEFAULT_PROFILE } from '../lib/constants'

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE })

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }, [])

  const setTone = useCallback((tone: Tone) => updateProfile({ tone }), [updateProfile])
  const setLength = useCallback((length: Length) => updateProfile({ length }), [updateProfile])
  const setCadence = useCallback((cadence: Cadence) => updateProfile({ cadence }), [updateProfile])
  const setDefaultVoice = useCallback((voice: string) => updateProfile({ default_voice: voice }), [updateProfile])
  const setDeliveryTime = useCallback((time: string) => updateProfile({ delivery_time: time }), [updateProfile])
  const setDiscoveryEnabled = useCallback((enabled: boolean) => updateProfile({ discovery_enabled: enabled }), [updateProfile])

  return {
    profile,
    updateProfile,
    setTone,
    setLength,
    setCadence,
    setDefaultVoice,
    setDeliveryTime,
    setDiscoveryEnabled,
  }
}
