import type { VercelRequest, VercelResponse } from '@vercel/node'

// Replicate model for Chatterbox TTS
const CHATTERBOX_MODEL = 'resemble-ai/chatterbox-turbo'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' })
  }

  const { script, voice, segmentId } = req.body

  if (!script || !voice) {
    return res.status(400).json({ error: 'Missing script or voice' })
  }

  try {
    // Create a prediction on Replicate
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
          text: script,
          exaggeration: 0.3,
          cfg_weight: 0.5,
        },
      }),
    })

    if (!createRes.ok) {
      const errorBody = await createRes.json().catch(() => ({}))
      console.error('Replicate API error:', createRes.status, errorBody)
      return res.status(createRes.status).json({
        error: 'Chatterbox API error',
        detail: errorBody,
      })
    }

    let prediction = await createRes.json()

    // If the prediction isn't complete yet (Prefer: wait timed out), poll for it
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const pollRes = await fetch(prediction.urls.get, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      })
      prediction = await pollRes.json()
    }

    if (prediction.status === 'failed') {
      console.error('Chatterbox prediction failed:', prediction.error)
      return res.status(500).json({
        error: 'Chatterbox generation failed',
        detail: prediction.error,
      })
    }

    // Replicate returns a URL to the audio file
    const audioUrl = prediction.output
    if (!audioUrl) {
      return res.status(500).json({ error: 'No audio output from Chatterbox' })
    }

    // Fetch the audio file and convert to base64
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) {
      return res.status(500).json({ error: 'Failed to download generated audio' })
    }

    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    // Determine content type from the URL or default to wav
    const contentType = audioUrl.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'

    return res.status(200).json({
      segmentId,
      audio: base64Audio,
      contentType,
    })
  } catch (error) {
    console.error('Generation error:', error)
    return res.status(500).json({ error: 'Failed to generate audio' })
  }
}
