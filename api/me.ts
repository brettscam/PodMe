import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from './lib/supabase'
import {
  TIER_LIMITS,
  getUserTier,
  getWeeklyEpisodeCount,
} from './lib/tier'
import { isBillingConfigured } from './lib/stripe'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()

  try {
    const tier = await getUserTier(supabase, userId)
    const limits = TIER_LIMITS[tier]

    const [episodesUsed, customTopicsUsedResult] = await Promise.all([
      getWeeklyEpisodeCount(supabase, userId),
      supabase
        .from('custom_topics')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ])

    // custom_topics may not exist yet; treat error as 0
    const customTopicsUsed = customTopicsUsedResult.error
      ? 0
      : (customTopicsUsedResult.count ?? 0)

    return res.status(200).json({
      tier,
      limits: {
        customTopics: finiteOrNull(limits.customTopics),
        episodesPerWeek: finiteOrNull(limits.episodesPerWeek),
        voicePacks: limits.voicePacks,
        maxEpisodeLength: limits.maxEpisodeLength,
      },
      usage: {
        episodesThisWeek: episodesUsed,
        customTopics: customTopicsUsed,
      },
      billingEnabled: isBillingConfigured(),
    })
  } catch (err) {
    console.error('GET /api/me error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function finiteOrNull(n: number): number | null {
  return Number.isFinite(n) ? n : null
}
