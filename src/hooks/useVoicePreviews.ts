import { useState, useEffect } from 'react'

interface ElevenLabsVoice {
  id: string
  name: string
  previewUrl: string
}

// Maps our internal voice keys to ElevenLabs voice names for matching
const VOICE_NAME_MAP: Record<string, string> = {
  'southern-gentleman': 'Liam',
  'scottish-mentor': 'Daniel',
  'modern-brand-ambassador': 'Chris',
  'anchor': 'Brian',
  'strategist': 'Antoni',
  'neighbor': 'Will',
  'correspondent': 'Bella',
  'analyst': 'Rachel',
  'host': 'Domi',
  'sportscaster': 'Arnold',
  'storyteller': 'George',
  'insider': 'Freya',
  'professor': 'Lily',
}

// No static fallback previews — all voices use on-demand /api/voice-sample
export function useVoicePreviews() {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return

    fetch('/api/list-voices')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.voices) return
        const newPreviews: Record<string, string> = {}

        // Match ElevenLabs voices to our voice keys
        for (const [key, searchName] of Object.entries(VOICE_NAME_MAP)) {
          const match = (data.voices as ElevenLabsVoice[]).find(v =>
            v.name.toLowerCase() === searchName.toLowerCase()
          )
          if (match?.previewUrl) {
            newPreviews[key] = match.previewUrl
          }
        }

        setPreviews(newPreviews)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [loaded])

  return previews
}
