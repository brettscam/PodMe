import { useState, useCallback } from 'react'
import type { EpisodeSegment } from '../lib/types'
import { supabase } from '../lib/supabase'
import type { PipelineStep } from '../lib/pipeline'
import { createAudioSteps } from '../lib/pipeline'

const AUDIO_BUCKET = 'audio-cache'

export interface GenerationProgress {
  status: 'idle' | 'loading_cache' | 'generating' | 'complete' | 'error'
  currentSegment: number
  totalSegments: number
  segmentName: string
  audioUrls: string[]
  error?: string
  /** Step-by-step tracking for admin visibility */
  steps: PipelineStep[]
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
    steps: [],
  })

  const updateStep = (stepId: string, update: Partial<PipelineStep>) => {
    setProgress(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, ...update } : s),
    }))
  }

  // Try to load all audio from Supabase Storage cache (no TTS calls)
  const loadCachedAudio = useCallback(async (segments: EpisodeSegment[]): Promise<string[] | null> => {
    const scriptsToLoad = segments.filter(s => s.script && s.script.length > 0)
    if (scriptsToLoad.length === 0) return null

    const steps = createAudioSteps(scriptsToLoad.length, scriptsToLoad.map(s => s.title))

    setProgress({
      status: 'loading_cache',
      currentSegment: 0,
      totalSegments: scriptsToLoad.length,
      segmentName: 'Checking audio cache...',
      audioUrls: [],
      steps,
    })

    const audioUrls: string[] = []

    for (const segment of scriptsToLoad) {
      const key = await hashScript(segment.script!)
      const { data } = await supabase.storage.from(AUDIO_BUCKET).download(`${key}.wav`)

      if (!data) {
        // Cache miss — not all segments are cached
        audioUrls.forEach(url => URL.revokeObjectURL(url))
        setProgress({
          status: 'idle',
          currentSegment: 0,
          totalSegments: 0,
          segmentName: '',
          audioUrls: [],
          steps: steps.map(s => s.id === 'check_cache'
            ? { ...s, status: 'success' as const, detail: `${audioUrls.length}/${scriptsToLoad.length} cached` }
            : s
          ),
        })
        return null
      }

      const blobUrl = URL.createObjectURL(data)
      audioUrls.push(blobUrl)
    }

    setProgress({
      status: 'complete',
      currentSegment: scriptsToLoad.length,
      totalSegments: scriptsToLoad.length,
      segmentName: 'Complete',
      audioUrls,
      steps: steps.map(s => ({ ...s, status: 'success' as const })),
    })

    return audioUrls
  }, [])

  const generateEpisode = useCallback(async (segments: EpisodeSegment[]) => {
    const scriptsToGenerate = segments.filter(s => s.script && s.script.length > 0)
    const steps = createAudioSteps(scriptsToGenerate.length, scriptsToGenerate.map(s => s.title))

    setProgress({
      status: 'generating',
      currentSegment: 0,
      totalSegments: scriptsToGenerate.length,
      segmentName: scriptsToGenerate[0]?.title || '',
      audioUrls: [],
      steps,
    })

    // Mark cache check as skipped (we're generating fresh)
    updateStep('check_cache', { status: 'skipped' })

    const audioUrls: string[] = []

    for (let i = 0; i < scriptsToGenerate.length; i++) {
      const segment = scriptsToGenerate[i]
      const stepId = `generate_seg_${i}`

      setProgress(prev => ({
        ...prev,
        currentSegment: i + 1,
        segmentName: segment.title,
        steps: prev.steps.map(s => s.id === stepId ? { ...s, status: 'running', startedAt: Date.now() } : s),
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
          const errMsg = err.detail?.message || err.error || 'Generation failed'
          throw new Error(errMsg)
        }

        const data = await res.json()
        // Convert base64 audio to blob URL
        const audioBlob = base64ToBlob(data.audio, data.contentType || 'audio/wav')
        const blobUrl = URL.createObjectURL(audioBlob)
        audioUrls.push(blobUrl)

        setProgress(prev => ({
          ...prev,
          steps: prev.steps.map(s => s.id === stepId ? {
            ...s,
            status: 'success',
            completedAt: Date.now(),
            detail: data.cached ? 'from cache' : 'generated',
          } : s),
        }))

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Generation failed'
        setProgress(prev => ({
          ...prev,
          status: 'error',
          error: errMsg,
          steps: prev.steps.map(s => s.id === stepId ? {
            ...s,
            status: 'error',
            completedAt: Date.now(),
            error: errMsg,
          } : s),
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
      steps: steps.map((s, i) => i === 0
        ? { ...s, status: 'skipped' as const }
        : { ...s, status: 'success' as const, completedAt: Date.now() }
      ),
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
      steps: [],
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
