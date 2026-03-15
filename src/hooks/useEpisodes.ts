import { useState } from 'react'
import type { Episode } from '../lib/types'
import { SAMPLE_EPISODE } from '../lib/constants'

export function useEpisodes() {
  const [currentEpisode] = useState<Episode>(SAMPLE_EPISODE)

  return {
    currentEpisode,
  }
}
