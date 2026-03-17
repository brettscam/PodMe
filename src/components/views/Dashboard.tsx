import { useMemo } from 'react'
import { Gauge, Clock, Hash, Mic, ChevronRight, BookOpen, Mail, Lightbulb, Eye, MessageSquareQuote } from 'lucide-react'
import type { UserProfile, UserTopic, ViewName, KnowledgeBlock, Episode } from '../../lib/types'
import { getTopic, getVoice, estimateMinutes, TOPIC_CATALOG, getPersonalizedKnowledgeBlock } from '../../lib/constants'
import TopicChip from '../ui/TopicChip'
import ToggleSwitch from '../ui/ToggleSwitch'
import MiniPlayer from '../ui/MiniPlayer'

interface DashboardProps {
  profile: UserProfile
  topics: UserTopic[]
  episode: Episode
  generatedAudioUrls?: string[]
  generationStatus?: 'idle' | 'generating' | 'complete' | 'error'
  onNavigate: (view: ViewName) => void
  onDeliveryTimeChange: (time: string) => void
  onToggleEmailDigest: (enabled: boolean) => void
  onPreviewEmail?: () => void
  onGenerate?: () => void
  onRegenerate?: () => void
}

export default function Dashboard({ profile, topics, episode, generatedAudioUrls, generationStatus, onNavigate, onDeliveryTimeChange, onToggleEmailDigest, onPreviewEmail, onGenerate, onRegenerate }: DashboardProps) {
  const duration = estimateMinutes(profile.length)
  const knowledgeBlock = useMemo<KnowledgeBlock>(() => getPersonalizedKnowledgeBlock(topics.map(t => t.topic_id)), [topics])

  const quickControls = [
    { icon: Gauge, label: 'TONE', value: profile.tone.charAt(0).toUpperCase() + profile.tone.slice(1), view: 'throttles' as ViewName },
    { icon: Clock, label: 'LENGTH', value: `${duration} min`, view: 'throttles' as ViewName },
    { icon: Hash, label: 'TOPICS', value: `${topics.length} active`, view: 'topics' as ViewName },
    { icon: Mic, label: 'VOICE', value: getVoice(profile.default_voice).name.replace('The ', ''), view: 'voices' as ViewName },
  ]

  return (
    <div className="space-y-4">
      {/* Player — front and center */}
      <MiniPlayer episode={episode} generatedAudioUrls={generatedAudioUrls} generationStatus={generationStatus} onViewEpisode={() => onNavigate('episode')} onGenerate={onGenerate} onRegenerate={onRegenerate} />

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

      {/* Quick Controls Grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickControls.map(({ icon: Icon, label, value, view }) => (
          <button
            key={label}
            onClick={() => onNavigate(view)}
            className="flex items-center gap-3 p-4 rounded-card transition-all-200 text-left group"
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
            <Icon size={22} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
            <div>
              <span className="caps-label text-[9px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
            </div>
          </button>
        ))}
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

      {/* Delivery Time */}
      <div
        className="flex items-center justify-between p-4 rounded-card"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>DELIVERY TIME</span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Ready by {profile.delivery_time.replace(/^0/, '')} AM every morning
          </p>
        </div>
        <input
          type="time"
          value={profile.delivery_time}
          onChange={e => onDeliveryTimeChange(e.target.value)}
          className="text-sm font-semibold px-2 py-1 rounded-lg"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Email Digest Toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-card"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <Mail size={18} strokeWidth={1.5} style={{ color: 'var(--accent-blue)' }} />
          <div>
            <p className="text-sm font-semibold text-white">Email Digest</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Receive a written summary of your episode via email
            </p>
          </div>
        </div>
        <ToggleSwitch checked={profile.email_digest} onChange={onToggleEmailDigest} />
      </div>

      {/* Email Preview Button (shown when digest is on) */}
      {profile.email_digest && onPreviewEmail && (
        <button
          onClick={onPreviewEmail}
          className="w-full flex items-center justify-between p-4 rounded-card transition-all-200"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }}
        >
          <div className="flex items-center gap-3">
            <Eye size={18} strokeWidth={1.5} style={{ color: 'var(--accent-pulse)' }} />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Preview Email Digest</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                See what tomorrow's email will look like
              </p>
            </div>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </button>
      )}

    </div>
  )
}
