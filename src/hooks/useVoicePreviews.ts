import { useState, useEffect } from 'react'

interface ElevenLabsVoice {
  id: string
  name: string
  previewUrl: string
}

// Maps our internal voice keys to ElevenLabs voice names for matching
const VOICE_NAME_MAP: Record<string, string> = {
  'southern-gentleman': 'Southern Gentleman',
  'scottish-mentor': 'Scottish Mentor',
  'modern-brand-ambassador': 'Modern Brand Ambassador',
}

// Fallback preview URLs for built-in ElevenLabs voices
const FALLBACK_PREVIEWS: Record<string, string> = {
  anchor: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/4fa63e25-40a6-4a3e-a032-c3a1ce4a4116.mp3',
  correspondent: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/04e1e3e0-bfe7-4fbb-af35-5f6310a5e3c0.mp3',
  analyst: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/df6788f9-5c96-470d-8312-aab3b3d8f50a.mp3',
  neighbor: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/VR6AewLTigWG4xSOukaG/66448ee2-04e0-4a90-ad1b-db934e68fa28.mp3',
  host: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/AZnzlk1XvdvUeBnXmlld/b5349de9-db08-4304-aa65-1a4bab55d44a.mp3',
  strategist: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/2e5e2e05-3810-4153-9a5c-432ca5cb8e21.mp3',
}

export function useVoicePreviews() {
  const [previews, setPreviews] = useState<Record<string, string>>(FALLBACK_PREVIEWS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return

    fetch('/api/list-voices')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.voices) return
        const newPreviews = { ...FALLBACK_PREVIEWS }

        // Match ElevenLabs voices to our voice keys
        for (const [key, searchName] of Object.entries(VOICE_NAME_MAP)) {
          const match = (data.voices as ElevenLabsVoice[]).find(v =>
            v.name.toLowerCase().includes(searchName.toLowerCase())
          )
          if (match?.previewUrl) {
            newPreviews[key] = match.previewUrl
          }
        }

        setPreviews(newPreviews)
        setLoaded(true)
      })
      .catch(() => {
        // Keep fallback previews
        setLoaded(true)
      })
  }, [loaded])

  return previews
}
