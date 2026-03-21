import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' })
  }

  try {
    const voicesRes = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    })

    if (!voicesRes.ok) {
      return res.status(voicesRes.status).json({ error: 'Failed to fetch voices' })
    }

    const data = await voicesRes.json()
    const voices = data.voices?.map((v: { voice_id: string; name: string; labels: Record<string, string>; preview_url: string }) => ({
      id: v.voice_id,
      name: v.name,
      labels: v.labels,
      previewUrl: v.preview_url,
    })) || []

    return res.status(200).json({ voices })
  } catch (error) {
    console.error('Voices error:', error)
    return res.status(500).json({ error: 'Failed to list voices' })
  }
}
