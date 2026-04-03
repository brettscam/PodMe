import { Check, Loader2 } from 'lucide-react'
import type { EpisodeStatus } from '../lib/types'

interface GenerationProgressProps {
  status: EpisodeStatus | null
  stageProgress: string | null
}

const STAGES: { key: EpisodeStatus; label: string }[] = [
  { key: 'gathering', label: 'Gathering' },
  { key: 'building', label: 'Building Stories' },
  { key: 'scripting', label: 'Writing Script' },
  { key: 'voicing', label: 'Generating Audio' },
]

function stageIndex(status: EpisodeStatus | null): number {
  if (!status) return -1
  const idx = STAGES.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : -1
}

export default function GenerationProgress({
  status,
  stageProgress,
}: GenerationProgressProps) {
  const current = stageIndex(status)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-white font-medium text-sm mb-4">
        Generating your episode...
      </h3>

      <div className="space-y-3">
        {STAGES.map((stage, i) => {
          const isDone = i < current
          const isActive = i === current
          const isPending = i > current

          return (
            <div key={stage.key} className="flex items-center gap-3">
              {/* Icon */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-green-500/20 text-green-400'
                    : isActive
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-gray-800 text-gray-600'
                }`}
              >
                {isDone ? (
                  <Check size={14} />
                ) : isActive ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm ${
                  isDone
                    ? 'text-green-400'
                    : isActive
                    ? 'text-white font-medium'
                    : isPending
                    ? 'text-gray-600'
                    : ''
                }`}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      {stageProgress && (
        <p className="text-xs text-gray-400 mt-4">{stageProgress}</p>
      )}
    </div>
  )
}
