import { useState, useCallback } from 'react'
import type { EpisodeSegment } from '../lib/types'

interface GenerationProgress {
  status: 'idle' | 'generating' | 'complete' | 'error'
  currentSegment: number
  totalSegments: number
  segmentName: string
  audioUrls: string[]
  error?: string
}

export function useGenerate() {
  const [progress, setProgress] = useState<GenerationProgress>({
    status: 'idle',
    currentSegment: 0,
    totalSegments: 0,
    segmentName: '',
    audioUrls: [],
  })

  const generateEpisode = useCallback(async (segments: EpisodeSegment[]) => {
    const scriptsToGenerate = segments.filter(s => s.script && s.script.length > 0)

    setProgress({
      status: 'generating',
      currentSegment: 0,
      totalSegments: scriptsToGenerate.length,
      segmentName: scriptsToGenerate[0]?.title || '',
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
          throw new Error(err.detail?.message || err.error || 'Generation failed')
        }

        const data = await res.json()
        // Convert base64 audio to blob URL
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg')
        const blobUrl = URL.createObjectURL(audioBlob)
        audioUrls.push(blobUrl)

      } catch (error) {
        setProgress(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Generation failed',
        }))
        return null
      }
    }

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

  return { progress, generateEpisode, reset }
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}
