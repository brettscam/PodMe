import { Pin } from 'lucide-react'
import type { TopicDefinition } from '../../lib/types'

interface TopicChipProps {
  topic: TopicDefinition
  featured?: boolean
  pinned?: boolean
}

export default function TopicChip({ topic, featured, pinned }: TopicChipProps) {
  const Icon = topic.icon

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-xs font-medium"
      style={{
        backgroundColor: featured ? `${topic.color}20` : 'var(--bg-card)',
        border: `1px solid ${featured ? `${topic.color}40` : 'var(--border-subtle)'}`,
        color: featured ? topic.color : 'var(--text-secondary)',
      }}
    >
      <Icon size={12} strokeWidth={1.5} />
      <span>{topic.label}</span>
      {pinned && <Pin size={10} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />}
    </div>
  )
}
