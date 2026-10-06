import Stripe from 'stripe'
import type { Tier } from './tier'

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  // No explicit apiVersion: the SDK pins its own, which is what its types
  // describe. Pinning a mismatched string here is a compile error on upgrade.
  cached = new Stripe(key)
  return cached
}

export type BillingInterval = 'monthly' | 'yearly'

/** Paid tiers only — 'free' has no Stripe price. */
export type PaidTier = Exclude<Tier, 'free'>

/**
 * Price IDs come from env so the same code runs against test and live mode.
 * Create the products in Stripe, then set these in Vercel.
 */
export function getPriceId(tier: PaidTier, interval: BillingInterval): string | null {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`
  return process.env[key] ?? null
}

/** Reverse lookup: Stripe price ID → our tier. Returns null for unknown prices. */
export function tierForPriceId(priceId: string | null | undefined): PaidTier | null {
  if (!priceId) return null
  const tiers: PaidTier[] = ['pro', 'unlimited']
  const intervals: BillingInterval[] = ['monthly', 'yearly']
  for (const tier of tiers) {
    for (const interval of intervals) {
      if (getPriceId(tier, interval) === priceId) return tier
    }
  }
  return null
}

/** Map Stripe's subscription status onto the values our schema allows. */
export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'incomplete':
      return 'incomplete'
    case 'canceled':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled'
    default:
      return 'canceled'
  }
}

/** Absolute base URL for Stripe redirect targets. */
export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:5173'
  )
}
