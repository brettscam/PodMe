import { useState } from 'react'
import {
  Gauge, Clock, Sliders, Baby, Dumbbell, BookOpen, Home as HomeIcon, Briefcase,
  ChevronDown, ChevronUp, Mail, Eye, ChevronRight,
} from 'lucide-react'
import type { UserProfile, Tone, Length, Cadence, LifeContext, ViewName } from '../../lib/types'
import ToggleSwitch from '../ui/ToggleSwitch'
import ThrottleOption from '../ui/ThrottleOption'

const LIFE_CONTEXT_TYPES = [
  { type: 'parenting' as const, label: 'Parenting', icon: Baby, desc: 'Age-appropriate activities, milestones, tips', color: '#FF6B35' },
  { type: 'fitness' as const, label: 'Fitness', icon: Dumbbell, desc: 'Training tips, goals, recovery', color: '#10B981' },
  { type: 'learning' as const, label: 'Learning', icon: BookOpen, desc: 'Skills, courses, study tips', color: '#2563EB' },
  { type: 'home' as const, label: 'Home', icon: HomeIcon, desc: 'Projects, seasonal maintenance', color: '#F59E0B' },
  { type: 'career' as const, label: 'Career', icon: Briefcase, desc: 'Goals, growth, industry trends', color: '#8B5CF6' },
]

interface ProfileProps {
  profile: UserProfile
  userName?: string
  lifeContexts: LifeContext[]
  onSetTone: (tone: Tone) => void
  onSetLength: (length: Length) => void
  onSetCadence: (cadence: Cadence) => void
  onDeliveryTimeChange: (time: string) => void
  onToggleEmailDigest: (enabled: boolean) => void
  onPreviewEmail?: () => void
  onToggleLifeContext: (id: string, enabled: boolean) => void
  onUpdateLifeContextConfig: (id: string, config: Record<string, string>) => void
  onNavigate: (view: ViewName) => void
  onSignOut: () => void
}

export default function Profile({
  profile, userName, lifeContexts,
  onSetTone, onSetLength, onSetCadence,
  onDeliveryTimeChange, onToggleEmailDigest, onPreviewEmail,
  onToggleLifeContext, onUpdateLifeContextConfig,
  onNavigate, onSignOut,
}: ProfileProps) {
  const [expandedContext, setExpandedContext] = useState<string | null>(null)
  const [showThrottles, setShowThrottles] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <span className="caps-label" style={{ color: 'var(--text-muted)' }}>YOUR PROFILE</span>
        <h2 className="text-xl font-bold mt-1 tracking-tight">
          {userName || 'Settings'}
        </h2>
      </div>

      {/* Podcast Controls (Throttles) */}
      <div
        className="rounded-card overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={() => setShowThrottles(!showThrottles)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <Sliders size={18} strokeWidth={1.5} style={{ color: 'var(--accent-pulse)' }} />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Podcast Controls</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {profile.tone} &middot; {profile.length === 'quick' ? '10 min' : profile.length === 'standard' ? '25 min' : '42 min'} &middot; {profile.cadence}
              </p>
            </div>
          </div>
          {showThrottles ? (
            <ChevronUp size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          )}
        </button>

        {showThrottles && (
          <div className="px-4 pb-4 space-y-4">
            {/* Tone */}
            <div>
              <span className="caps-label text-[9px]" style={{ color: 'var(--text-muted)' }}>TONE</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <ThrottleOption
                  icon={Gauge}
                  label="Factual"
                  description="Just the facts"
                  selected={profile.tone === 'factual'}
                  onClick={() => onSetTone('factual')}
                />
                <ThrottleOption
                  icon={Gauge}
                  label="Mixed"
                  description="Facts + context"
                  selected={profile.tone === 'mixed'}
                  onClick={() => onSetTone('mixed')}
                />
                <ThrottleOption
                  icon={Gauge}
                  label="Commentary"
                  description="Analysis + opinion"
                  selected={profile.tone === 'commentary'}
                  onClick={() => onSetTone('commentary')}
                />
              </div>
            </div>

            {/* Length */}
            <div>
              <span className="caps-label text-[9px]" style={{ color: 'var(--text-muted)' }}>LENGTH</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <ThrottleOption
                  icon={Clock}
                  label="Quick"
                  description="~10 min"
                  selected={profile.length === 'quick'}
                  onClick={() => onSetLength('quick')}
                />
                <ThrottleOption
                  icon={Clock}
                  label="Standard"
                  description="~25 min"
                  selected={profile.length === 'standard'}
                  onClick={() => onSetLength('standard')}
                />
                <ThrottleOption
                  icon={Clock}
                  label="Deep"
                  description="~42 min"
                  selected={profile.length === 'deep'}
                  onClick={() => onSetLength('deep')}
                />
              </div>
            </div>

            {/* Cadence */}
            <div>
              <span className="caps-label text-[9px]" style={{ color: 'var(--text-muted)' }}>CADENCE</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <ThrottleOption
                  icon={Gauge}
                  label="Daily"
                  description="Every morning"
                  selected={profile.cadence === 'daily'}
                  onClick={() => onSetCadence('daily')}
                />
                <ThrottleOption
                  icon={Gauge}
                  label="Weekly"
                  description="Weekend digest"
                  selected={profile.cadence === 'weekly'}
                  onClick={() => onSetCadence('weekly')}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Time */}
      <div
        className="flex items-center justify-between p-4 rounded-card"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div>
          <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>DELIVERY TIME</span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Ready by {profile.delivery_time.replace(/^0/, '')} AM
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

      {/* Email Digest */}
      <div
        className="rounded-card overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Mail size={18} strokeWidth={1.5} style={{ color: 'var(--accent-signal)' }} />
            <div>
              <p className="text-sm font-semibold text-white">Email Digest</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Written summary via email
              </p>
            </div>
          </div>
          <ToggleSwitch checked={profile.email_digest} onChange={onToggleEmailDigest} />
        </div>
        {profile.email_digest && onPreviewEmail && (
          <button
            onClick={onPreviewEmail}
            className="w-full flex items-center justify-between px-4 pb-4"
          >
            <div className="flex items-center gap-2">
              <Eye size={14} strokeWidth={1.5} style={{ color: 'var(--accent-pulse)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--accent-pulse)' }}>Preview Email</span>
            </div>
            <ChevronRight size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* Life Contexts — "My Life" */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="caps-label" style={{ color: 'var(--text-muted)' }}>MY LIFE</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Personalize your episodes
          </span>
        </div>

        <div className="space-y-2">
          {LIFE_CONTEXT_TYPES.map(({ type, label, icon: Icon, desc, color }) => {
            const context = lifeContexts.find(c => c.type === type)
            const isEnabled = context?.enabled ?? false
            const isExpanded = expandedContext === type

            return (
              <div
                key={type}
                className="rounded-card overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${isEnabled ? `${color}40` : 'var(--border-subtle)'}` }}
              >
                <div className="flex items-center gap-3 p-4">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}1F` }}
                  >
                    <Icon size={18} strokeWidth={1.5} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                  <ToggleSwitch
                    checked={isEnabled}
                    onChange={enabled => onToggleLifeContext(type, enabled)}
                  />
                </div>

                {isEnabled && (
                  <button
                    onClick={() => setExpandedContext(isExpanded ? null : type)}
                    className="w-full flex items-center justify-between px-4 pb-3"
                  >
                    <span className="text-[11px] font-medium" style={{ color }}>
                      {isExpanded ? 'Hide details' : 'Configure'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <ChevronDown size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                )}

                {isEnabled && isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {type === 'parenting' && (
                      <>
                        <ContextField
                          label="Child's name"
                          value={context?.config.childName || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, childName: v })}
                          placeholder="e.g., Oliver"
                        />
                        <ContextField
                          label="Age"
                          value={context?.config.childAge || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, childAge: v })}
                          placeholder="e.g., 6 months"
                        />
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Your episode will include age-appropriate activities, milestones, and tips.
                        </p>
                      </>
                    )}
                    {type === 'fitness' && (
                      <>
                        <ContextField
                          label="Current goal"
                          value={context?.config.goal || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, goal: v })}
                          placeholder="e.g., Marathon training, strength building"
                        />
                        <ContextField
                          label="Schedule"
                          value={context?.config.schedule || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, schedule: v })}
                          placeholder="e.g., 5x/week, MWF"
                        />
                      </>
                    )}
                    {type === 'learning' && (
                      <>
                        <ContextField
                          label="What are you learning?"
                          value={context?.config.subject || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, subject: v })}
                          placeholder="e.g., Machine learning, Spanish, Piano"
                        />
                      </>
                    )}
                    {type === 'home' && (
                      <>
                        <ContextField
                          label="Current project"
                          value={context?.config.project || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, project: v })}
                          placeholder="e.g., Kitchen renovation, garden"
                        />
                      </>
                    )}
                    {type === 'career' && (
                      <>
                        <ContextField
                          label="Role"
                          value={context?.config.role || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, role: v })}
                          placeholder="e.g., Product Manager, Engineer"
                        />
                        <ContextField
                          label="Focus area"
                          value={context?.config.focus || ''}
                          onChange={v => onUpdateLifeContextConfig(type, { ...context?.config, focus: v })}
                          placeholder="e.g., Leadership, technical skills"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-2">
        <button
          onClick={() => onNavigate('topics')}
          className="w-full flex items-center justify-between p-4 rounded-card transition-all-200"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-semibold text-white">Manage Topics</span>
          <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </button>
        <button
          onClick={() => onNavigate('voices')}
          className="w-full flex items-center justify-between p-4 rounded-card transition-all-200"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-semibold text-white">Voice Library</span>
          <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="w-full py-3 rounded-card text-sm font-semibold transition-all-200"
        style={{
          backgroundColor: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#EF4444',
        }}
      >
        Sign Out
      </button>
    </div>
  )
}

function ContextField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 px-3 py-2 rounded-lg text-xs"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  )
}
