import { X, Check } from 'lucide-react'
import { TOPIC_CATALOG } from '../../lib/constants'

interface TopicPickerModalProps {
  currentTopicIds: string[]
  onAdd: (topicId: string) => void
  onClose: () => void
}

export default function TopicPickerModal({ currentTopicIds, onAdd, onClose }: TopicPickerModalProps) {
  const availableTopics = TOPIC_CATALOG.filter(t => !currentTopicIds.includes(t.id))

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-app mx-4 mb-0 rounded-t-2xl overflow-hidden"
        style={{
          backgroundColor: '#1a1a2e',
          border: '1px solid var(--border-subtle)',
          maxHeight: '70vh',
        }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-base font-bold">Add Topic</h3>
          <button onClick={onClose} className="p-1 hover:opacity-70 transition-all-200">
            <X size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-2" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {availableTopics.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              All topics have been added
            </p>
          )}
          {availableTopics.map(topic => {
            const Icon = topic.icon
            return (
              <button
                key={topic.id}
                onClick={() => onAdd(topic.id)}
                className="w-full flex items-center gap-3 p-4 rounded-card text-left transition-all-200"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'
                  e.currentTarget.style.borderColor = `${topic.color}40`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card)'
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${topic.color}1F`,
                    border: `1px solid ${topic.color}4D`,
                  }}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ color: topic.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{topic.label}</p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {topic.subs.slice(0, 3).join(' · ')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
