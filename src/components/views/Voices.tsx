import type { UserTopic } from '../../lib/types'
import { BASE_VOICES, PERSONALITY_PACKS, getTopic } from '../../lib/constants'
import VoiceCard from '../ui/VoiceCard'

interface VoicesProps {
  defaultVoice: string
  topics: UserTopic[]
  onSetDefaultVoice: (voiceId: string) => void
}

export default function Voices({ defaultVoice, topics, onSetDefaultVoice }: VoicesProps) {
  function getAssignedTopics(voiceId: string): string[] {
    return topics
      .filter(t => t.voice_override === voiceId)
      .map(t => {
        const def = getTopic(t.topic_id)
        return def ? def.label : t.topic_id
      })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="caps-label" style={{ color: 'var(--text-muted)' }}>VOICE LIBRARY</span>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Choose your default voice and browse personality packs. Tap a card to set as default.
        </p>
      </div>

      {/* Base Voices */}
      <div>
        <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>BASE VOICES</span>
        <div className="space-y-2 mt-2">
          {BASE_VOICES.map(voice => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              isDefault={defaultVoice === voice.id}
              selected={defaultVoice === voice.id}
              assignedTopics={getAssignedTopics(voice.id)}
              onClick={() => onSetDefaultVoice(voice.id)}
            />
          ))}
        </div>
      </div>

      {/* Personality Packs */}
      <div>
        <div className="flex items-center gap-2">
          <span className="caps-label text-[10px]" style={{ color: 'var(--text-muted)' }}>PERSONALITY PACKS</span>
          <span
            className="caps-label px-1.5 py-0.5 rounded text-[9px]"
            style={{ backgroundColor: 'rgba(244,162,97,0.15)', color: 'var(--accent-peach)' }}
          >
            PRO+
          </span>
        </div>
        <div className="space-y-2 mt-2">
          {PERSONALITY_PACKS.map(voice => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              isDefault={defaultVoice === voice.id}
              selected={defaultVoice === voice.id}
              assignedTopics={getAssignedTopics(voice.id)}
              onClick={() => onSetDefaultVoice(voice.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
