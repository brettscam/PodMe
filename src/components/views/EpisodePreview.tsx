import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Share2, ExternalLink, Clock, Radio, ChevronRight, Volume2, VolumeX, Zap } from 'lucide-react'
import type { Episode } from '../../lib/types'
import { formatSeconds, getVoice } from '../../lib/constants'
import SegmentRow from '../ui/SegmentRow'
import ShareModal from '../ui/ShareModal'

function TierDot({ tier }: { tier: number }) {
  const color = tier === 1 ? 'var(--accent-blue)' : tier === 2 ? 'var(--success)' : 'var(--text-muted)'
  return <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
}

interface GenerationProgress {
  status: 'idle' | 'generating' | 'complete' | 'error'
  currentSegment: number
  totalSegments: number
  segmentName: string
  audioUrls: string[]
  error?: string
}

interface EpisodePreviewProps {
  episode: Episode
  pastEpisodes: Episode[]
  shareToken: string | null
  copied: boolean
  listenCount: number
  onGenerateShare: () => string
  getShareUrl: (token?: string) => string
  onCopy: () => void
  onShare: (title: string) => void
  generationProgress?: GenerationProgress
  generatedAudioUrls?: string[]
  onGenerate?: () => void
}

export default function EpisodePreview({
  episode, pastEpisodes, shareToken, copied, listenCount,
  onGenerateShare, getShareUrl, onCopy, onShare,
  generationProgress, generatedAudioUrls, onGenerate,
}: EpisodePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [trackDurations, setTrackDurations] = useState<number[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

  const activeEpisode = selectedEpisode || episode
  const totalEpisodeDuration = activeEpisode.segments.reduce((sum, s) => sum + s.duration_seconds, 0)

  // Determine audio source — use generated audio if available
  const hasGeneratedAudio = generatedAudioUrls && generatedAudioUrls.length > 0
  const audioSrc = hasGeneratedAudio ? generatedAudioUrls[currentTrack] : undefined

  // Multi-track timing
  const totalAudioDuration = hasGeneratedAudio
    ? trackDurations.reduce((sum, d) => sum + d, 0)
    : 0
  const elapsedBefore = trackDurations.slice(0, currentTrack).reduce((sum, d) => sum + d, 0)
  const globalTime = elapsedBefore + currentTime
  const progress = hasGeneratedAudio
    ? (totalAudioDuration > 0 ? (globalTime / totalAudioDuration) * 100 : 0)
    : 0

  // Map current track to segment index
  useEffect(() => {
    if (hasGeneratedAudio) {
      setCurrentSegmentIndex(Math.min(currentTrack, activeEpisode.segments.length - 1))
    }
  }, [currentTrack, activeEpisode.segments.length, hasGeneratedAudio])

  // Auto-advance to next track
  const handleEnded = useCallback(() => {
    if (hasGeneratedAudio && generatedAudioUrls && currentTrack < generatedAudioUrls.length - 1) {
      setCurrentTrack(prev => prev + 1)
      setTimeout(() => audioRef.current?.play(), 50)
    } else {
      setIsPlaying(false)
      setCurrentTime(0)
      setCurrentTrack(0)
    }
  }, [hasGeneratedAudio, currentTrack, generatedAudioUrls])

  // Store track duration
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

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }, [isPlaying, audioSrc])

  const handleSkipBack = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = audio.currentTime - 15
    if (hasGeneratedAudio && newTime < 0 && currentTrack > 0) {
      setCurrentTrack(prev => prev - 1)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.duration + newTime)
          if (isPlaying) audioRef.current.play()
        }
      }, 50)
      return
    }
    audio.currentTime = Math.max(0, newTime)
  }, [hasGeneratedAudio, currentTrack, isPlaying])

  const handleSkipForward = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = audio.currentTime + 15
    if (hasGeneratedAudio && generatedAudioUrls && newTime > duration && currentTrack < generatedAudioUrls.length - 1) {
      setCurrentTrack(prev => prev + 1)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          if (isPlaying) audioRef.current.play()
        }
      }, 50)
      return
    }
    audio.currentTime = Math.min(audio.duration || 0, newTime)
  }, [hasGeneratedAudio, generatedAudioUrls, duration, currentTrack, isPlaying])

  // Scrubbing
  const seekToPosition = useCallback((clientX: number) => {
    if (!progressRef.current || !audioRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    audioRef.current.currentTime = ratio * duration
  }, [duration])

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

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setIsMuted(!isMuted)
  }, [isMuted])

  function handleShare() {
    if (!shareToken) onGenerateShare()
    setShowShareModal(true)
  }

  function handleSelectPastEpisode(ep: Episode) {
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.currentTime = 0 }
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentTrack(0)
    setCurrentSegmentIndex(0)
    setTrackDurations([])
    const isActive = selectedEpisode?.date === ep.date
    setSelectedEpisode(isActive ? null : ep)
  }

  const sourceSummary = activeEpisode.show_notes?.source_summary

  // Display time
  const displayCurrentTime = hasGeneratedAudio
    ? Math.floor(globalTime)
    : 0
  const displayTotalTime = hasGeneratedAudio && totalAudioDuration > 0
    ? Math.floor(totalAudioDuration)
    : totalEpisodeDuration

  return (
    <div className="space-y-4">
      {/* Audio element — only rendered when we have generated audio */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onLoadedMetadata={handleMetadata}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
        />
      )}

      {/* Header */}
      <div>
        <span className="caps-label" style={{ color: 'var(--accent-peach)' }}>
          {selectedEpisode ? 'PAST EPISODE' : 'EPISODE PREVIEW'}
        </span>
        <h2 className="text-xl font-bold mt-1 tracking-tight">{activeEpisode.title.split(' — ')[0]}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {activeEpisode.estimated_minutes} min &middot; {activeEpisode.tone.charAt(0).toUpperCase() + activeEpisode.tone.slice(1)} &middot; {activeEpisode.segments.length} segments
        </p>
        {sourceSummary && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Sourced from {sourceSummary.total_articles} articles &middot; {sourceSummary.tier_1_count} Tier 1
          </p>
        )}
        {selectedEpisode && (
          <button
            onClick={() => handleSelectPastEpisode(selectedEpisode)}
            className="text-xs font-semibold mt-2 transition-all-200"
            style={{ color: 'var(--accent-blue)' }}
          >
            Back to current episode
          </button>
        )}
      </div>

      {/* Generate Episode Button */}
      {onGenerate && (!generationProgress || generationProgress.status === 'idle') && (
        <button
          onClick={onGenerate}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-card transition-all-200"
          style={{
            background: 'linear-gradient(135deg, #FF6B35, #CC4E1F)',
            border: 'none',
          }}
        >
          <Zap size={18} strokeWidth={1.5} style={{ color: 'white' }} />
          <span className="text-sm font-bold text-white">Generate Episode Audio</span>
        </button>
      )}

      {/* Generation Progress */}
      {generationProgress && generationProgress.status === 'generating' && (
        <div
          className="rounded-card p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-end gap-0.5 h-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="wave-bar" style={{ width: 3, height: 16 }} />
              ))}
            </div>
            <span className="caps-label text-[10px]" style={{ color: 'var(--accent-pulse)' }}>GENERATING</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {generationProgress.segmentName}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Segment {generationProgress.currentSegment} of {generationProgress.totalSegments}
          </p>
          <div className="w-full h-1.5 rounded-full mt-3" style={{ backgroundColor: 'rgba(148,163,184,0.15)' }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${(generationProgress.currentSegment / generationProgress.totalSegments) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent-pulse), var(--accent-signal))',
              }}
            />
          </div>
        </div>
      )}

      {generationProgress && generationProgress.status === 'error' && (
        <div
          className="rounded-card p-4 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <p className="text-xs text-white">{generationProgress.error || 'Generation failed'}</p>
          {onGenerate && (
            <button onClick={onGenerate} className="text-xs font-semibold" style={{ color: 'var(--accent-pulse)' }}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Segment dots timeline (generated audio) */}
      {hasGeneratedAudio && (
        <div className="flex gap-1 px-1">
          {activeEpisode.segments.map((seg, i) => {
            const v = getVoice(seg.voice)
            return (
              <div
                key={i}
                className="h-1.5 rounded-full flex-1 transition-all"
                style={{
                  backgroundColor: i <= currentSegmentIndex ? v.color : `${v.color}30`,
                }}
              />
            )
          })}
        </div>
      )}

      {/* Timeline */}
      <div
        className="rounded-card p-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {activeEpisode.segments.map((segment, i) => (
          <SegmentRow
            key={i}
            segment={segment}
            isPlaying={currentSegmentIndex === i && isPlaying}
            isLast={i === activeEpisode.segments.length - 1}
          />
        ))}
      </div>

      {/* Player Bar — only shown when generated audio is available */}
      {hasGeneratedAudio && (
        <div
          className="rounded-card p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-3">
                  <div className="wave-bar" style={{ width: 2, height: 12, animationDuration: '0.8s' }} />
                  <div className="wave-bar" style={{ width: 2, height: 12, animationDuration: '1.0s', animationDelay: '0.1s' }} />
                  <div className="wave-bar" style={{ width: 2, height: 12, animationDuration: '0.9s', animationDelay: '0.2s' }} />
                </div>
              )}
              <span className="text-xs font-semibold text-white">
                {activeEpisode.segments[currentSegmentIndex]?.title}
              </span>
            </div>
            <span className="tabular-nums text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {formatSeconds(displayCurrentTime)} / {formatSeconds(displayTotalTime)}
            </span>
          </div>

          {/* Progress bar with scrubbing */}
          <div
            ref={progressRef}
            className="w-full relative mb-4 cursor-pointer group"
            style={{ height: 28, display: 'flex', alignItems: 'center' }}
            onMouseDown={e => handleProgressInteraction(e.clientX)}
            onTouchStart={e => {
              if (e.touches.length > 0) handleProgressInteraction(e.touches[0].clientX)
            }}
          >
            <div
              className="w-full rounded-full"
              style={{
                height: isScrubbing ? 6 : 5,
                backgroundColor: 'rgba(255,255,255,0.08)',
                transition: 'height 0.15s ease',
              }}
            >
              <div
                className="h-full rounded-full relative"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--accent-peach), var(--accent-blue))',
                  transition: isScrubbing ? 'none' : 'width 0.1s linear',
                }}
              >
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full transition-all"
                  style={{
                    width: isScrubbing ? 14 : 10,
                    height: isScrubbing ? 14 : 10,
                    backgroundColor: 'white',
                    boxShadow: '0 0 6px rgba(244,162,97,0.5)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center justify-center gap-5">
            <button onClick={toggleMute} className="p-2 transition-all-200 hover:opacity-70">
              {isMuted ? (
                <VolumeX size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              ) : (
                <Volume2 size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>
            <button
              onClick={handleSkipBack}
              className="flex flex-col items-center gap-0.5 p-2 transition-all-200 hover:opacity-70 active:scale-95"
            >
              <SkipBack size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>15s</span>
            </button>
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--accent-peach), var(--accent-blue))',
              }}
            >
              {isPlaying ? (
                <Pause size={20} strokeWidth={1.5} fill="white" style={{ color: 'white' }} />
              ) : (
                <Play size={20} strokeWidth={1.5} fill="white" style={{ color: 'white', marginLeft: 2 }} />
              )}
            </button>
            <button
              onClick={handleSkipForward}
              className="flex flex-col items-center gap-0.5 p-2 transition-all-200 hover:opacity-70 active:scale-95"
            >
              <SkipForward size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>15s</span>
            </button>
            <div className="w-[34px]" /> {/* Spacer for symmetry */}
          </div>
        </div>
      )}

      {/* Share Section */}
      <button
        onClick={handleShare}
        className="w-full flex items-center gap-3 p-4 rounded-card transition-all-200"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'
          e.currentTarget.style.borderColor = 'rgba(244,162,97,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'var(--bg-card)'
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
        }}
      >
        <Share2 size={18} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
        <span className="text-sm font-semibold text-white">Share this episode</span>
      </button>

      {/* Show Notes - Sources by Segment */}
      {activeEpisode.show_notes && (
        <div
          className="rounded-card p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>SHOW NOTES</span>
          <div className="mt-3 space-y-4">
            {activeEpisode.show_notes!.segments.map((seg, i) => (
              <div key={i}>
                <p className="text-xs font-bold text-white mb-1.5">{seg.title}</p>
                <div className="space-y-0.5">
                  {seg.sources.map((source, j) => (
                    <a
                      key={j}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 py-1 px-2 rounded-lg transition-all-200 hover:bg-white/5 group"
                    >
                      <TierDot tier={source.tier} />
                      <span className="text-[11px] font-medium text-white">{source.outlet}</span>
                      <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--text-muted)' }}>
                        {source.title}
                      </span>
                      <ExternalLink size={10} strokeWidth={1.5} className="flex-shrink-0 opacity-0 group-hover:opacity-100" style={{ color: 'var(--text-muted)' }} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Source summary */}
          {sourceSummary && (
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                This episode sourced from {sourceSummary.total_articles} articles across {sourceSummary.total_outlets} outlets. {sourceSummary.tier_1_count} primary sources, {sourceSummary.tier_2_count} specialist, {sourceSummary.tier_3_count} contextual.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Voice Interaction Preview */}
      <div
        className="rounded-card p-4"
        style={{
          backgroundColor: 'rgba(244,162,97,0.06)',
          border: '1px solid rgba(244,162,97,0.15)',
        }}
      >
        <span className="caps-label text-[10px]" style={{ color: 'var(--accent-peach)' }}>VOICE INTERACTION PREVIEW</span>
        <div className="mt-3 space-y-2.5">
          <div className="flex justify-end">
            <div
              className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-md text-xs"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              Tell me more about the NVIDIA guidance.
            </div>
          </div>
          <div className="flex justify-start">
            <div
              className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-md text-xs leading-relaxed"
              style={{
                backgroundColor: 'rgba(74,144,217,0.15)',
                color: 'var(--text-primary)',
              }}
            >
              NVIDIA's forward guidance suggests data center revenue could hit $22B next quarter. The key shift is inference workloads now approaching 40% of total GPU demand, up from 25% last quarter. According to the Wall Street Journal, this signals a maturing AI deployment cycle.
            </div>
          </div>
        </div>
        <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
          Voice interaction coming soon. Ask questions, dig deeper, get sources.
        </p>
      </div>

      {/* Past Episodes */}
      {pastEpisodes.length > 0 && (
        <div>
          <span className="caps-label" style={{ color: 'var(--text-muted)' }}>PAST EPISODES</span>
          <div className="mt-2 space-y-2">
            {pastEpisodes.map((ep, i) => {
              const isActive = selectedEpisode?.date === ep.date
              return (
                <button
                  key={i}
                  onClick={() => handleSelectPastEpisode(ep)}
                  className="w-full flex items-center gap-3 p-3 rounded-card text-left transition-all-200"
                  style={{
                    backgroundColor: isActive ? 'rgba(74,144,217,0.12)' : 'var(--bg-card)',
                    border: `1px solid ${isActive ? 'rgba(74,144,217,0.4)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: isActive ? 'rgba(74,144,217,0.2)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Radio size={16} strokeWidth={1.5} style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      {ep.title.split(' — ')[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={10} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {ep.estimated_minutes} min &middot; {ep.segments.length} segments
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareToken && (
        <ShareModal
          episode={activeEpisode}
          shareUrl={getShareUrl(shareToken)}
          copied={copied}
          listenCount={listenCount}
          onCopy={onCopy}
          onShare={() => onShare(activeEpisode.title)}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
