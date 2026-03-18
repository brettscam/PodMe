import { describe, it, expect, vi } from 'vitest'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockReturnValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { listen_count: 5 }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}))

describe('useShare', () => {
  it('module exports useShare function', async () => {
    const mod = await import('../useShare')
    expect(typeof mod.useShare).toBe('function')
  })
})
