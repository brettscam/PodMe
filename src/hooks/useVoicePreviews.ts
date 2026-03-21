import { useState, useEffect } from 'react'

// With Chatterbox, voice previews are generated on-demand via /api/voice-sample
// No static preview URLs exist — this hook just signals readiness
export function useVoicePreviews() {
  const [previews] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    // List-voices now returns our static voice list — no external API needed
    // Previews are generated on-demand when the user clicks "preview"
    setLoaded(true)
  }, [loaded])

  return previews
}
