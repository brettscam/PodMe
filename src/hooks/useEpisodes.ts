import { useMemo } from 'react'
import type { Episode, UserTopic } from '../lib/types'
import { buildEpisodeFromTopics, SAMPLE_EPISODE, PAST_EPISODES } from '../lib/constants'

export function useEpisodes(topics?: UserTopic[], defaultVoice?: string) {
  const currentEpisode = useMemo<Episode>(() => {
    if (topics && topics.length > 0) {
      return buildEpisodeFromTopics(topics, defaultVoice || 'anchor')
    }
    return SAMPLE_EPISODE
  }, [topics, defaultVoice])

  return {
    currentEpisode,
    pastEpisodes: PAST_EPISODES,
  }
}
