import type { VercelRequest, VercelResponse } from '@vercel/node'
import type Stripe from 'stripe'
import { getServiceClient } from '../lib/supabase'
import { getStripe, tierForPriceId, mapStripeStatus } from '../lib/stripe'

// Stripe signature verification needs the unparsed body.
export const config = { api: { bodyParser: false } }

const HANDLED_EVENTS = new Set<string>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing stripe-signature header' })
  }

  let event: Stripe.Event
  try {
    const raw = await readRawBody(req)
    event = getStripe().webhooks.constructEvent(raw, signature, secret)
  } catch (err) {
    // Bad signature or unreadable body — do not retry, the payload is untrusted.
    console.error('Webhook signature verification failed:', (err as Error).message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    // Ack unhandled events so Stripe stops retrying them.
    return res.status(200).json({ received: true, handled: false })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id
        if (!subId) break
        // Re-fetch so we always write the subscription's authoritative state.
        const sub = await getStripe().subscriptions.retrieve(subId)
        await syncSubscription(sub, session.client_reference_id ?? null)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await syncSubscription(sub, null)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = extractInvoiceSubscriptionId(invoice)
        if (!subId) break
        const sub = await getStripe().subscriptions.retrieve(subId)
        await syncSubscription(sub, null)
        break
      }
    }

    return res.status(200).json({ received: true, handled: true })
  } catch (err) {
    console.error(`Webhook handler failed for ${event.type}:`, err)
    // 500 makes Stripe retry, which is what we want for transient DB errors.
    return res.status(500).json({ error: 'Handler failed' })
  }
}

/**
 * Write the subscription's full current state to our subscriptions row.
 * Writing complete state (rather than incremental patches) makes this
 * naturally idempotent across Stripe's retries and out-of-order deliveries.
 */
async function syncSubscription(
  sub: Stripe.Subscription,
  clientReferenceId: string | null,
): Promise<void> {
  const supabase = getServiceClient()

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // Resolve the user: subscription metadata → checkout reference → customer lookup
  let userId =
    (sub.metadata?.supabase_user_id as string | undefined) ?? clientReferenceId ?? null

  if (!userId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = data?.user_id ?? null
  }

  if (!userId) {
    const customer = await getStripe().customers.retrieve(customerId)
    if (!customer.deleted) {
      userId = (customer.metadata?.supabase_user_id as string | undefined) ?? null
    }
  }

  if (!userId) {
    console.error(`Could not resolve user for Stripe customer ${customerId}`)
    return
  }

  const item = sub.items?.data?.[0]
  const priceId = item?.price?.id ?? null
  const paidTier = tierForPriceId(priceId)
  const status = mapStripeStatus(sub.status)

  // An unrecognized price means someone added a product we don't map yet.
  // Keep the user on free rather than silently granting a tier.
  if (!paidTier && status !== 'canceled') {
    console.error(`Unmapped Stripe price ${priceId} on subscription ${sub.id}`)
  }

  const periodStart = toIso(item?.current_period_start ?? sub.start_date)
  const periodEnd = toIso(item?.current_period_end)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      tier: status === 'canceled' ? 'free' : (paidTier ?? 'free'),
      status,
      source: 'stripe',
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      canceled_at: toIso(sub.canceled_at),
      trial_end: toIso(sub.trial_end),
    })
    .eq('user_id', userId)

  if (error) {
    // Throw so the handler returns 500 and Stripe retries.
    throw new Error(`Failed to sync subscription for ${userId}: ${error.message}`)
  }
}

function toIso(unixSeconds: number | null | undefined): string | null {
  if (typeof unixSeconds !== 'number') return null
  return new Date(unixSeconds * 1000).toISOString()
}

/** The subscription pointer moved between Stripe API versions. */
function extractInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const direct = (invoice as unknown as { subscription?: string | { id: string } })
    .subscription
  if (typeof direct === 'string') return direct
  if (direct?.id) return direct.id

  const parent = (
    invoice as unknown as {
      parent?: { subscription_details?: { subscription?: string | { id: string } } }
    }
  ).parent
  const nested = parent?.subscription_details?.subscription
  if (typeof nested === 'string') return nested
  if (nested?.id) return nested.id

  return null
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
  }
  return Buffer.concat(chunks)
}
