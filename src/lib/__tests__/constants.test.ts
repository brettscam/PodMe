import { describe, it, expect } from 'vitest'
import { getVoice, getTopic, estimateMinutes, formatSeconds, TOPIC_CATALOG, ALL_VOICES, getPersonalizedKnowledgeBlock, KNOWLEDGE_BLOCKS } from '../constants'

describe('getVoice', () => {
  it('returns the correct voice by id', () => {
    const voice = getVoice('anchor')
    expect(voice.name).toBe('The Anchor')
    expect(voice.color).toBe('#4A90D9')
  })

  it('falls back to first base voice for unknown id', () => {
    const voice = getVoice('nonexistent-voice')
    expect(voice.id).toBe('anchor')
  })

  it('falls back for removed voice ids', () => {
    const voice = getVoice('scottish-mentor')
    expect(voice.id).toBe('anchor')
  })
})

describe('getTopic', () => {
  it('returns the correct topic by id', () => {
    const topic = getTopic('tech')
    expect(topic).toBeDefined()
    expect(topic!.label).toBe('Technology')
    expect(topic!.subs.length).toBeGreaterThan(0)
  })

  it('returns undefined for unknown topic', () => {
    expect(getTopic('nonexistent')).toBeUndefined()
  })
})

describe('estimateMinutes', () => {
  it('returns 10 for quick', () => {
    expect(estimateMinutes('quick')).toBe(10)
  })

  it('returns 25 for standard', () => {
    expect(estimateMinutes('standard')).toBe(25)
  })

  it('returns 42 for deep', () => {
    expect(estimateMinutes('deep')).toBe(42)
  })

  it('defaults to 25 for unknown', () => {
    expect(estimateMinutes('unknown')).toBe(25)
  })
})

describe('formatSeconds', () => {
  it('formats zero', () => {
    expect(formatSeconds(0)).toBe('0:00')
  })

  it('formats seconds with padding', () => {
    expect(formatSeconds(5)).toBe('0:05')
  })

  it('formats minutes and seconds', () => {
    expect(formatSeconds(125)).toBe('2:05')
  })

  it('formats exact minutes', () => {
    expect(formatSeconds(60)).toBe('1:00')
  })

  it('formats large durations', () => {
    expect(formatSeconds(2520)).toBe('42:00')
  })
})

describe('TOPIC_CATALOG', () => {
  it('has at least 10 topics', () => {
    expect(TOPIC_CATALOG.length).toBeGreaterThanOrEqual(10)
  })

  it('each topic has required fields', () => {
    for (const topic of TOPIC_CATALOG) {
      expect(topic.id).toBeTruthy()
      expect(topic.label).toBeTruthy()
      expect(topic.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(topic.subs.length).toBeGreaterThan(0)
    }
  })

  it('has unique topic ids', () => {
    const ids = TOPIC_CATALOG.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('ALL_VOICES', () => {
  it('has exactly 5 voices', () => {
    expect(ALL_VOICES.length).toBe(5)
  })

  it('each voice has required fields', () => {
    for (const voice of ALL_VOICES) {
      expect(voice.id).toBeTruthy()
      expect(voice.name).toBeTruthy()
      expect(voice.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('voice definitions do not have a tier property', () => {
    for (const voice of ALL_VOICES) {
      expect(voice).not.toHaveProperty('tier')
    }
  })

  it('has unique voice ids', () => {
    const ids = ALL_VOICES.map(v => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getPersonalizedKnowledgeBlock', () => {
  it('returns a block matching at least one user topic', () => {
    const block = getPersonalizedKnowledgeBlock(['tech', 'science'])
    if (block) {
      expect(block.topics?.some(t => ['tech', 'science'].includes(t))).toBe(true)
    }
  })

  it('falls back to any block when no topics match', () => {
    const block = getPersonalizedKnowledgeBlock(['nonexistent_topic'])
    expect(block).toBeDefined()
    expect(KNOWLEDGE_BLOCKS).toContainEqual(block)
  })

  it('returns a block when given empty topics', () => {
    const block = getPersonalizedKnowledgeBlock([])
    expect(block).toBeDefined()
  })
})
