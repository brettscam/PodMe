import type { VercelRequest, VercelResponse } from '@vercel/node'

// Voice name -> ElevenLabs voice ID mapping
// Resolved dynamically on first call if not hardcoded
const VOICE_MAP: Record<string, string> = {
  'southern-gentleman': '',    // Resolved by name
  'scottish-mentor': '',       // Resolved by name
  'modern-brand-ambassador': '', // Resolved by name
  'anchor':        'pNInz6obpgDQGcFmaJgB',
  'strategist':    'ErXwobaYiN019PkySvjV',
  'neighbor':      'VR6AewLTigWG4xSOukaG',
  'correspondent': 'EXAVITQu4vr4xnSDxMaL',
  'analyst':       '21m00Tcm4TlvDq8ikWAM',
  'host':          'AZnzlk1XvdvUeBnXmlld',
}

const SAMPLE_LINES: Record<string, string> = {
  'southern-gentleman': "Hey there, I'm The Southern Gentleman. Sit back, relax, and let me walk you through what matters today.",
  'scottish-mentor': "Good morning. I'm The Scottish Mentor. Let me guide you through the stories shaping your world.",
  'modern-brand-ambassador': "Hi, I'm The Brand Voice. Crisp, clear, and ready to deliver your morning brief.",
  'anchor': "Good morning. I'm The Anchor. Let's get into today's top stories.",
  'strategist': "Markets are moving. I'm The Strategist. Here's what you need to know.",
  'neighbor': "Hey, good morning! I'm The Neighbor. Let's catch up on what's happening around here.",
  'correspondent': "This is The Correspondent, live and ready. Here's your news rundown.",
  'analyst': "I'm The Analyst. Let's break down the numbers and the trends.",
  'host': "Welcome! I'm The Host. Let's dive into something interesting.",
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' })
  }

  const voiceKey = req.query.voice as string | undefined
  if (!voiceKey) {
    return res.status(400).json({ error: 'Missing voice query parameter' })
  }

  const sampleText = SAMPLE_LINES[voiceKey]
  if (!sampleText) {
    return res.status(400).json({
      error: `Unknown voice: ${voiceKey}`,
      availableVoices: Object.keys(SAMPLE_LINES),
    })
  }

  try {
    const voiceId = await resolveVoiceId(apiKey, voiceKey)

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: sampleText,
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

    const audioBuffer = await ttsRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return res.status(200).json({
      voice: voiceKey,
      audio: base64Audio,
      contentType: 'audio/mpeg',
    })
  } catch (error) {
    console.error('Voice sample generation error:', error)
    return res.status(500).json({ error: 'Failed to generate voice sample' })
  }
}
