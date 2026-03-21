import { useState } from 'react'
import { ChevronDown, Plus, Pin, PinOff, Star, Minus, Sparkles, X, Tag } from 'lucide-react'
import type { UserTopic, Weight } from '../../lib/types'
import { getTopic } from '../../lib/constants'
import ToggleSwitch from '../ui/ToggleSwitch'
import WeightBadge from '../ui/WeightBadge'
import TopicPickerModal from './TopicPickerModal'

interface TopicsProps {
  topics: UserTopic[]
  discoveryEnabled: boolean
  onAddTopic: (topicId: string) => void
  onRemoveTopic: (topicId: string) => void
  onSetWeight: (topicId: string, weight: Weight) => void
  onTogglePin: (topicId: string) => void
  onToggleDiscovery: (enabled: boolean) => void
  onAddCustomTag: (topicId: string, tag: string) => void
  onRemoveCustomTag: (topicId: string, tag: string) => void
}

export default function Topics({
  topics, discoveryEnabled, onAddTopic, onRemoveTopic,
  onSetWeight, onTogglePin, onToggleDiscovery,
  onAddCustomTag, onRemoveCustomTag,
}: TopicsProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const weights: { value: Weight; label: string; icon: typeof Star }[] = [
    { value: 'featured', label: 'Featured', icon: Star },
    { value: 'standard', label: 'Standard', icon: Minus },
    { value: 'brief', label: 'Brief', icon: Minus },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="caps-label" style={{ color: 'var(--text-muted)' }}>YOUR TOPICS</span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {topics.length} of 12 active
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all-200"
          style={{
            border: '1px solid var(--accent-blue)',
            color: 'var(--accent-blue)',
          }}
        >
          <Plus size={14} strokeWidth={1.5} />
          Add Topic
        </button>
      </div>

      {/* Discovery Toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-card"
        style={{
          backgroundColor: 'rgba(244,162,97,0.06)',
          border: '1px solid rgba(244,162,97,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <Sparkles size={18} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
          <div>
            <p className="text-sm font-semibold text-white">Wild Card Discovery</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              One trending story outside your topics per episode
            </p>
          </div>
        </div>
        <ToggleSwitch checked={discoveryEnabled} onChange={onToggleDiscovery} />
      </div>

      {/* Topic Cards */}
      {topics.map(ut => {
        const topicDef = getTopic(ut.topic_id)
        if (!topicDef) return null
        const isExpanded = expandedTopic === ut.topic_id
        const TopicIcon = topicDef.icon

        return (
          <div
            key={ut.topic_id}
            className="rounded-card overflow-hidden transition-all-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: `1px solid ${isExpanded ? 'var(--border-active)' : 'var(--border-subtle)'}`,
            }}
          >
            {/* Collapsed header */}
            <button
              onClick={() => setExpandedTopic(isExpanded ? null : ut.topic_id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <TopicIcon size={20} strokeWidth={1.5} style={{ color: topicDef.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{topicDef.label}</span>
                  <WeightBadge weight={ut.weight} />
                  {ut.pinned && <Pin size={12} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />}
                </div>
                {ut.custom_tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Tag size={9} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {ut.custom_tags.join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                className="transition-transform duration-200"
                style={{
                  color: 'var(--text-muted)',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {/* Coverage Depth */}
                <div className="pt-4">
                  <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>COVERAGE DEPTH</span>
                  <div className="flex gap-2 mt-2">
                    {weights.map(({ value, label, icon: WIcon }) => (
                      <button
                        key={value}
                        onClick={() => onSetWeight(ut.topic_id, value)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all-200"
                        style={{
                          backgroundColor: ut.weight === value ? 'rgba(74,144,217,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${ut.weight === value ? 'rgba(74,144,217,0.4)' : 'var(--border-subtle)'}`,
                          color: ut.weight === value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        }}
                      >
                        {value === 'featured' && <WIcon size={12} strokeWidth={1.5} />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pin toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ut.pinned ? (
                      <PinOff size={14} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <Pin size={14} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-white">Pin to every episode</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Always included, even in short episodes</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={ut.pinned} onChange={() => onTogglePin(ut.topic_id)} />
                </div>

                {/* Sub-topics */}
                <div>
                  <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>INCLUDES</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {topicDef.subs.map(sub => (
                      <span
                        key={sub}
                        className="px-2 py-1 rounded-md text-[11px]"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Custom Tags */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag size={12} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
                    <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>YOUR TAGS</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ut.custom_tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium group"
                        style={{
                          backgroundColor: `${topicDef.color}15`,
                          border: `1px solid ${topicDef.color}30`,
                          color: topicDef.color,
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => onRemoveCustomTag(ut.topic_id, tag)}
                          className="opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={expandedTopic === ut.topic_id ? tagInput : ''}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          onAddCustomTag(ut.topic_id, tagInput.trim())
                          setTagInput('')
                        }
                      }}
                      placeholder="Add a tag (e.g., Liverpool news)"
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg outline-none"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={() => {
                        if (tagInput.trim()) {
                          onAddCustomTag(ut.topic_id, tagInput.trim())
                          setTagInput('')
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all-200"
                      style={{
                        backgroundColor: `${topicDef.color}20`,
                        border: `1px solid ${topicDef.color}40`,
                        color: topicDef.color,
                      }}
                    >
                      <Plus size={12} strokeWidth={1.5} />
                      Add
                    </button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    Custom tags help personalize your coverage within this topic
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => {
                    onRemoveTopic(ut.topic_id)
                    setExpandedTopic(null)
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all-200"
                  style={{
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                  }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <X size={14} strokeWidth={1.5} />
                    Remove Topic
                  </span>
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Picker Modal */}
      {showPicker && (
        <TopicPickerModal
          currentTopicIds={topics.map(t => t.topic_id)}
          onAdd={topicId => {
            onAddTopic(topicId)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
