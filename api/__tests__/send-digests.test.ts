import { describe, it, expect } from 'vitest'
import { buildDigestEmail } from '../cron/send-digests'

describe('buildDigestEmail', () => {
  it('generates HTML with episode data', () => {
    const html = buildDigestEmail({
      title: 'Test Episode',
      date: '2026-03-18',
      cadence: 'daily',
      tone: 'mixed',
      estimated_minutes: 12,
      status: 'ready',
      segments: [],
      show_notes: null,
    }, 'Brett')
    expect(html).toContain('Brett')
    expect(html).toContain('Test Episode')
  })
})
