import { Home, Hash, Sliders, Mic, Radio } from 'lucide-react'
import type { ViewName } from '../../lib/types'

const NAV_ITEMS: { view: ViewName; icon: typeof Home; label: string }[] = [
  { view: 'home', icon: Home, label: 'Home' },
  { view: 'topics', icon: Hash, label: 'Topics' },
  { view: 'throttles', icon: Sliders, label: 'Throttles' },
  { view: 'voices', icon: Mic, label: 'Voices' },
  { view: 'episode', icon: Radio, label: 'Episode' },
]

interface BottomNavProps {
  currentView: ViewName
  onNavigate: (view: ViewName) => void
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 h-16"
      style={{
        backgroundColor: 'rgba(13,13,26,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
        const isActive = currentView === view
        return (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className="flex flex-col items-center gap-1 py-2 px-3 transition-all-200"
            style={{ opacity: isActive ? 1 : 0.4 }}
          >
            <Icon size={22} strokeWidth={1.5} />
            <span
              className="text-[10px] font-semibold"
              style={{ color: isActive ? 'var(--accent-peach)' : 'var(--text-primary)' }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
