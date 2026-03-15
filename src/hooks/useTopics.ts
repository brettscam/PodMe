import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import type { UserTopic, Weight } from '../lib/types'
import { DEFAULT_USER_TOPICS } from '../lib/constants'

export function useTopics() {
  const [topics, setTopics] = useState<UserTopic[]>([...DEFAULT_USER_TOPICS])

  const addTopic = useCallback((topicId: string) => {
    setTopics(prev => {
      if (prev.length >= 12) return prev
      if (prev.some(t => t.topic_id === topicId)) return prev
      return [...prev, {
        id: nanoid(),
        user_id: 'local-user',
        topic_id: topicId,
        weight: 'standard',
        pinned: false,
        voice_override: null,
        sort_order: prev.length,
        custom_tags: [],
      }]
    })
  }, [])

  const removeTopic = useCallback((topicId: string) => {
    setTopics(prev => prev.filter(t => t.topic_id !== topicId))
  }, [])

  const updateTopic = useCallback((topicId: string, updates: Partial<UserTopic>) => {
    setTopics(prev => prev.map(t =>
      t.topic_id === topicId ? { ...t, ...updates } : t
    ))
  }, [])

  const setWeight = useCallback((topicId: string, weight: Weight) => {
    updateTopic(topicId, { weight })
  }, [updateTopic])

  const togglePin = useCallback((topicId: string) => {
    setTopics(prev => prev.map(t =>
      t.topic_id === topicId ? { ...t, pinned: !t.pinned } : t
    ))
  }, [])

  const setVoiceOverride = useCallback((topicId: string, voiceId: string | null) => {
    updateTopic(topicId, { voice_override: voiceId })
  }, [updateTopic])

  const addCustomTag = useCallback((topicId: string, tag: string) => {
    setTopics(prev => prev.map(t =>
      t.topic_id === topicId && !t.custom_tags.includes(tag)
        ? { ...t, custom_tags: [...t.custom_tags, tag] }
        : t
    ))
  }, [])

  const removeCustomTag = useCallback((topicId: string, tag: string) => {
    setTopics(prev => prev.map(t =>
      t.topic_id === topicId
        ? { ...t, custom_tags: t.custom_tags.filter(ct => ct !== tag) }
        : t
    ))
  }, [])

  return {
    topics,
    addTopic,
    removeTopic,
    updateTopic,
    setWeight,
    togglePin,
    setVoiceOverride,
    addCustomTag,
    removeCustomTag,
    topicCount: topics.length,
  }
}
