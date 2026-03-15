import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
import type { VoiceDefinition } from '../../lib/types'

interface VoiceCardProps {
  voice: VoiceDefinition
  isDefault?: boolean
  assignedTopics?: string[]
  selected?: boolean
  compact?: boolean
  previewUrl?: string
  onClick?: () => void
}

export default function VoiceCard({ voice, isDefault, assignedTopics, selected, compact, previewUrl, onClick }: VoiceCardProps) {
  const Icon = voice.icon
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
      return
    }

    if (!previewUrl) return

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(previewUrl)
    audioRef.current = audio
    audio.play()
    setPlaying(true)
    audio.onended = () => setPlaying(false)
    audio.onerror = () => setPlaying(false)
  }

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all-200"
        style={{
          backgroundColor: selected ? `${voice.color}26` : 'var(--bg-card)',
          border: `1px solid ${selected ? `${voice.color}66` : 'var(--border-subtle)'}`,
          color: selected ? voice.color : 'var(--text-secondary)',
        }}
      >
        <Icon size={12} strokeWidth={1.5} />
        {voice.name.replace('The ', '')}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-card transition-all-200 text-left"
      style={{
        backgroundColor: selected ? `${voice.color}12` : 'var(--bg-card)',
        border: `1px solid ${selected ? `${voice.color}40` : 'var(--border-subtle)'}`,
      }}
    >
      <div
        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          backgroundColor: `${voice.color}1F`,
          border: `1px solid ${voice.color}4D`,
        }}
      >
        <Icon size={20} strokeWidth={1.5} style={{ color: voice.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{voice.name}</span>
          {isDefault && (
            <span className="caps-label px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${voice.color}22`, color: voice.color }}>
              DEFAULT
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{voice.desc}</p>
        {assignedTopics && assignedTopics.length > 0 && (
          <p className="text-[11px] mt-1 font-medium" style={{ color: voice.color }}>
            Assigned: {assignedTopics.join(', ')}
          </p>
        )}
      </div>
      <div
        onClick={handlePlay}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all-200 hover:opacity-80 cursor-pointer"
        style={{ backgroundColor: playing ? `${voice.color}50` : `${voice.color}30` }}
      >
        {playing ? (
          <Pause size={14} strokeWidth={1.5} fill={voice.color} style={{ color: voice.color }} />
        ) : (
          <Play size={14} strokeWidth={1.5} fill={voice.color} style={{ color: voice.color }} />
        )}
      </div>
    </button>
  )
}
