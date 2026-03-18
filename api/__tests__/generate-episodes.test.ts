import { describe, it, expect, vi } from 'vitest'
import { getUsersDueForEpisode } from '../cron/generate-episodes'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({
          lt: () => Promise.resolve({
            data: [
              { id: 'user-1', tone: 'mixed', length: 'standard', default_voice: 'anchor', cadence: 'daily', delivery_time: '06:00', last_episode_date: null },
              { id: 'user-2', tone: 'factual', length: 'quick', default_voice: 'anchor', cadence: 'weekly', delivery_time: '06:05', last_episode_date: null },
              { id: 'user-3', tone: 'mixed', length: 'standard', default_voice: 'anchor', cadence: 'daily', delivery_time: '06:10', last_episode_date: '2026-03-18' },
            ],
            error: null,
          }),
        }),
      }),
    }),
  }),
}))

describe('getUsersDueForEpisode', () => {
  it('filters out users who already have an episode today', async () => {
    const users = await getUsersDueForEpisode('06:00', '06:15', '2026-03-18', false)
    const ids = users.map(u => u.id)
    expect(ids).not.toContain('user-3')
  })

  it('filters out weekly users on weekdays', async () => {
    const users = await getUsersDueForEpisode('06:00', '06:15', '2026-03-18', false)
    const ids = users.map(u => u.id)
    expect(ids).not.toContain('user-2')
    expect(ids).toContain('user-1')
  })

  it('includes weekly users on weekends', async () => {
    const users = await getUsersDueForEpisode('06:00', '06:15', '2026-03-18', true)
    const ids = users.map(u => u.id)
    expect(ids).toContain('user-2')
  })
})
