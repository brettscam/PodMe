/**
 * Pipeline status tracking for episode generation and audio generation.
 * Each step in the pipeline reports its status so the UI (and future admin console)
 * can show exactly what's happening and what broke.
 */

export type PipelineStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'

export interface PipelineStep {
  id: string
  label: string
  status: PipelineStepStatus
  startedAt?: number
  completedAt?: number
  error?: string
  detail?: string
}

export interface EpisodePipelineState {
  /** Overall status */
  status: 'idle' | 'running' | 'success' | 'error'
  /** Which high-level phase we're in */
  phase: 'idle' | 'building_episode' | 'generating_audio' | 'complete'
  /** Individual steps with their statuses */
  steps: PipelineStep[]
  /** The current active step ID */
  currentStepId: string | null
  /** When the pipeline started */
  startedAt: number | null
  /** When the pipeline finished */
  completedAt: number | null
  /** Total elapsed ms */
  elapsedMs: number
}

// Step IDs for the episode build pipeline
export const EPISODE_BUILD_STEPS = [
  { id: 'health_check', label: 'Checking services' },
  { id: 'fetch_rss', label: 'Fetching news feeds' },
  { id: 'generate_scripts', label: 'Writing segment scripts' },
  { id: 'polish_episode', label: 'Adding transitions & cold open' },
  { id: 'save_episode', label: 'Saving episode' },
] as const

// Step IDs for the audio generation pipeline
export const AUDIO_GEN_STEPS = [
  { id: 'check_cache', label: 'Checking audio cache' },
  // Dynamic steps added per segment: 'generate_seg_0', 'generate_seg_1', etc.
] as const

export function createInitialPipelineState(): EpisodePipelineState {
  return {
    status: 'idle',
    phase: 'idle',
    steps: [],
    currentStepId: null,
    startedAt: null,
    completedAt: null,
    elapsedMs: 0,
  }
}

export function createBuildSteps(): PipelineStep[] {
  return EPISODE_BUILD_STEPS.map(s => ({
    id: s.id,
    label: s.label,
    status: 'pending' as PipelineStepStatus,
  }))
}

export function createAudioSteps(segmentCount: number, segmentNames: string[]): PipelineStep[] {
  return [
    { id: 'check_cache', label: 'Checking audio cache', status: 'pending' as PipelineStepStatus },
    ...Array.from({ length: segmentCount }, (_, i) => ({
      id: `generate_seg_${i}`,
      label: `Generating: ${segmentNames[i] || `Segment ${i + 1}`}`,
      status: 'pending' as PipelineStepStatus,
    })),
  ]
}
