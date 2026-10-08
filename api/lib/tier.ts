import type { SupabaseClient } from '@supabase/supabase-js'

export type Tier = 'free' | 'pro' | 'unlimited'

export interface TierLimits {
  customTopics: number
  episodesPerWeek: number
  voicePacks: string[] | null // null = all
  maxEpisodeLength: 'short' | 'medium' | 'long'
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    customTopics: 3,
    episodesPerWeek: 3,
    voicePacks: ['morning-brief'],
    maxEpisodeLength: 'medium',
  },
  pro: {
    customTopics: 10,
    episodesPerWeek: 7,
    voicePacks: null,
    maxEpisodeLength: 'long',
  },
  unlimited: {
    customTopics: Number.POSITIVE_INFINITY,
    episodesPerWeek: Number.POSITIVE_INFINITY,
    voicePacks: null,
    maxEpisodeLength: 'long',
  },
}

const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Resolve the user's effective tier from their subscription row.
 * Falls back to 'free' when no row exists or the subscription has lapsed.
 * Handles grace periods for past_due and cancellations within the paid period.
 */
export async function getUserTier(
  supabase: SupabaseClient,
  userId: string,
): Promise<Tier> {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return 'free'

  const tier = data.tier as Tier
  if (tier === 'free') return 'free'

  const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null
  const now = new Date()

  switch (data.status) {
    case 'active':
    case 'trialing':
      return tier
    case 'canceled':
      // Keep paid tier until the paid period actually ends
      return periodEnd && periodEnd > now ? tier : 'free'
    case 'past_due':
      // Short grace window before downgrading
      if (periodEnd && now.getTime() - periodEnd.getTime() < PAST_DUE_GRACE_MS) {
        return tier
      }
      return 'free'
    default:
      return 'free'
  }
}

/**
 * Count episodes created in the current ISO week (Mon 00:00 UTC → now).
 *
 * Failed episodes are excluded: the user got nothing, so charging them a
 * weekly slot for a stalled or errored run would be punishing them for our
 * bug. The sweeper marks unrecoverable episodes failed, which returns the slot.
 */
export async function getWeeklyEpisodeCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const weekStart = startOfWeekUtc(new Date())
  const { count, error } = await supabase
    .from('episodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'failed')
    .gte('created_at', weekStart.toISOString())

  if (error) {
    console.error('getWeeklyEpisodeCount error:', error.message)
    return 0
  }
  return count ?? 0
}

export interface QuotaCheck {
  allowed: boolean
  reason?: string
  tier: Tier
  limit: number
  used: number
}

export async function canCreateEpisode(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaCheck> {
  const tier = await getUserTier(supabase, userId)
  const limit = TIER_LIMITS[tier].episodesPerWeek
  const used = await getWeeklyEpisodeCount(supabase, userId)

  if (Number.isFinite(limit) && used >= limit) {
    const proLimit = TIER_LIMITS.pro.episodesPerWeek
    return {
      allowed: false,
      reason: `You've reached your ${limit} episodes/week limit on the Free plan. Upgrade to Pro for ${proLimit} episodes/week.`,
      tier,
      limit,
      used,
    }
  }
  return { allowed: true, tier, limit, used }
}

export async function canAddCustomTopic(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaCheck> {
  const tier = await getUserTier(supabase, userId)
  const limit = TIER_LIMITS[tier].customTopics

  const { count, error } = await supabase
    .from('custom_topics')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  // custom_topics table may not exist yet (built in a follow-up commit).
  // Treat absence as 0 used so the gate stays correct once it ships.
  const used = error ? 0 : (count ?? 0)

  if (Number.isFinite(limit) && used >= limit) {
    const proLimit = TIER_LIMITS.pro.customTopics
    return {
      allowed: false,
      reason: `You've reached your ${limit} custom topics limit. Upgrade to Pro for up to ${proLimit}.`,
      tier,
      limit,
      used,
    }
  }
  return { allowed: true, tier, limit, used }
}

function startOfWeekUtc(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() // 0=Sun
  const diffToMonday = (day + 6) % 7
  date.setUTCDate(date.getUTCDate() - diffToMonday)
  return date
}
