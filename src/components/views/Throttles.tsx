import { Gauge, Clock, Calendar, Newspaper, Radio, Flame, Zap, Target, Waves, Sun } from 'lucide-react'
import type { Tone, Length, Cadence } from '../../lib/types'
import ThrottleOption from '../ui/ThrottleOption'

interface ThrottlesProps {
  tone: Tone
  length: Length
  cadence: Cadence
  onSetTone: (tone: Tone) => void
  onSetLength: (length: Length) => void
  onSetCadence: (cadence: Cadence) => void
}

export default function Throttles({ tone, length, cadence, onSetTone, onSetLength, onSetCadence }: ThrottlesProps) {
  return (
    <div className="space-y-4">
      {/* Tone */}
      <div
        className="rounded-card p-5"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={18} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
          <h3 className="text-[17px] font-bold">Tone</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>How your news is delivered</p>
        <div className="space-y-1">
          <ThrottleOption
            icon={Newspaper}
            label="Factual"
            description="Straight reporting. Sources cited. Wire-service tone."
            selected={tone === 'factual'}
            onClick={() => onSetTone('factual')}
          />
          <ThrottleOption
            icon={Radio}
            label="Mixed"
            description='Facts first, with "why it matters" framing. NPR tone.'
            selected={tone === 'mixed'}
            onClick={() => onSetTone('mixed')}
          />
          <ThrottleOption
            icon={Flame}
            label="Commentary"
            description="Full editorial voice. Analysis and hot takes. Flagged as opinion."
            selected={tone === 'commentary'}
            onClick={() => onSetTone('commentary')}
          />
        </div>
      </div>

      {/* Length */}
      <div
        className="rounded-card p-5"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
          <h3 className="text-[17px] font-bold">Length</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Episode duration preference</p>
        <div className="space-y-1">
          <ThrottleOption
            icon={Zap}
            label="Quick Brief"
            description="8-12 min. Short commute, coffee check-in."
            selected={length === 'quick'}
            onClick={() => onSetLength('quick')}
          />
          <ThrottleOption
            icon={Target}
            label="Standard"
            description="20-30 min. Average commute, morning run."
            selected={length === 'standard'}
            onClick={() => onSetLength('standard')}
          />
          <ThrottleOption
            icon={Waves}
            label="Deep Dive"
            description="35-50 min. Long commute, weekend catch-up."
            selected={length === 'deep'}
            onClick={() => onSetLength('deep')}
          />
        </div>
      </div>

      {/* Cadence */}
      <div
        className="rounded-card p-5"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={18} strokeWidth={1.5} style={{ color: 'var(--accent-peach)' }} />
          <h3 className="text-[17px] font-bold">Cadence</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>How often you get a new episode</p>
        <div className="space-y-1">
          <ThrottleOption
            icon={Sun}
            label="Daily"
            description="Fresh episode every morning. Last 24 hours."
            selected={cadence === 'daily'}
            onClick={() => onSetCadence('daily')}
          />
          <ThrottleOption
            icon={Calendar}
            label="Weekly"
            description="Weekend synthesis. Full week with trends."
            selected={cadence === 'weekly'}
            onClick={() => onSetCadence('weekly')}
          />
        </div>
      </div>
    </div>
  )
}
