import { describe, it, expect, vi } from 'vitest'
import { ingestAllTopics } from '../cron/ingest-content.js'

vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in tests')))

describe('ingestAllTopics', () => {
  it('returns results for all 10 topics', async () => {
    const results = await ingestAllTopics('2026-03-18')
    expect(results).toHaveLength(10)
    for (const r of results) {
      expect(r).toHaveProperty('topicId')
      expect(r).toHaveProperty('status')
    }
  })
})
