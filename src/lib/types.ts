import type { LucideIcon } from 'lucide-react'

export type Tone = 'factual' | 'mixed' | 'commentary'
export type Length = 'quick' | 'standard' | 'deep'
export type Cadence = 'daily' | 'weekly'
export type Weight = 'featured' | 'standard' | 'brief'
export type VoiceTier = 'free' | 'pro'
export type SourceTier = 1 | 2 | 3 | 4
export type SourcePreference = 'preferred' | 'muted'

export type ViewName = 'home' | 'topics' | 'throttles' | 'voices' | 'episode'

export interface TopicDefinition {
  id: string
  label: string
  icon: LucideIcon
  color: string
  subs: string[]
}

export interface VoiceDefinition {
  id: string
  name: string
  desc: string
  color: string
  icon: LucideIcon
  tier: VoiceTier
}

export interface UserProfile {
  id: string
  display_name: string
  timezone: string
  delivery_time: string
  tone: Tone
  length: Length
  cadence: Cadence
  default_voice: string
  discovery_enabled: boolean
}

export interface UserTopic {
  id: string
  user_id: string
  topic_id: string
  weight: Weight
  pinned: boolean
  voice_override: string | null
  sort_order: number
}

export interface SegmentSource {
  outlet: string
  domain: string
  tier: SourceTier
  title: string
  url: string
  published_at: string
  cited_claims: string[]
}

export interface EpisodeSegment {
  id?: string
  episode_id?: string
  topic_id: string | null
  segment_type: 'cold_open' | 'topic' | 'wild_card' | 'wrap_up'
  title: string
  voice: string
  start_time_seconds: number
  duration_seconds: number
  script?: string
  sources?: SegmentSource[]
  sort_order: number
}

export interface SourceSummary {
  total_articles: number
  total_outlets: number
  tier_1_count: number
  tier_2_count: number
  tier_3_count: number
}

export interface Episode {
  id?: string
  user_id?: string
  title: string
  date: string
  cadence: Cadence
  tone: Tone
  estimated_minutes: number
  audio_url?: string | null
  transcript?: string | null
  show_notes?: {
    segments: { title: string; sources: SegmentSource[] }[]
    correction_notes: string[]
    source_summary: SourceSummary
  } | null
  share_token?: string | null
  share_enabled?: boolean
  status: 'pending' | 'generating' | 'ready' | 'failed'
  segments: EpisodeSegment[]
}

export interface UserSourcePreference {
  id?: string
  source_domain: string
  preference: SourcePreference
}

export interface SourceDefinition {
  domain: string
  name: string
  tier: SourceTier
  categories: string[]
  bias_label?: string
}
