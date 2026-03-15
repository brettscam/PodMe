import { ChevronLeft } from 'lucide-react'
import type { ViewName } from '../../lib/types'

const VIEW_LABELS: Record<ViewName, string> = {
  home: 'DASHBOARD',
  topics: 'TOPICS',
  throttles: 'THROTTLES',
  voices: 'VOICES',
  episode: 'EPISODE',
}

interface TopBarProps {
  currentView: ViewName
  onBack?: () => void
}

export default function TopBar({ currentView, onBack }: TopBarProps) {
  const showBack = currentView !== 'home'

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-14"
      style={{
        backgroundColor: 'rgba(13,13,26,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-3">
        {showBack && onBack && (
          <button onClick={onBack} className="p-1 -ml-1 transition-all-200 hover:opacity-70">
            <ChevronLeft size={20} strokeWidth={1.5} className="text-white" />
          </button>
        )}
        <div className="text-lg font-bold tracking-tight">
          <span className="text-white">my</span>
          <span style={{ color: 'var(--accent-peach)' }}>pod</span>
        </div>
      </div>
      <span className="caps-label" style={{ color: 'var(--text-muted)' }}>
        {VIEW_LABELS[currentView]}
      </span>
    </div>
  )
}
