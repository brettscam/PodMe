import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserId } from './lib/supabase'

const VALID_TONES = ['factual', 'conversational', 'witty']
const VALID_LENGTHS = ['short', 'medium', 'long']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // If no row exists yet, return defaults
        if (error.code === 'PGRST116') {
          return res.status(200).json({
            user_id: userId,
            delivery_time: '07:00',
            tone: 'conversational',
            episode_length: 'medium',
            updated_at: new Date().toISOString(),
          })
        }
        return res.status(500).json({ error: 'Failed to fetch preferences', detail: error.message })
      }

      return res.status(200).json(data)
    }

    if (req.method === 'PUT') {
      const { tone, episode_length, delivery_time } = req.body || {}

      // Validate
      if (tone !== undefined && !VALID_TONES.includes(tone)) {
        return res.status(400).json({ error: `Invalid tone. Must be one of: ${VALID_TONES.join(', ')}` })
      }
      if (episode_length !== undefined && !VALID_LENGTHS.includes(episode_length)) {
        return res.status(400).json({ error: `Invalid episode_length. Must be one of: ${VALID_LENGTHS.join(', ')}` })
      }
      if (delivery_time !== undefined && typeof delivery_time !== 'string') {
        return res.status(400).json({ error: 'delivery_time must be a string' })
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (tone !== undefined) updates.tone = tone
      if (episode_length !== undefined) updates.episode_length = episode_length
      if (delivery_time !== undefined) updates.delivery_time = delivery_time

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: 'Failed to update preferences', detail: error.message })
      }

      return res.status(200).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('preferences error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
