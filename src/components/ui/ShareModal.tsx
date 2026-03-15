import { X, Link2, Send, Check } from 'lucide-react'
import type { Episode } from '../../lib/types'
import ToggleSwitch from './ToggleSwitch'

interface ShareModalProps {
  episode: Episode
  shareUrl: string
  copied: boolean
  listenCount: number
  onCopy: () => void
  onShare: () => void
  onClose: () => void
}

export default function ShareModal({ episode, shareUrl, copied, listenCount, onCopy, onShare, onClose }: ShareModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-app mx-4 mb-4 rounded-2xl p-5 space-y-4"
        style={{
          backgroundColor: '#1a1a2e',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Share Episode</h3>
          <button onClick={onClose} className="p-1 hover:opacity-70 transition-all-200">
            <X size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{episode.title.split(' — ')[0]}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {episode.estimated_minutes} min &middot; {episode.tone.charAt(0).toUpperCase() + episode.tone.slice(1)} &middot; {episode.segments.length} segments
          </p>
        </div>

        <div
          className="flex items-center px-3 py-2.5 rounded-lg text-xs font-mono"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {shareUrl}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: copied ? 'var(--success)' : 'var(--text-primary)',
            }}
          >
            {copied ? <Check size={16} strokeWidth={1.5} /> : <Link2 size={16} strokeWidth={1.5} />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all-200"
            style={{
              backgroundColor: 'var(--accent-peach)',
              color: '#0d0d1a',
            }}
          >
            <Send size={16} strokeWidth={1.5} />
            Share
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Allow anyone to listen</span>
            <ToggleSwitch checked={true} onChange={() => {}} />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {listenCount} listens
          </span>
        </div>
      </div>
    </div>
  )
}
