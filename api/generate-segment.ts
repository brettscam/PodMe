import type { VercelRequest, VercelResponse } from '@vercel/node'

// Voice name -> ElevenLabs voice ID mapping
// These will be resolved dynamically on first call if not hardcoded
const VOICE_MAP: Record<string, string> = {
  // User's selected ElevenLabs voices
  'southern-gentleman': '',    // Will be resolved by name
  'scottish-mentor': '',       // Will be resolved by name
  'modern-brand-ambassador': '', // Will be resolved by name
  // ElevenLabs pre-made voices as fallbacks
  'anchor':        'pNInz6obpgDQGcFmaJgB',   // Adam
  'strategist':    'ErXwobaYiN019PkySvjV',   // Antoni
  'neighbor':      'VR6AewLTigWG4xSOukaG',   // Arnold
  'correspondent': 'EXAVITQu4vr4xnSDxMaL',   // Bella
  'analyst':       '21m00Tcm4TlvDq8ikWAM',   // Rachel
  'host':          'AZnzlk1XvdvUeBnXmlld',   // Domi
}

const MODEL_ID = 'eleven_multilingual_v2'

async function findVoiceByName(apiKey: string, searchName: string): Promise<string | null> {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  })
  if (!res.ok) return null
  const data = await res.json()
  const voice = data.voices?.find((v: { name: string }) =>
    v.name.toLowerCase().includes(searchName.toLowerCase())
  )
  return voice?.voice_id || null
}

async function resolveVoiceId(apiKey: string, voiceKey: string): Promise<string> {
  // If we already have a hardcoded ID, use it
  if (VOICE_MAP[voiceKey] && VOICE_MAP[voiceKey].length > 5) {
    return VOICE_MAP[voiceKey]
  }

  // Try to find by name in ElevenLabs library
  const searchNames: Record<string, string> = {
    'southern-gentleman': 'Southern Gentleman',
    'scottish-mentor': 'Scottish Mentor',
    'modern-brand-ambassador': 'Modern Brand Ambassador',
  }

  const searchName = searchNames[voiceKey]
  if (searchName) {
    const foundId = await findVoiceByName(apiKey, searchName)
    if (foundId) {
      VOICE_MAP[voiceKey] = foundId
      return foundId
    }
  }

  // Fallback to Adam (anchor)
  return 'pNInz6obpgDQGcFmaJgB'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' })
  }

  const { script, voice, segmentId } = req.body

  if (!script || !voice) {
    return res.status(400).json({ error: 'Missing script or voice' })
  }

  try {
    const voiceId = await resolveVoiceId(apiKey, voice)

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: script,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    })

    if (!ttsRes.ok) {
      const errorBody = await ttsRes.json().catch(() => ({}))
      return res.status(ttsRes.status).json({
        error: 'ElevenLabs API error',
        detail: errorBody,
      })
    }

    // Stream the audio back
    const audioBuffer = await ttsRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return res.status(200).json({
      segmentId,
      audio: base64Audio,
      contentType: 'audio/mpeg',
    })
  } catch (error) {
    console.error('Generation error:', error)
    return res.status(500).json({ error: 'Failed to generate audio' })
  }
}
