export type Tone = 'factual' | 'conversational' | 'witty'
export type EpisodeLength = 'short' | 'medium' | 'long'
export type EpisodeStatus = 'pending' | 'gathering' | 'building' | 'scripting' | 'voicing' | 'ready' | 'failed'

export interface Topic {
  id: string
  label: string
  icon: string
  color: string
  feed_count?: number
}

export interface UserPreferences {
  user_id: string
  delivery_time: string
  tone: Tone
  episode_length: EpisodeLength
  updated_at: string
}

export interface UserTopic {
  id: string
  user_id: string
  topic_id: string
  enabled: boolean
  custom_tags: string[]
  sort_order: number
}

export interface Episode {
  id: string
  user_id: string
  title: string
  date: string
  status: EpisodeStatus
  stage_progress: string | null
  audio_url: string | null
  transcript: string | null
  duration_seconds: number | null
  error_message: string | null
  created_at: string
}

export interface EpisodeSource {
  id: string
  episode_id: string
  topic_id: string | null
  story_title: string
  source_name: string
  source_url: string
  article_title: string
  published_at: string | null
}

export interface EpisodeWithSources extends Episode {
  sources: EpisodeSource[]
}

export interface UserProfile {
  id: string
  display_name: string
  timezone: string
  created_at: string
}

export type ViewName = 'today' | 'library' | 'settings'
