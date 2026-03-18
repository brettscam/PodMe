import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateEmailHtml } from '../lib/email-template.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

export function buildDigestEmail(episode: any, userName: string): string {
  return generateEmailHtml(episode, userName)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const resend = new Resend(RESEND_API_KEY)
  const today = new Date().toISOString().split('T')[0]

  const { data: episodes } = await supabase
    .from('episodes')
    .select(`
      id, title, date, cadence, tone, estimated_minutes, status, show_notes,
      profiles!inner(id, display_name, email_digest),
      episode_segments(*)
    `)
    .eq('date', today)
    .eq('status', 'ready')
    .is('digest_sent_at', null)
    .eq('profiles.email_digest', true)

  if (!episodes || episodes.length === 0) {
    return res.status(200).json({ sent: 0, message: 'No digests to send' })
  }

  let sent = 0
  let failed = 0

  for (const ep of episodes) {
    const profile = (ep as any).profiles
    if (!profile) continue

    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    if (!authUser?.user?.email) continue

    const episode = {
      ...ep,
      segments: ((ep as any).episode_segments || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    }

    const html = buildDigestEmail(episode, profile.display_name || 'there')

    try {
      await resend.emails.send({
        from: 'PodMe <digest@podme.ai>',
        to: authUser.user.email,
        subject: `Your Daily Brief — ${episode.title}`,
        html,
      })

      await supabase.from('episodes').update({ digest_sent_at: new Date().toISOString() }).eq('id', ep.id)
      sent++
    } catch (err) {
      console.error(`Failed to send digest to ${authUser.user.email}:`, err)
      failed++
    }
  }

  return res.status(200).json({ sent, failed, total: episodes.length })
}
