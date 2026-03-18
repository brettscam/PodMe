import { describe, it, expect, vi } from 'vitest'

const mockSingle = vi.fn()
const mockLimit = vi.fn().mockReturnValue({ single: mockSingle })
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
const mockEqStatus = vi.fn().mockReturnValue({ order: mockOrder })
const mockEqDate = vi.fn().mockReturnValue({ eq: mockEqStatus })
const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqDate })
const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser })

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: mockSelect }),
  },
}))

describe('useEpisodeBuilder', () => {
  it('prefers pre-generated episode from Supabase over API call', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'ep-1',
        title: 'Pre-generated Episode',
        date: '2026-03-18',
        status: 'ready',
        episode_segments: [
          { sort_order: 0, title: 'Cold Open', segment_type: 'cold_open' },
          { sort_order: 1, title: 'Tech', segment_type: 'topic' },
        ],
      },
      error: null,
    })

    const result = await mockSelect('*, episode_segments(*)')
      .eq('user_id', 'user-1')
      .eq('date', '2026-03-18')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    expect(result.data).not.toBeNull()
    expect(result.data.title).toBe('Pre-generated Episode')
    expect(result.data.episode_segments).toHaveLength(2)
  })
})
