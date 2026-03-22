import { useState, useCallback } from 'react'
import type { EpisodeSegment } from '../lib/types'
import { supabase } from '../lib/supabase'

const AUDIO_BUCKET = 'audio-cache'

export interface GenerationProgress {
  status: 'idle' | 'loading_cache' | 'generating' | 'complete' | 'error'
  currentSegment: number
  totalSegments: number
  segmentName: string
  audioUrls: string[]
  error?: string
}

async function hashScript(script: string): Promise<string> {
  const data = new TextEncoder().encode(script)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function useGenerate() {
  const [progress, setProgress] = useState<GenerationProgress>({
    status: 'idle',
    currentSegment: 0,
    totalSegments: 0,
    segmentName: '',
    audioUrls: [],
  })

  // Try to load all audio from Supabase Storage cache (no TTS calls)
  const loadCachedAudio = useCallback(async (segments: EpisodeSegment[]): Promise<string[] | null> => {
    const scriptsToLoad = segments.filter(s => s.script && s.script.length > 0)
    if (scriptsToLoad.length === 0) return null

    console.log('[useGenerate] loadCachedAudio: checking cache for', scriptsToLoad.length, 'segments')

    setProgress({
      status: 'loading_cache',
      currentSegment: 0,
      totalSegments: scriptsToLoad.length,
      segmentName: 'Checking audio cache...',
      audioUrls: [],
    })

    const audioUrls: string[] = []

    for (const segment of scriptsToLoad) {
      const key = await hashScript(segment.script!)
      const { data } = await supabase.storage.from(AUDIO_BUCKET).download(`${key}.wav`)

      if (!data) {
        // Cache miss — not all segments are cached
        console.log('[useGenerate] cache miss, need to generate')
        audioUrls.forEach(url => URL.revokeObjectURL(url))
        setProgress({
          status: 'idle',
          currentSegment: 0,
          totalSegments: 0,
          segmentName: '',
          audioUrls: [],
        })
        return null
      }

      const blobUrl = URL.createObjectURL(data)
      audioUrls.push(blobUrl)
    }

    console.log('[useGenerate] all audio loaded from cache')
    setProgress({
      status: 'complete',
      currentSegment: scriptsToLoad.length,
      totalSegments: scriptsToLoad.length,
      segmentName: 'Complete',
      audioUrls,
    })

    return audioUrls
  }, [])

  const generateEpisode = useCallback(async (segments: EpisodeSegment[]) => {
    const scriptsToGenerate = segments.filter(s => s.script && s.script.length > 0)

    if (scriptsToGenerate.length === 0) {
      console.warn('[useGenerate] no segments with scripts to generate')
      setProgress(prev => ({ ...prev, status: 'error', error: 'No segments with scripts to generate audio for' }))
      return null
    }

    console.log('[useGenerate] generating audio for', scriptsToGenerate.length, 'segments')

    setProgress({
      status: 'generating',
      currentSegment: 0,
      totalSegments: scriptsToGenerate.length,
      segmentName: scriptsToGenerate[0]?.title || 'Segment 1',
      audioUrls: [],
    })

    const audioUrls: string[] = []

    for (let i = 0; i < scriptsToGenerate.length; i++) {
      const segment = scriptsToGenerate[i]

      setProgress(prev => ({
        ...prev,
        currentSegment: i + 1,
        segmentName: segment.title,
      }))

      console.log(`[useGenerate] generating segment ${i + 1}/${scriptsToGenerate.length}: ${segment.title}`)

      try {
        const res = await fetch('/api/generate-segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: segment.script,
            voice: segment.voice,
            segmentId: `seg_${i}`,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          const errMsg = err.detail?.message || err.error || `Audio generation failed (${res.status})`
          throw new Error(errMsg)
        }

        const data = await res.json()
        console.log(`[useGenerate] segment ${i + 1} done, cached: ${data.cached}`)

        // Convert base64 audio to blob URL
        const audioBlob = base64ToBlob(data.audio, data.contentType || 'audio/wav')
        const blobUrl = URL.createObjectURL(audioBlob)
        audioUrls.push(blobUrl)

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Audio generation failed'
        console.error(`[useGenerate] segment ${i + 1} failed:`, errMsg)
        setProgress(prev => ({
          ...prev,
          status: 'error',
          error: errMsg,
        }))
        return null
      }
    }

    console.log('[useGenerate] all audio generated successfully')
    setProgress({
      status: 'complete',
      currentSegment: scriptsToGenerate.length,
      totalSegments: scriptsToGenerate.length,
      segmentName: 'Complete',
      audioUrls,
    })

    return audioUrls
  }, [])

  const reset = useCallback(() => {
    // Clean up blob URLs
    progress.audioUrls.forEach(url => URL.revokeObjectURL(url))
    setProgress({
      status: 'idle',
      currentSegment: 0,
      totalSegments: 0,
      segmentName: '',
      audioUrls: [],
    })
  }, [progress.audioUrls])

  return { progress, generateEpisode, loadCachedAudio, reset }
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}
