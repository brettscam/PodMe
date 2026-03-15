import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react'
import type { Episode } from '../../lib/types'
import { getVoice, formatSeconds } from '../../lib/constants'

const EPISODE_AUDIO_URL = '/episodes/2026-03-14.mp3'
const DEMO_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

interface MiniPlayerProps {
  episode: Episode
  onViewEpisode: () => void
}

export default function MiniPlayer({ episode, onViewEpisode }: MiniPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0)

  // Map current time to active segment
  useEffect(() => {
    if (duration <= 0) return
    const ratio = currentTime / duration
    const segIdx = Math.min(
      Math.floor(ratio * episode.segments.length),
      episode.segments.length - 1
    )
    setActiveSegmentIdx(segIdx)
  }, [currentTime, duration, episode.segments.length])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const skip = (seconds: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration))
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const activeSegment = episode.segments[activeSegmentIdx]
  const voice = activeSegment ? getVoice(activeSegment.voice) : null

  return (
    <div
      className="rounded-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0F1320 0%, #1E2433 100%)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <audio
        ref={audioRef}
        src={EPISODE_AUDIO_URL}
        preload="metadata"
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0) }}
        onError={e => { (e.target as HTMLAudioElement).src = DEMO_AUDIO_URL }}
      />

      {/* Now Playing Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3">
                <div className="wave-bar" style={{ width: 2, height: 12, animationDuration: '0.8s' }} />
                <div className="wave-bar" style={{ width: 2, height: 12, animationDuration: '1.0s', animationDelay: '0.1s' }} />
                <div className="wave-bar" style={{ width: 2, height: 12, animationDuration: '0.9s', animationDelay: '0.2s' }} />
              </div>
            )}
            <span className="caps-label text-[10px]" style={{ color: 'var(--accent-pulse)' }}>
              {isPlaying ? 'NOW PLAYING' : 'LATEST EPISODE'}
            </span>
          </div>
          <button
            onClick={onViewEpisode}
            className="text-[11px] font-semibold transition-all-200"
            style={{ color: 'var(--accent-signal)' }}
          >
            View Details
          </button>
        </div>
        <h3 className="text-base font-bold text-white mt-1 tracking-tight">{episode.title}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {episode.estimated_minutes} min &middot; {episode.segments.length} segments
        </p>
      </div>

      {/* Current Segment Indicator */}
      {activeSegment && voice && (
        <div className="px-5 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: voice.color }} />
            <span className="text-xs font-semibold text-white">{activeSegment.title}</span>
            <span className="text-[10px] font-medium" style={{ color: voice.color }}>
              {voice.name.replace('The ', '')}
            </span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="px-5">
        <div
          className="w-full h-1 rounded-full cursor-pointer"
          style={{ backgroundColor: 'rgba(148,163,184,0.15)' }}
          onClick={e => {
            if (!audioRef.current || !duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            audioRef.current.currentTime = ratio * duration
          }}
        >
          <div
            className="h-1 rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, var(--accent-pulse), var(--accent-signal))`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {formatSeconds(Math.floor(currentTime))}
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {duration > 0 ? formatSeconds(Math.floor(duration)) : `~${episode.estimated_minutes}:00`}
          </span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-6 py-3">
        <button onClick={() => skip(-15)} className="p-2 transition-all-200 hover:opacity-70">
          <SkipBack size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all-200"
          style={{ backgroundColor: 'var(--accent-pulse)' }}
        >
          {isPlaying ? (
            <Pause size={22} strokeWidth={1.5} fill="white" style={{ color: 'white' }} />
          ) : (
            <Play size={22} strokeWidth={1.5} fill="white" style={{ color: 'white', marginLeft: 2 }} />
          )}
        </button>
        <button onClick={() => skip(15)} className="p-2 transition-all-200 hover:opacity-70">
          <SkipForward size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  )
}
