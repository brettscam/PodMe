import { useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'

export type BillingInterval = 'monthly' | 'yearly'
export type PaidTier = 'pro' | 'unlimited'

export function useBilling(session: Session | null) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = useCallback(
    async (tier: PaidTier, interval: BillingInterval = 'monthly') => {
      if (!session) return
      setPending(true)
      setError(null)
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tier, interval }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.reason || data.error || 'Checkout failed')
        if (!data.url) throw new Error('No checkout URL returned')
        window.location.href = data.url
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Checkout failed')
        setPending(false)
      }
    },
    [session],
  )

  const openPortal = useCallback(async () => {
    if (!session) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.reason || data.error || 'Could not open portal')
      if (!data.url) throw new Error('No portal URL returned')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open portal')
      setPending(false)
    }
  }, [session])

  return { startCheckout, openPortal, pending, error }
}
