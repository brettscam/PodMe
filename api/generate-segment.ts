import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const CHATTERBOX_MODEL = 'resemble-ai/chatterbox-turbo'
const AUDIO_BUCKET = 'audio-cache'
const VOICE_REF_BUCKET = 'voice-references'

// Per-voice TTS parameters — different exaggeration/cfg combos produce distinct speech styles
const VOICE_TTS_PARAMS: Record<string, { exaggeration: number; cfg_weight: number }> = {
  anchor:        { exaggeration: 0.15, cfg_weight: 0.7 },
  correspondent: { exaggeration: 0.5,  cfg_weight: 0.3 },
  neighbor:      { exaggeration: 0.4,  cfg_weight: 0.5 },
  analyst:       { exaggeration: 0.1,  cfg_weight: 0.8 },
  host:          { exaggeration: 0.6,  cfg_weight: 0.4 },
}

const DEFAULT_TTS_PARAMS = { exaggeration: 0.3, cfg_weight: 0.5 }

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

function cacheKey(script: string, voice: string): string {
  return createHash('sha256').update(`${voice}:${script}`).digest('hex')
}

async function getCachedAudio(supabase: ReturnType<typeof getSupabase>, key: string): Promise<Buffer | null> {
  try {
    const { data, error } = await supabase.storage.from(AUDIO_BUCKET).download(`${key}.wav`)
    if (error || !data) return null
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

async function uploadAudio(supabase: ReturnType<typeof getSupabase>, key: string, buffer: Buffer): Promise<void> {
  try {
    await supabase.storage.from(AUDIO_BUCKET).upload(`${key}.wav`, buffer, {
      contentType: 'audio/wav',
      upsert: true,
    })
  } catch (err) {
    console.warn('audio-cache upload failed:', err)
  }
}

async function getVoiceReferenceUrl(supabase: ReturnType<typeof getSupabase>, voice: string): Promise<string | null> {
  try {
    const { data } = await supabase.storage.from(VOICE_REF_BUCKET).list('', { search: `${voice}.wav` })
    if (!data || data.length === 0) return null
    const { data: urlData } = await supabase.storage.from(VOICE_REF_BUCKET).createSignedUrl(`${voice}.wav`, 300)
    return urlData?.signedUrl || null
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured — add it in Vercel env vars' })
  }

  const { script, voice, segmentId } = req.body

  if (!script || !voice) {
    return res.status(400).json({ error: 'Missing script or voice' })
  }

  const supabase = getSupabase()
  const key = cacheKey(script, voice)

  // Check cache (keyed by script + voice so different voices don't collide)
  const cached = await getCachedAudio(supabase, key)
  if (cached) {
    console.log('audio-cache', { cacheKey: key, voice, hit: true })
    return res.status(200).json({
      segmentId,
      audio: cached.toString('base64'),
      contentType: 'audio/wav',
      cached: true,
    })
  }

  console.log('audio-cache', { cacheKey: key, voice, hit: false })

  try {
    // Get per-voice TTS parameters
    const ttsParams = VOICE_TTS_PARAMS[voice] || DEFAULT_TTS_PARAMS

    // Check for voice reference audio (enables true voice cloning)
    const refUrl = await getVoiceReferenceUrl(supabase, voice)

    const input: Record<string, unknown> = {
      text: script,
      exaggeration: ttsParams.exaggeration,
      cfg_weight: ttsParams.cfg_weight,
    }

    // If a reference audio clip exists for this voice, pass it for voice cloning
    if (refUrl) {
      input.audio_prompt = refUrl
      console.log('voice-ref', { voice, hasRef: true })
    }

    const createRes = await fetch(`https://api.replicate.com/v1/models/${CHATTERBOX_MODEL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({ input }),
    })

    if (!createRes.ok) {
      const errorBody = await createRes.json().catch(() => ({}))
      console.error('Replicate API error:', createRes.status, errorBody)
      return res.status(createRes.status).json({
        error: `Chatterbox error (${createRes.status}): ${errorBody?.detail || JSON.stringify(errorBody)}`,
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
      console.error('Chatterbox prediction failed:', prediction.error)
      return res.status(500).json({
        error: `Chatterbox generation failed: ${prediction.error}`,
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

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    const base64Audio = audioBuffer.toString('base64')
    const contentType = audioUrl.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'

    // Upload to cache (best-effort, don't block response)
    uploadAudio(supabase, key, audioBuffer)

    return res.status(200).json({
      segmentId,
      audio: base64Audio,
      contentType,
      cached: false,
    })
  } catch (error) {
    console.error('Generation error:', error)
    return res.status(500).json({ error: 'Failed to generate audio' })
  }
}
