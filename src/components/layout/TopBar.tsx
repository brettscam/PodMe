import { useState } from 'react'
import { ChevronLeft, LogOut } from 'lucide-react'
import type { ViewName } from '../../lib/types'

const VIEW_LABELS: Record<ViewName, string> = {
  home: 'DASHBOARD',
  topics: 'TOPICS',
  throttles: 'THROTTLES',
  voices: 'VOICES',
  episode: 'EPISODE',
  profile: 'PROFILE',
}

interface TopBarProps {
  currentView: ViewName
  onBack?: () => void
  userName?: string
  onSignOut?: () => void
}

export default function TopBar({ currentView, onBack, userName, onSignOut }: TopBarProps) {
  const showBack = currentView !== 'home'
  const [showMenu, setShowMenu] = useState(false)

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
          <span className="text-white">puck</span>
          <span style={{ color: 'var(--accent-peach)' }}>puck</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="caps-label" style={{ color: 'var(--text-muted)' }}>
          {VIEW_LABELS[currentView]}
        </span>
        {userName && onSignOut && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(prev => !prev)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{
                backgroundColor: 'rgba(244,162,97,0.2)',
                color: 'var(--accent-peach)',
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-10 w-48 rounded-xl overflow-hidden shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <p className="text-xs font-semibold text-white truncate">{userName}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onSignOut()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-all-200"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
