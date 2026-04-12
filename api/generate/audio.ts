import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'

interface SpeakerTurn {
  speaker: 'ALEX' | 'JAMIE'
  text: string
}

const VOICE_MAP: Record<string, string> = {
  ALEX: 'en_US-lessac-medium',
  JAMIE: 'en_US-amy-medium',
}

/** Parse transcript into speaker turns. */
function parseTranscript(transcript: string): SpeakerTurn[] {
  const turns: SpeakerTurn[] = []
  const lines = transcript.split('\n')
  let currentSpeaker: 'ALEX' | 'JAMIE' | null = null
  let currentText = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const alexMatch = trimmed.match(/^ALEX:\s*(.*)/)
    const jamieMatch = trimmed.match(/^JAMIE:\s*(.*)/)

    if (alexMatch) {
      if (currentSpeaker && currentText.trim()) {
        turns.push({ speaker: currentSpeaker, text: currentText.trim() })
      }
      currentSpeaker = 'ALEX'
      currentText = alexMatch[1]
    } else if (jamieMatch) {
      if (currentSpeaker && currentText.trim()) {
        turns.push({ speaker: currentSpeaker, text: currentText.trim() })
      }
      currentSpeaker = 'JAMIE'
      currentText = jamieMatch[1]
    } else if (currentSpeaker) {
      // Continuation of current speaker's turn
      currentText += ' ' + trimmed
    }
  }

  // Push last turn
  if (currentSpeaker && currentText.trim()) {
    turns.push({ speaker: currentSpeaker, text: currentText.trim() })
  }

  return turns
}

/** Call Replicate Piper TTS and wait for completion. Returns audio buffer or null. */
async function generateTTS(text: string, voiceId: string): Promise<Buffer | null> {
  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) return null

  try {
    // Create prediction
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'latest',
        input: {
          text,
          speaker: voiceId,
        },
      }),
    })

    if (!createResponse.ok) {
      console.error('Replicate create failed:', createResponse.status, await createResponse.text())
      return null
    }

    const prediction = await createResponse.json()
    const predictionUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`

    // Poll for completion (max 60 seconds)
    const maxWait = 60_000
    const pollInterval = 2_000
    const startTime = Date.now()

    while (Date.now() - startTime < maxWait) {
      const statusResponse = await fetch(predictionUrl, {
        headers: { Authorization: `Bearer ${apiToken}` },
      })

      if (!statusResponse.ok) {
        console.error('Replicate poll failed:', statusResponse.status)
        return null
      }

      const status = await statusResponse.json()

      if (status.status === 'succeeded') {
        // Get audio from output URL
        const audioUrl = typeof status.output === 'string' ? status.output : status.output?.[0]
        if (!audioUrl) return null

        const audioResponse = await fetch(audioUrl)
        if (!audioResponse.ok) return null

        const arrayBuffer = await audioResponse.arrayBuffer()
        return Buffer.from(arrayBuffer)
      }

      if (status.status === 'failed' || status.status === 'canceled') {
        console.error('Replicate prediction failed:', status.error)
        return null
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    console.error('Replicate TTS timed out')
    return null
  } catch (err) {
    console.error('TTS error:', (err as Error).message)
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { episode_id } = req.body || {}
  if (!episode_id) {
    return res.status(400).json({ error: 'episode_id is required' })
  }

  const supabase = getServiceClient()

  try {
    // 1. Get episode and verify
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('id, user_id, transcript')
      .eq('id', episode_id)
      .single()

    if (epError || !episode) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    if (episode.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!episode.transcript) {
      return res.status(400).json({ error: 'Episode has no transcript. Run /api/generate/script first.' })
    }

    // 2. Update status
    await supabase
      .from('episodes')
      .update({ status: 'voicing', stage_progress: 'Generating audio...' })
      .eq('id', episode_id)

    // 3. Parse transcript into speaker turns
    const turns = parseTranscript(episode.transcript)

    if (turns.length === 0) {
      await supabase
        .from('episodes')
        .update({
          status: 'ready',
          stage_progress: 'Complete (transcript only — no speaker turns found)',
          audio_url: null,
        })
        .eq('id', episode_id)
      return res.status(200).json({ episode_id, audio_url: null, status: 'ready' })
    }

    // 4. Generate TTS for each turn
    const audioBuffers: Buffer[] = []
    let ttsFailed = false

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i]
      const voiceId = VOICE_MAP[turn.speaker] || VOICE_MAP.ALEX

      await supabase
        .from('episodes')
        .update({
          stage_progress: `Generating audio: segment ${i + 1}/${turns.length}...`,
        })
        .eq('id', episode_id)

      const audioBuffer = await generateTTS(turn.text, voiceId)
      if (!audioBuffer) {
        ttsFailed = true
        break
      }
      audioBuffers.push(audioBuffer)
    }

    if (ttsFailed || audioBuffers.length === 0) {
      // Transcript-only fallback
      await supabase
        .from('episodes')
        .update({
          status: 'ready',
          stage_progress: 'Complete (transcript only — audio generation unavailable)',
          audio_url: null,
        })
        .eq('id', episode_id)
      return res.status(200).json({ episode_id, audio_url: null, status: 'ready' })
    }

    // 5. Concatenate audio buffers
    const concatenated = Buffer.concat(audioBuffers)

    // 6. Upload to Supabase Storage
    const fileName = `episodes/${userId}/${episode_id}.mp3`

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, concatenated, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Audio upload failed:', uploadError.message)
      // Fallback to transcript only
      await supabase
        .from('episodes')
        .update({
          status: 'ready',
          stage_progress: 'Complete (transcript only — upload failed)',
          audio_url: null,
        })
        .eq('id', episode_id)
      return res.status(200).json({ episode_id, audio_url: null, status: 'ready' })
    }

    // 7. Get public URL
    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName)
    const audioUrl = urlData?.publicUrl || null

    // Rough duration estimate: ~150 words per minute
    const wordCount = episode.transcript.split(/\s+/).length
    const durationSeconds = Math.round((wordCount / 150) * 60)

    // 8. Update episode
    await supabase
      .from('episodes')
      .update({
        audio_url: audioUrl,
        duration_seconds: durationSeconds,
        status: 'ready',
        stage_progress: 'Complete',
      })
      .eq('id', episode_id)

    return res.status(200).json({
      episode_id,
      audio_url: audioUrl,
      duration_seconds: durationSeconds,
      status: 'ready',
    })
  } catch (err) {
    console.error('POST /api/generate/audio error:', err)

    // Best-effort: mark as ready with no audio
    try {
      await supabase
        .from('episodes')
        .update({
          status: 'ready',
          stage_progress: 'Complete (transcript only — audio error)',
          audio_url: null,
        })
        .eq('id', episode_id)
    } catch { /* ignore */ }

    return res.status(500).json({ error: 'Internal server error' })
  }
}
