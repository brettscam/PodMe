import type { VercelRequest, VercelResponse } from '@vercel/node'

// Voice name -> ElevenLabs voice ID mapping
// Each key maps to a distinct ElevenLabs pre-made voice
const VOICE_MAP: Record<string, string> = {
  'southern-gentleman': 'TX3LPaxmHKxFdv7VOQHJ',  // Liam — warm American male
  'scottish-mentor':    'onwK4e9ZLuTAKqWW03F9',   // Daniel — deep British male
  'modern-brand-ambassador': 'iP95p4xoKVk53GoZ742B', // Chris — casual male
  'anchor':        'nPczCjzI2devNBz1zQrb',   // Brian — American narrator
  'strategist':    'ErXwobaYiN019PkySvjV',   // Antoni — young analytical male
  'neighbor':      'bIHbv24MWmeRgasZH58o',   // Will — friendly male
  'correspondent': 'EXAVITQu4vr4xnSDxMaL',   // Bella — crisp female
  'analyst':       '21m00Tcm4TlvDq8ikWAM',   // Rachel — calm female
  'host':          'AZnzlk1XvdvUeBnXmlld',   // Domi — strong female
  'sportscaster':  'VR6AewLTigWG4xSOukaG',   // Arnold — energetic male
  'storyteller':   'JBFqnCBsd6RMkjVDRZzb',   // George — warm British male
  'insider':       'jsCqWAovK2LkecY7zXl4',   // Freya — expressive female
  'professor':     'pFZP5JQG7iQjIQuC4Bku',   // Lily — thoughtful British female
}

const MODEL_ID = 'eleven_multilingual_v2'

function resolveVoiceId(voiceKey: string): string {
  return VOICE_MAP[voiceKey] || VOICE_MAP['anchor']
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
    const voiceId = resolveVoiceId(voice)

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
      const detail = errorBody?.detail || errorBody
      const message = typeof detail === 'string' ? detail
        : detail?.message || detail?.status || JSON.stringify(detail)
      return res.status(ttsRes.status).json({
        error: `ElevenLabs error (${ttsRes.status}): ${message}`,
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
