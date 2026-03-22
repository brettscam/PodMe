import { CheckCircle2, XCircle, Loader2, Circle, SkipForward } from 'lucide-react'
import type { PipelineStep, PipelineStepStatus } from '../../lib/pipeline'

interface PipelineStatusProps {
  steps: PipelineStep[]
  error?: string | null
  compact?: boolean
}

function StepIcon({ status }: { status: PipelineStepStatus }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 size={14} strokeWidth={2} style={{ color: 'var(--success)' }} />
    case 'error':
      return <XCircle size={14} strokeWidth={2} className="text-red-400" />
    case 'running':
      return <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: 'var(--accent-pulse)' }} />
    case 'skipped':
      return <SkipForward size={12} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
    default:
      return <Circle size={14} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
  }
}

export default function PipelineStatus({ steps, error, compact }: PipelineStatusProps) {
  if (steps.length === 0) return null

  return (
    <div
      className="rounded-card p-4"
      style={{
        backgroundColor: error ? 'rgba(239,68,68,0.06)' : 'var(--bg-card)',
        border: `1px solid ${error ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)'}`,
      }}
    >
      <span className="caps-label text-[10px]" style={{ color: error ? '#ef4444' : 'var(--text-muted)' }}>
        {error ? 'PIPELINE ERROR' : 'PIPELINE STATUS'}
      </span>

      <div className={`mt-2 ${compact ? 'flex flex-wrap gap-2' : 'space-y-1.5'}`}>
        {steps.map((step) => (
          <div
            key={step.id}
            className={compact ? 'flex items-center gap-1' : 'flex items-center gap-2'}
          >
            <StepIcon status={step.status} />
            <span
              className={`text-xs ${step.status === 'running' ? 'font-semibold' : 'font-medium'}`}
              style={{
                color: step.status === 'error' ? '#ef4444'
                  : step.status === 'running' ? 'var(--text-primary)'
                  : step.status === 'success' ? 'var(--text-secondary)'
                  : 'var(--text-muted)',
              }}
            >
              {step.label}
            </span>
            {step.detail && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                ({step.detail})
              </span>
            )}
            {step.error && !compact && (
              <span className="text-[10px] text-red-400 ml-1 truncate max-w-[200px]">
                {step.error}
              </span>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2 leading-relaxed">{error}</p>
      )}
    </div>
  )
}
