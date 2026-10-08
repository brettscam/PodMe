import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from '../lib/supabase'
import { getStripe, getAppUrl } from '../lib/stripe'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = getServiceClient()

  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub?.stripe_customer_id) {
      return res.status(400).json({
        error: 'no_customer',
        reason: 'No billing account yet. Subscribe first.',
      })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${getAppUrl()}/?tab=settings`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('POST /api/billing/portal error:', err)
    return res.status(500).json({ error: 'Failed to create portal session' })
  }
}
