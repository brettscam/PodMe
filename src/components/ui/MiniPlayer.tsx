import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipForward, SkipBack, ChevronRight } from 'lucide-react'
import type { Episode } from '../../lib/types'
import { getVoice, formatSeconds } from '../../lib/constants'

interface MiniPlayerProps {
  episode: Episode
  generatedAudioUrls?: string[]
  generationStatus?: 'idle' | 'generating' | 'complete' | 'error'
  onViewEpisode: () => void
  onGenerate?: () => void
}

export default function MiniPlayer({ episode, generatedAudioUrls, generationStatus, onViewEpisode, onGenerate }: MiniPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [trackDurations, setTrackDurations] = useState<number[]>([])
  const [isScrubbing, setIsScrubbing] = useState(false)

  const hasGeneratedAudio = generatedAudioUrls && generatedAudioUrls.length > 0
  const audioSrc = hasGeneratedAudio ? generatedAudioUrls[currentTrack] : undefined

  // Track total duration across all segments
  const totalDuration = trackDurations.reduce((sum, d) => sum + d, 0)
  const elapsedBefore = trackDurations.slice(0, currentTrack).reduce((sum, d) => sum + d, 0)
  const globalTime = elapsedBefore + currentTime
  const globalProgress = totalDuration > 0 ? (globalTime / totalDuration) * 100 : 0
  const singleTrackProgress = duration > 0 ? (currentTime / duration) * 100 : 0
  const displayProgress = hasGeneratedAudio ? globalProgress : singleTrackProgress

  // Map active segment from current track index
  useEffect(() => {
    if (hasGeneratedAudio) {
      setActiveSegmentIdx(Math.min(currentTrack, episode.segments.length - 1))
    } else if (duration > 0) {
      const ratio = currentTime / duration
      const segIdx = Math.min(
        Math.floor(ratio * episode.segments.length),
        episode.segments.length - 1
      )
      setActiveSegmentIdx(segIdx)
    }
  }, [currentTime, duration, episode.segments.length, currentTrack, hasGeneratedAudio])

  // Auto-advance to next track when current ends
  const handleEnded = useCallback(() => {
    if (hasGeneratedAudio && currentTrack < generatedAudioUrls.length - 1) {
      setCurrentTrack(prev => prev + 1)
      setTimeout(() => audioRef.current?.play(), 50)
    } else {
      setIsPlaying(false)
      setCurrentTime(0)
      setCurrentTrack(0)
    }
  }, [hasGeneratedAudio, currentTrack, generatedAudioUrls])

  // Store track duration when metadata loads
  const handleMetadata = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const dur = (e.target as HTMLAudioElement).duration
    setDuration(dur)
    if (hasGeneratedAudio) {
      setTrackDurations(prev => {
        const next = [...prev]
        next[currentTrack] = dur
        return next
      })
    }
  }, [hasGeneratedAudio, currentTrack])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (!audioSrc) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const skip = (seconds: number) => {
    if (!audioRef.current) return
    const newTime = audioRef.current.currentTime + seconds
    if (hasGeneratedAudio && generatedAudioUrls) {
      // Handle cross-track skipping
      if (newTime < 0 && currentTrack > 0) {
        setCurrentTrack(prev => prev - 1)
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.duration + newTime)
            if (isPlaying) audioRef.current.play()
          }
        }, 50)
        return
      }
      if (newTime > duration && currentTrack < generatedAudioUrls.length - 1) {
        setCurrentTrack(prev => prev + 1)
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0
            if (isPlaying) audioRef.current.play()
          }
        }, 50)
        return
      }
    }
    audioRef.current.currentTime = Math.max(0, Math.min(newTime, duration))
  }

  // Scrubbing: seek to position based on pointer X relative to progress bar
  const seekToPosition = useCallback((clientX: number) => {
    if (!progressRef.current || !audioRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    audioRef.current.currentTime = ratio * duration
  }, [duration])

  // Mouse scrubbing
  useEffect(() => {
    if (!isScrubbing) return
    const handleMove = (e: MouseEvent) => seekToPosition(e.clientX)
    const handleUp = () => setIsScrubbing(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isScrubbing, seekToPosition])

  // Touch scrubbing
  useEffect(() => {
    if (!isScrubbing) return
    const handleMove = (e: TouchEvent) => {
      if (e.touches.length > 0) seekToPosition(e.touches[0].clientX)
    }
    const handleEnd = () => setIsScrubbing(false)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isScrubbing, seekToPosition])

  const handleProgressInteraction = (clientX: number) => {
    seekToPosition(clientX)
    setIsScrubbing(true)
  }

  const activeSegment = episode.segments[activeSegmentIdx]
  const voice = activeSegment ? getVoice(activeSegment.voice) : null
  const displayTime = hasGeneratedAudio ? globalTime : currentTime
  const displayTotal = hasGeneratedAudio && totalDuration > 0
    ? totalDuration
    : duration > 0
      ? duration
      : episode.estimated_minutes * 60

  return (
    <div
      className={`rounded-card overflow-hidden relative${isPlaying ? ' playback-glow' : ''}`}
      style={{
        background: isPlaying && voice
          ? `linear-gradient(135deg, ${voice.color}15 0%, #1E2433 40%, #0F1320 100%)`
          : 'linear-gradient(135deg, #0F1320 0%, #1E2433 100%)',
        border: isPlaying
          ? '1px solid rgba(255,107,53,0.25)'
          : '1px solid var(--border-subtle)',
        transition: 'background 0.8s ease, border-color 0.5s ease',
      }}
    >
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onLoadedMetadata={handleMetadata}
          onTimeUpdate={e => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
        />
      )}

      {/* Now Playing Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-4">
                <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '0.8s' }} />
                <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '1.0s', animationDelay: '0.1s' }} />
                <div className="wave-bar" style={{ width: 2, height: 16, animationDuration: '0.9s', animationDelay: '0.2s' }} />
              </div>
            )}
            <span className="caps-label text-[10px]" style={{ color: 'var(--accent-pulse)' }}>
              {isPlaying ? 'NOW PLAYING' : hasGeneratedAudio ? 'READY TO PLAY' : 'YOUR PODCAST'}
            </span>
          </div>
          <button
            onClick={onViewEpisode}
            className="text-[11px] font-semibold transition-all-200 flex items-center gap-0.5"
            style={{ color: 'var(--accent-signal)' }}
          >
            View Details
            <ChevronRight size={12} strokeWidth={2} />
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

      {/* Segment dots timeline */}
      {hasGeneratedAudio && (
        <div className="px-5 pb-1">
          <div className="flex gap-1">
            {episode.segments.map((seg, i) => {
              const v = getVoice(seg.voice)
              return (
                <div
                  key={i}
                  className="h-1 rounded-full flex-1 transition-all"
                  style={{
                    backgroundColor: i <= activeSegmentIdx ? v.color : `${v.color}30`,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Progress Bar — tall touch target with visual scrub handle */}
      <div className="px-5 pt-1">
        <div
          ref={progressRef}
          className="w-full relative cursor-pointer group"
          style={{ height: 28, display: 'flex', alignItems: 'center' }}
          onMouseDown={e => handleProgressInteraction(e.clientX)}
          onTouchStart={e => {
            if (e.touches.length > 0) handleProgressInteraction(e.touches[0].clientX)
          }}
        >
          {/* Track background */}
          <div
            className="w-full rounded-full"
            style={{
              height: isScrubbing ? 6 : 4,
              backgroundColor: 'rgba(148,163,184,0.15)',
              transition: 'height 0.15s ease',
            }}
          >
            {/* Filled portion */}
            <div
              className="h-full rounded-full relative"
              style={{
                width: `${displayProgress}%`,
                background: 'linear-gradient(90deg, var(--accent-pulse), var(--accent-signal))',
                transition: isScrubbing ? 'none' : 'width 0.1s linear',
              }}
            >
              {/* Scrub handle */}
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full transition-all"
                style={{
                  width: isScrubbing ? 14 : 10,
                  height: isScrubbing ? 14 : 10,
                  backgroundColor: 'white',
                  boxShadow: '0 0 6px rgba(255,107,53,0.5)',
                  opacity: hasGeneratedAudio ? 1 : 0,
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {formatSeconds(Math.floor(displayTime))}
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {formatSeconds(Math.floor(displayTotal))}
          </span>
        </div>
      </div>

      {/* Transport Controls */}
      {hasGeneratedAudio ? (
        <div className="flex items-center justify-center gap-4 py-3">
          <button
            onClick={() => skip(-15)}
            className="flex flex-col items-center gap-0.5 p-2 transition-all-200 hover:opacity-70 active:scale-95"
          >
            <SkipBack size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>15s</span>
          </button>
          <button
            onClick={togglePlay}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all-200 hover:scale-105 active:scale-95 relative${isPlaying ? ' play-button-pulse' : ''}`}
            style={{ backgroundColor: 'var(--accent-pulse)' }}
          >
            {/* Progress ring */}
            {hasGeneratedAudio && (
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 56 56"
              >
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - displayProgress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                />
              </svg>
            )}
            {isPlaying ? (
              <Pause size={24} strokeWidth={1.5} fill="white" style={{ color: 'white' }} />
            ) : (
              <Play size={24} strokeWidth={1.5} fill="white" style={{ color: 'white', marginLeft: 2 }} />
            )}
          </button>
          <button
            onClick={() => skip(15)}
            className="flex flex-col items-center gap-0.5 p-2 transition-all-200 hover:opacity-70 active:scale-95"
          >
            <SkipForward size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>15s</span>
          </button>
        </div>
      ) : (
        <div className="px-5 py-3">
          {generationStatus === 'generating' ? (
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="flex items-end gap-0.5 h-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="wave-bar" style={{ width: 3, height: 16 }} />
                ))}
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-pulse)' }}>Generating...</span>
            </div>
          ) : (
            <button
              onClick={onGenerate || onViewEpisode}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all-200 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, var(--accent-pulse), #E85D26)',
                color: 'white',
              }}
            >
              Generate Episode Audio
            </button>
          )}
        </div>
      )}
    </div>
  )
}
