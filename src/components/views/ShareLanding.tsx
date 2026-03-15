import { Play, Mic, ExternalLink } from 'lucide-react'
import type { Episode } from '../../lib/types'
import { getVoice, formatSeconds, SAMPLE_EPISODE } from '../../lib/constants'

function TierDot({ tier }: { tier: number }) {
  const color = tier === 1 ? 'var(--accent-blue)' : tier === 2 ? 'var(--success)' : 'var(--text-muted)'
  return <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
}

interface ShareLandingProps {
  shareToken?: string
}

export default function ShareLanding({ shareToken: _shareToken }: ShareLandingProps) {
  // In Phase 3, this would fetch from Supabase by share_token
  const episode: Episode = SAMPLE_EPISODE

  const sourceSummary = episode.show_notes?.source_summary

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-app mx-auto px-5 py-8 flex-1">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-white">puck</span>
            <span style={{ color: 'var(--accent-pulse)' }}>puck</span>
          </div>
        </div>

        {/* Episode Card */}
        <div
          className="rounded-card p-5 mb-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span className="caps-label" style={{ color: 'var(--accent-peach)' }}>SHARED EPISODE</span>
          <h1 className="text-lg font-bold mt-1 tracking-tight">{episode.title}</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {episode.estimated_minutes} min &middot; {episode.tone.charAt(0).toUpperCase() + episode.tone.slice(1)} &middot; {episode.segments.length} segments
          </p>
          {sourceSummary && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Sourced from {sourceSummary.total_articles} articles &middot; {sourceSummary.tier_1_count} Tier 1
            </p>
          )}
        </div>

        {/* Play Button */}
        <button
          className="w-full flex items-center justify-center gap-3 py-4 rounded-card mb-4 transition-all-200"
          style={{
            background: 'linear-gradient(135deg, var(--accent-peach), var(--accent-blue))',
          }}
        >
          <Play size={24} strokeWidth={1.5} fill="white" style={{ color: 'white' }} />
          <span className="text-base font-bold text-white">Play Episode</span>
        </button>

        {/* Read-only Timeline */}
        <div
          className="rounded-card p-4 mb-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {episode.segments.map((segment, i) => {
            const voice = getVoice(segment.voice)
            return (
              <div key={i} className="flex gap-0">
                <div className="w-[42px] flex-shrink-0 pt-1 text-right pr-3">
                  <span className="tabular-nums text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {formatSeconds(segment.start_time_seconds)}
                  </span>
                </div>
                <div className="w-5 flex-shrink-0 flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: voice.color }}
                  />
                  {i < episode.segments.length - 1 && (
                    <div className="w-px flex-1 my-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                  )}
                </div>
                <div className="flex-1 pb-3 pl-2">
                  <span className="text-sm font-bold text-white">{segment.title}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Mic size={10} strokeWidth={1.5} style={{ color: voice.color }} />
                    <span className="text-[11px] font-medium" style={{ color: voice.color }}>
                      {voice.name.replace('The ', '')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sources */}
        {episode.show_notes && (
          <div
            className="rounded-card p-4 mb-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>SOURCES</span>
            <div className="mt-2 space-y-3">
              {episode.show_notes.segments.map((seg, i) => (
                <div key={i}>
                  <p className="text-[11px] font-bold text-white mb-1">{seg.title}</p>
                  {seg.sources.map((source, j) => (
                    <a
                      key={j}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 py-0.5 group"
                    >
                      <TierDot tier={source.tier} />
                      <span className="text-[10px] font-medium text-white">{source.outlet}</span>
                      <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{source.title}</span>
                      <ExternalLink size={10} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100" style={{ color: 'var(--text-muted)' }} />
                    </a>
                  ))}
                </div>
              ))}
            </div>
            {sourceSummary && (
              <p className="text-[10px] mt-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                {sourceSummary.total_articles} articles across {sourceSummary.total_outlets} outlets
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-6">
          <p className="text-sm font-bold text-white mb-2">Get your own PuckPuck</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            AI-generated personalized news podcast, tailored to you.
          </p>
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all-200"
            style={{
              backgroundColor: 'var(--accent-peach)',
              color: '#0d0d1a',
            }}
          >
            Sign Up Free
          </button>
        </div>

        {/* Footer */}
        <div className="text-center py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Shared by You
          </p>
        </div>
      </div>
    </div>
  )
}
