import { Star, Minus } from 'lucide-react'
import type { Weight } from '../../lib/types'

interface WeightBadgeProps {
  weight: Weight
}

const WEIGHT_CONFIG: Record<Weight, { label: string; icon: typeof Star | null; color: string }> = {
  featured: { label: 'Featured', icon: Star, color: 'var(--accent-blue)' },
  standard: { label: 'Standard', icon: null, color: 'var(--text-secondary)' },
  brief: { label: 'Brief', icon: Minus, color: 'var(--text-muted)' },
}

export default function WeightBadge({ weight }: WeightBadgeProps) {
  const config = WEIGHT_CONFIG[weight]
  const Icon = config.icon

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        backgroundColor: `${config.color}18`,
        color: config.color,
      }}
    >
      {Icon && <Icon size={10} strokeWidth={1.5} />}
      {config.label}
    </span>
  )
}
