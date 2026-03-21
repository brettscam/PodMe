import type { VercelRequest, VercelResponse } from '@vercel/node'

// Voice name -> ElevenLabs voice ID mapping
// Each key maps to a distinct ElevenLabs pre-made voice
const VOICE_MAP: Record<string, string> = {
  'southern-gentleman': 'TX3LPaxmHKxFdv7VOQHJ',  // Liam
  'scottish-mentor':    'onwK4e9ZLuTAKqWW03F9',   // Daniel
  'modern-brand-ambassador': 'iP95p4xoKVk53GoZ742B', // Chris
  'anchor':        'nPczCjzI2devNBz1zQrb',   // Brian
  'strategist':    'ErXwobaYiN019PkySvjV',   // Antoni
  'neighbor':      'bIHbv24MWmeRgasZH58o',   // Will
  'correspondent': 'EXAVITQu4vr4xnSDxMaL',   // Bella
  'analyst':       '21m00Tcm4TlvDq8ikWAM',   // Rachel
  'host':          'AZnzlk1XvdvUeBnXmlld',   // Domi
  'sportscaster':  'VR6AewLTigWG4xSOukaG',   // Arnold
  'storyteller':   'JBFqnCBsd6RMkjVDRZzb',   // George
  'insider':       'jsCqWAovK2LkecY7zXl4',   // Freya
  'professor':     'pFZP5JQG7iQjIQuC4Bku',   // Lily
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
  'sportscaster': "Game time! I'm The Sportscaster. Let me bring you the highlights.",
  'storyteller': "Gather round. I'm The Storyteller. Let me paint you a picture of today's most fascinating stories.",
  'insider': "Hey, you want the real story? I'm The Insider. Here's what everyone's talking about behind closed doors.",
  'professor': "Fascinating developments today. I'm The Professor. Let me connect the dots for you.",
}

const MODEL_ID = 'eleven_multilingual_v2'

function resolveVoiceId(voiceKey: string): string {
  return VOICE_MAP[voiceKey] || VOICE_MAP['anchor']
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
    const voiceId = resolveVoiceId(voiceKey)

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
