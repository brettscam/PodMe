import { Home, Hash, Mic, Radio, User } from 'lucide-react'
import type { ViewName } from '../../lib/types'

const NAV_ITEMS: { view: ViewName; icon: typeof Home; label: string }[] = [
  { view: 'home', icon: Home, label: 'Home' },
  { view: 'topics', icon: Hash, label: 'Topics' },
  { view: 'voices', icon: Mic, label: 'Voices' },
  { view: 'episode', icon: Radio, label: 'Episode' },
  { view: 'profile', icon: User, label: 'Profile' },
]

interface BottomNavProps {
  currentView: ViewName
  onNavigate: (view: ViewName) => void
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
      style={{
        backgroundColor: 'rgba(13,13,26,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
