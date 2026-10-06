import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'
import {
  getStripe,
  getPriceId,
  getAppUrl,
  type PaidTier,
  type BillingInterval,
} from '../lib/stripe'

interface CheckoutBody {
  tier?: string
  interval?: string
}

const PAID_TIERS: PaidTier[] = ['pro', 'unlimited']
const INTERVALS: BillingInterval[] = ['monthly', 'yearly']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { tier, interval = 'monthly' } = (req.body ?? {}) as CheckoutBody

  if (!PAID_TIERS.includes(tier as PaidTier)) {
    return res.status(400).json({ error: `tier must be one of: ${PAID_TIERS.join(', ')}` })
  }
  if (!INTERVALS.includes(interval as BillingInterval)) {
    return res.status(400).json({ error: `interval must be one of: ${INTERVALS.join(', ')}` })
  }

  const priceId = getPriceId(tier as PaidTier, interval as BillingInterval)
  if (!priceId) {
    return res.status(500).json({
      error: 'price_not_configured',
      detail: `No price ID configured for ${tier}/${interval}`,
    })
  }

  const supabase = getServiceClient()

  try {
    // Resolve or create the Stripe customer for this user
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    const stripe = getStripe()
    let customerId = sub?.stripe_customer_id ?? null

    if (!customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle()

      const customer = await stripe.customers.create({
        name: profile?.display_name ?? undefined,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id

      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId)
    }

    const appUrl = getAppUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Both of these let the webhook resolve the user without a DB lookup
      client_reference_id: userId,
      subscription_data: {
        metadata: { supabase_user_id: userId },
      },
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return res.status(500).json({ error: 'Stripe returned no checkout URL' })
    }

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('POST /api/billing/checkout error:', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
