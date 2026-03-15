import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Share2, ExternalLink, Clock, Radio, ChevronRight } from 'lucide-react'
import type { Episode } from '../../lib/types'
import { formatSeconds } from '../../lib/constants'
import SegmentRow from '../ui/SegmentRow'
import ShareModal from '../ui/ShareModal'

function TierDot({ tier }: { tier: number }) {
  const color = tier === 1 ? 'var(--accent-blue)' : tier === 2 ? 'var(--success)' : 'var(--text-muted)'
  return <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
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
}

export default function EpisodePreview({
  episode, pastEpisodes, shareToken, copied, listenCount,
  onGenerateShare, getShareUrl, onCopy, onShare,
}: EpisodePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeEpisode = selectedEpisode || episode
  const totalDuration = activeEpisode.segments.reduce((sum, s) => sum + s.duration_seconds, 0)

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function handlePlayPause() {
    if (isPlaying) {
      stopPlayback()
    } else {
      setIsPlaying(true)
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            stopPlayback()
            return 0
          }
          return prev + 0.2
        })
      }, 100)
    }
  }

  function handleShare() {
    if (!shareToken) onGenerateShare()
    setShowShareModal(true)
  }

  const sourceSummary = activeEpisode.show_notes?.source_summary

  return (
    <div className="space-y-4">
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
            onClick={() => { setSelectedEpisode(null); stopPlayback(); setProgress(0); setCurrentSegmentIndex(0) }}
            className="text-xs font-semibold mt-2 transition-all-200"
            style={{ color: 'var(--accent-blue)' }}
          >
            Back to current episode
          </button>
        )}
      </div>

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

      {/* Player Bar */}
      <div
        className="rounded-card p-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white">
            {activeEpisode.segments[currentSegmentIndex]?.title}
          </span>
          <span className="tabular-nums text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {formatSeconds(Math.floor(totalDuration * progress / 100))} / {formatSeconds(totalDuration)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent-peach), var(--accent-blue))',
            }}
          />
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
            className="p-2 transition-all-200 hover:opacity-70"
          >
            <SkipBack size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all-200"
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
            onClick={() => setCurrentSegmentIndex(Math.min(activeEpisode.segments.length - 1, currentSegmentIndex + 1))}
            className="p-2 transition-all-200 hover:opacity-70"
          >
            <SkipForward size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

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
                  onClick={() => {
                    stopPlayback()
                    setProgress(0)
                    setCurrentSegmentIndex(0)
                    setSelectedEpisode(isActive ? null : ep)
                  }}
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
