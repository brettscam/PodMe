import { Gauge, Clock, Hash, Mic, ChevronRight } from 'lucide-react'
import type { UserProfile, UserTopic, ViewName } from '../../lib/types'
import { getTopic, getVoice, estimateMinutes, TOPIC_CATALOG } from '../../lib/constants'
import TopicChip from '../ui/TopicChip'

interface DashboardProps {
  profile: UserProfile
  topics: UserTopic[]
  onNavigate: (view: ViewName) => void
  onDeliveryTimeChange: (time: string) => void
}

export default function Dashboard({ profile, topics, onNavigate, onDeliveryTimeChange }: DashboardProps) {
  const duration = estimateMinutes(profile.length)

  const quickControls = [
    { icon: Gauge, label: 'TONE', value: profile.tone.charAt(0).toUpperCase() + profile.tone.slice(1), view: 'throttles' as ViewName },
    { icon: Clock, label: 'LENGTH', value: `${duration} min`, view: 'throttles' as ViewName },
    { icon: Hash, label: 'TOPICS', value: `${topics.length} active`, view: 'topics' as ViewName },
    { icon: Mic, label: 'VOICE', value: getVoice(profile.default_voice).name.replace('The ', ''), view: 'voices' as ViewName },
  ]

  return (
    <div className="space-y-4">
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
              Tomorrow, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
          <span className="caps-label text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>PREVIEW</span>
          <p className="text-sm font-bold text-white mt-0.5">Tomorrow's Episode Lineup</p>
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
    </div>
  )
}
