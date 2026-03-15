import { useState } from 'react'
import { Mic, ChevronDown, ExternalLink } from 'lucide-react'
import type { EpisodeSegment, SegmentSource } from '../../lib/types'
import { getVoice, formatSeconds } from '../../lib/constants'

function TierDot({ tier }: { tier: number }) {
  const color = tier === 1 ? 'var(--accent-blue)' : tier === 2 ? 'var(--success)' : 'var(--text-muted)'
  return (
    <div
      className="flex-shrink-0 w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

function SourceRow({ source }: { source: SegmentSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all-200 hover:bg-white/5 group"
    >
      <TierDot tier={source.tier} />
      <span className="text-xs font-medium text-white">{source.outlet}</span>
      <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-muted)' }}>
        {source.title}
      </span>
      <ExternalLink size={12} strokeWidth={1.5} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
    </a>
  )
}

interface SegmentRowProps {
  segment: EpisodeSegment
  isPlaying?: boolean
  isLast?: boolean
}

export default function SegmentRow({ segment, isPlaying, isLast }: SegmentRowProps) {
  const [expanded, setExpanded] = useState(false)
  const voice = getVoice(segment.voice)

  return (
    <div className="flex gap-0">
      {/* Time column */}
      <div className="w-[42px] flex-shrink-0 pt-1 text-right pr-3">
        <span className="tabular-nums text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {formatSeconds(segment.start_time_seconds)}
        </span>
      </div>

      {/* Dot + line column */}
      <div className="w-5 flex-shrink-0 flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
          style={{
            backgroundColor: voice.color,
            boxShadow: isPlaying ? `0 0 8px ${voice.color}80` : 'none',
          }}
        />
        {!isLast && (
          <div className="w-px flex-1 my-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 pb-4 pl-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-center gap-2 group"
        >
          <div className="flex-1">
            <span
              className="text-sm font-bold"
              style={{
                color: isPlaying ? 'var(--accent-blue)' : 'var(--text-primary)',
              }}
            >
              {segment.title}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <Mic size={10} strokeWidth={1.5} style={{ color: voice.color }} />
              <span className="text-[11px] font-medium" style={{ color: voice.color }}>
                {voice.name.replace('The ', '')}
              </span>
              <span className="text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>
                {formatSeconds(segment.duration_seconds)}
              </span>
            </div>
          </div>
          {(segment.script || (segment.sources && segment.sources.length > 0)) && (
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className="transition-transform duration-200"
              style={{
                color: 'var(--text-muted)',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              }}
            />
          )}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {segment.script && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {segment.script}
              </p>
            )}
            {segment.sources && segment.sources.length > 0 && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="caps-label text-[9px]" style={{ color: 'var(--text-muted)' }}>SOURCES</span>
                <div className="mt-1 space-y-0.5">
                  {segment.sources.map((source, i) => (
                    <SourceRow key={i} source={source} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
