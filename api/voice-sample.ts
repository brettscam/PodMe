import type { VercelRequest, VercelResponse } from '@vercel/node'

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

const CHATTERBOX_MODEL = 'resemble-ai/chatterbox-turbo'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' })
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
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        model: CHATTERBOX_MODEL,
        input: {
          text: sampleText,
          exaggeration: 0.3,
          cfg_weight: 0.5,
        },
      }),
    })

    if (!createRes.ok) {
      const errorBody = await createRes.json().catch(() => ({}))
      return res.status(createRes.status).json({
        error: 'Chatterbox API error',
        detail: errorBody,
      })
    }

    let prediction = await createRes.json()

    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const pollRes = await fetch(prediction.urls.get, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      })
      prediction = await pollRes.json()
    }

    if (prediction.status === 'failed') {
      return res.status(500).json({
        error: 'Chatterbox generation failed',
        detail: prediction.error,
      })
    }

    const audioUrl = prediction.output
    if (!audioUrl) {
      return res.status(500).json({ error: 'No audio output from Chatterbox' })
    }

    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) {
      return res.status(500).json({ error: 'Failed to download generated audio' })
    }

    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const contentType = audioUrl.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'

    return res.status(200).json({
      voice: voiceKey,
      audio: base64Audio,
      contentType,
    })
  } catch (error) {
    console.error('Voice sample generation error:', error)
    return res.status(500).json({ error: 'Failed to generate voice sample' })
  }
}
