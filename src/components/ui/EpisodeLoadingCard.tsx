import { useState, useEffect } from 'react'

const STAGES = [
  { label: 'Fetching RSS feeds', detail: 'Pulling latest articles from your news sources', duration: 8 },
  { label: 'Searching for context', detail: 'Enriching stories with web search', duration: 12 },
  { label: 'Writing segment scripts', detail: 'Crafting your personalized podcast segments', duration: 25 },
  { label: 'Polishing the episode', detail: 'Adding cold open, transitions, and wrap-up', duration: 15 },
  { label: 'Finalizing', detail: 'Saving your episode — almost there', duration: 10 },
]

const TOTAL_DURATION = STAGES.reduce((sum, s) => sum + s.duration, 0)

export default function EpisodeLoadingCard() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Determine current stage
  let accumulated = 0
  let currentStage = STAGES[STAGES.length - 1]
  let stageIndex = STAGES.length - 1
  for (let i = 0; i < STAGES.length; i++) {
    accumulated += STAGES[i].duration
    if (elapsed < accumulated) {
      currentStage = STAGES[i]
      stageIndex = i
      break
    }
  }

  // Progress: use elapsed vs total, cap at 95% until done
  const rawProgress = Math.min((elapsed / TOTAL_DURATION) * 100, 95)

  return (
    <div
      className="rounded-card p-6 text-center"
      style={{
        background: 'linear-gradient(135deg, #0F1320 0%, #1E2433 100%)',
        border: '1px solid rgba(255,107,53,0.2)',
      }}
    >
      <div className="flex justify-center mb-4">
        <div className="spin-ring" />
      </div>

      <p
        className="text-base font-bold text-white mb-1"
        style={{ animation: 'pulse 2s ease-in-out infinite' }}
      >
        {currentStage.label}
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {currentStage.detail}
      </p>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,0.15)' }}>
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${rawProgress}%`,
            background: 'linear-gradient(90deg, var(--accent-pulse), var(--accent-signal))',
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Stage dots */}
      <div className="flex justify-center gap-2 mt-3">
        {STAGES.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              backgroundColor: i <= stageIndex ? 'var(--accent-pulse)' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {elapsed > 45 && (
        <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
          This can take up to 90 seconds for a full episode
        </p>
      )}
    </div>
  )
}
