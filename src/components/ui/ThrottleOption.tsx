import type { LucideIcon } from 'lucide-react'
import { CircleDot } from 'lucide-react'

interface ThrottleOptionProps {
  icon: LucideIcon
  label: string
  description: string
  selected: boolean
  onClick: () => void
}

export default function ThrottleOption({ icon: Icon, label, description, selected, onClick }: ThrottleOptionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all-200 text-left"
      style={{
        backgroundColor: selected ? 'rgba(74,144,217,0.12)' : 'transparent',
        border: `1px solid ${selected ? 'rgba(74,144,217,0.4)' : 'transparent'}`,
      }}
    >
      <Icon
        size={20}
        strokeWidth={1.5}
        style={{ color: selected ? 'var(--accent-blue)' : 'var(--text-muted)' }}
      />
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: selected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {description}
        </div>
      </div>
      {selected && (
        <CircleDot size={18} strokeWidth={1.5} style={{ color: 'var(--accent-blue)' }} />
      )}
    </button>
  )
}
