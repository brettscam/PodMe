import { Radio, RefreshCw, AlertCircle } from 'lucide-react'
import type { EpisodeWithSources, EpisodeStatus } from '../lib/types'
import AudioPlayer from './AudioPlayer'
import Transcript from './Transcript'
import SourceList from './SourceList'
import GenerationProgress from './GenerationProgress'

interface TodayViewProps {
  todayEpisode: EpisodeWithSources | null
  loading: boolean
  generating: boolean
  generationStatus: EpisodeStatus | null
  generationStageProgress: string | null
  generationError: string | null
  onGenerate: () => void
}

export default function TodayView({
  todayEpisode,
  loading,
  generating,
  generationStatus,
  generationStageProgress,
  generationError,
  onGenerate,
}: TodayViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Generating state
  if (generating) {
    return (
      <div className="space-y-4">
        <GenerationProgress
          status={generationStatus}
          stageProgress={generationStageProgress}
        />
      </div>
    )
  }

  // Generation error
  if (generationError) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm mb-4">{generationError}</p>
          <button
            onClick={onGenerate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Episode ready
  if (todayEpisode && todayEpisode.status === 'ready') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">
            {todayEpisode.title}
          </h2>
          <p className="text-sm text-gray-400">{todayEpisode.date}</p>
        </div>

        <AudioPlayer
          audioUrl={todayEpisode.audio_url}
          title={todayEpisode.title}
        />

        {todayEpisode.transcript && (
          <Transcript transcript={todayEpisode.transcript} />
        )}

        {todayEpisode.sources && todayEpisode.sources.length > 0 && (
          <SourceList sources={todayEpisode.sources} />
        )}
      </div>
    )
  }

  // Episode exists but still processing
  if (todayEpisode && todayEpisode.status !== 'ready' && todayEpisode.status !== 'failed') {
    return (
      <div className="space-y-4">
        <GenerationProgress
          status={todayEpisode.status}
          stageProgress={todayEpisode.stage_progress}
        />
      </div>
    )
  }

  // Episode failed
  if (todayEpisode && todayEpisode.status === 'failed') {
    return (
      <div className="bg-gray-900 border border-red-500/30 rounded-xl p-6 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-400 text-sm mb-2">Episode generation failed</p>
        {todayEpisode.error_message && (
          <p className="text-gray-500 text-xs mb-4">{todayEpisode.error_message}</p>
        )}
        <button
          onClick={onGenerate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    )
  }

  // No episode yet
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
      <Radio size={40} className="text-gray-600 mx-auto mb-4" />
      <h2 className="text-white font-medium text-lg mb-2">No episode yet</h2>
      <p className="text-gray-400 text-sm mb-6">
        Generate your personalized podcast for today.
      </p>
      <button
        onClick={onGenerate}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        Generate Now
      </button>
    </div>
  )
}
