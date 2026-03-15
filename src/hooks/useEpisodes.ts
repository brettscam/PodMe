import { useState } from 'react'
import type { Episode } from '../lib/types'
import { SAMPLE_EPISODE, PAST_EPISODES } from '../lib/constants'

export function useEpisodes() {
  const [currentEpisode] = useState<Episode>(SAMPLE_EPISODE)
  const [pastEpisodes] = useState<Episode[]>(PAST_EPISODES)

  return {
    currentEpisode,
    pastEpisodes,
  }
}
