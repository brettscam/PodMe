import { useMemo } from 'react'
import { ChevronRight, BookOpen, Lightbulb, MessageSquareQuote } from 'lucide-react'
import EpisodeLoadingCard from '../ui/EpisodeLoadingCard'
import type { UserProfile, UserTopic, ViewName, KnowledgeBlock, Episode } from '../../lib/types'
import { getTopic, estimateMinutes, TOPIC_CATALOG, getPersonalizedKnowledgeBlock } from '../../lib/constants'
import TopicChip from '../ui/TopicChip'
import MiniPlayer from '../ui/MiniPlayer'

interface DashboardProps {
  profile: UserProfile
  topics: UserTopic[]
  episode: Episode | null
  generatedAudioUrls?: string[]
  generationStatus?: 'idle' | 'loading_cache' | 'generating' | 'complete' | 'error'
  generationError?: string
  episodeLoading?: boolean
  episodeError?: string | null
  onNavigate: (view: ViewName) => void
  onGenerate?: () => void
  onRegenerate?: () => void
}

export default function Dashboard({ profile, topics, episode, generatedAudioUrls, generationStatus, generationError, episodeLoading, episodeError, onNavigate, onGenerate, onRegenerate }: DashboardProps) {
  const duration = estimateMinutes(profile.length)
  const knowledgeBlock = useMemo<KnowledgeBlock>(() => getPersonalizedKnowledgeBlock(topics.map(t => t.topic_id)), [topics])

  return (
    <div className="space-y-4">
      {/* Player — front and center */}
      {episodeLoading ? (
        <EpisodeLoadingCard />
      ) : episodeError ? (
        <div className="rounded-card p-6" style={{ background: 'linear-gradient(135deg, #1a0f0f 0%, #1E2433 100%)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-sm font-semibold text-red-400 mb-2">Episode generation failed</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{episodeError}</p>
          <button
            onClick={onGenerate}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, var(--accent-pulse), #E85D26)', color: 'white' }}
          >
            Retry
          </button>
        </div>
      ) : episode ? (
        <MiniPlayer episode={episode} generatedAudioUrls={generatedAudioUrls} generationStatus={generationStatus} generationError={generationError} onViewEpisode={() => onNavigate('episode')} onGenerate={onGenerate} onRegenerate={onRegenerate} />
      ) : (
        <div className="rounded-card p-6 text-center" style={{ background: 'linear-gradient(135deg, #0F1320 0%, #1E2433 100%)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onGenerate}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, var(--accent-pulse), #E85D26)', color: 'white' }}
          >
            Generate Today's Episode
          </button>
        </div>
      )}

      {/* Knowledge Block — personalized to user topics */}
      <div
        className="rounded-card p-5"
        style={{
          backgroundColor: knowledgeBlock.type === 'word_of_the_day'
            ? 'rgba(74,144,217,0.06)'
            : knowledgeBlock.type === 'quote_of_the_day'
              ? 'rgba(147,51,234,0.06)'
              : 'rgba(244,162,97,0.06)',
          border: `1px solid ${knowledgeBlock.type === 'word_of_the_day'
            ? 'rgba(74,144,217,0.15)'
            : knowledgeBlock.type === 'quote_of_the_day'
              ? 'rgba(147,51,234,0.15)'
              : 'rgba(244,162,97,0.15)'}`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          {knowledgeBlock.type === 'word_of_the_day' ? (
            <BookOpen size={16} strokeWidth={1.5} style={{ color: 'var(--accent-blue)' }} />
          ) : knowledgeBlock.type === 'quote_of_the_day' ? (
            <MessageSquareQuote size={16} strokeWidth={1.5} style={{ color: '#9333EA' }} />
          ) : (
            <Lightbulb size={16} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
          )}
          <span
            className="caps-label text-[10px]"
            style={{
              color: knowledgeBlock.type === 'word_of_the_day'
                ? 'var(--accent-blue)'
                : knowledgeBlock.type === 'quote_of_the_day'
                  ? '#9333EA'
                  : 'var(--accent-peach)',
            }}
          >
            {knowledgeBlock.type === 'word_of_the_day'
              ? 'WORD OF THE DAY'
              : knowledgeBlock.type === 'quote_of_the_day'
                ? 'QUOTE OF THE DAY'
                : 'FACT OF THE DAY'}
          </span>
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">
          {knowledgeBlock.title}
        </h3>
        <p className="text-xs leading-relaxed mt-1.5" style={{ color: 'var(--text-secondary)' }}>
          {knowledgeBlock.content}
        </p>
        {knowledgeBlock.source && (
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Source: {knowledgeBlock.source}
          </p>
        )}
      </div>

      {/* Next Episode Card */}
      <div
        className="rounded-card p-5"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="caps-label" style={{ color: 'var(--accent-peach)' }}>NEXT EPISODE</span>
            <h2 className="text-2xl font-bold mt-1 tracking-tight">
              Tomorrow, {(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) })()}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Ready by {profile.delivery_time.replace(/^0/, '')} AM
            </p>
          </div>
          <span
            className="caps-label px-2.5 py-1 rounded-full text-[10px]"
            style={{ backgroundColor: 'rgba(244,162,97,0.15)', color: 'var(--accent-peach)' }}
          >
            {profile.cadence.toUpperCase()} &middot; {duration} MIN
          </span>
        </div>

        {/* Topic chips scroll */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {topics.map(ut => {
            const topic = getTopic(ut.topic_id)
            if (!topic) return null
            const def = TOPIC_CATALOG.find(t => t.id === ut.topic_id)
            if (!def) return null
            return (
              <TopicChip
                key={ut.topic_id}
                topic={def}
                featured={ut.weight === 'featured'}
                pinned={ut.pinned}
              />
            )
          })}
        </div>
      </div>

      {/* Episode Preview Button */}
      <button
        onClick={() => onNavigate('episode')}
        className="w-full flex items-center justify-between p-5 rounded-card transition-all-200"
        style={{
          background: 'linear-gradient(135deg, var(--accent-blue-dark), rgba(74,144,217,0.3))',
          border: '1px solid rgba(74,144,217,0.3)',
        }}
      >
        <div>
          <span className="caps-label text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>EPISODE DETAILS</span>
          <p className="text-sm font-bold text-white mt-0.5">View Full Episode & Show Notes</p>
        </div>
        <ChevronRight size={20} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.5)' }} />
      </button>

    </div>
  )
}
