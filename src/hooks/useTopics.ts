import { useState, useCallback, useEffect } from 'react'
import type { UserTopic, Weight } from '../lib/types'
import { DEFAULT_USER_TOPICS } from '../lib/constants'
import { supabase } from '../lib/supabase'

export function useTopics(userId: string | undefined | null) {
  const [topics, setTopics] = useState<UserTopic[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load topics from Supabase
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('user_topics')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order')

      if (cancelled) return

      if (error) {
        console.error('Failed to load topics:', error.message, error.details)
      }

      if (data && !error && data.length > 0) {
        setTopics(data.map(t => ({
          id: t.id,
          user_id: t.user_id,
          topic_id: t.topic_id,
          weight: t.weight || 'standard',
          pinned: t.pinned || false,
          voice_override: t.voice_override || null,
          sort_order: t.sort_order || 0,
          custom_tags: t.custom_tags || [],
        })))
      } else if (!error) {
        // New user — seed with defaults
        const seeded: UserTopic[] = DEFAULT_USER_TOPICS.map(t => ({
          ...t,
          id: crypto.randomUUID(),
          user_id: userId!,
        }))
        setTopics(seeded)

        // Insert defaults into Supabase
        const { error: seedError } = await supabase.from('user_topics').insert(
          seeded.map(t => ({
            id: t.id,
            user_id: t.user_id,
            topic_id: t.topic_id,
            weight: t.weight,
            pinned: t.pinned,
            voice_override: t.voice_override,
            sort_order: t.sort_order,
            custom_tags: t.custom_tags,
          }))
        )
        if (seedError) {
          console.error('Failed to seed topics:', seedError.message, seedError.details)
        }
      }
      setLoaded(true)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const addTopic = useCallback(async (topicId: string) => {
    if (!userId) return

    // Check constraints before modifying state
    const current = topics
    if (current.length >= 12) return
    if (current.some(t => t.topic_id === topicId)) return

    const newTopic: UserTopic = {
      id: crypto.randomUUID(),
      user_id: userId,
      topic_id: topicId,
      weight: 'standard',
      pinned: false,
      voice_override: null,
      sort_order: current.length,
      custom_tags: [],
    }

    // Optimistic update
    setTopics(prev => [...prev, newTopic])

    // Persist to Supabase
    const { error } = await supabase.from('user_topics').insert({
      id: newTopic.id,
      user_id: userId,
      topic_id: topicId,
      weight: 'standard',
      pinned: false,
      voice_override: null,
      sort_order: current.length,
      custom_tags: [],
    })
    if (error) {
      console.error('Failed to insert topic:', error.message, error.details)
      // Rollback on failure
      setTopics(prev => prev.filter(t => t.id !== newTopic.id))
    }
  }, [userId, topics])

  const removeTopic = useCallback(async (topicId: string) => {
    const removed = topics.find(t => t.topic_id === topicId)
    setTopics(prev => prev.filter(t => t.topic_id !== topicId))

    if (userId) {
      const { error } = await supabase.from('user_topics').delete().eq('user_id', userId).eq('topic_id', topicId)
      if (error) {
        console.error('Failed to remove topic:', error.message)
        // Rollback
        if (removed) setTopics(prev => [...prev, removed])
      }
    }
  }, [userId, topics])

  const updateTopic = useCallback(async (topicId: string, updates: Partial<UserTopic>) => {
    const original = topics.find(t => t.topic_id === topicId)
    setTopics(prev => prev.map(t =>
      t.topic_id === topicId ? { ...t, ...updates } : t
    ))
    if (userId) {
      const dbUpdates: Record<string, unknown> = { ...updates }
      delete dbUpdates.id
      delete dbUpdates.user_id
      const { error } = await supabase.from('user_topics').update(dbUpdates).eq('user_id', userId).eq('topic_id', topicId)
      if (error) {
        console.error('Failed to update topic:', error.message)
        // Rollback
        if (original) setTopics(prev => prev.map(t => t.topic_id === topicId ? original : t))
      }
    }
  }, [userId, topics])

  const setWeight = useCallback((topicId: string, weight: Weight) => {
    updateTopic(topicId, { weight })
  }, [updateTopic])

  const togglePin = useCallback(async (topicId: string) => {
    const topic = topics.find(t => t.topic_id === topicId)
    if (!topic) return
    const newPinned = !topic.pinned

    // Optimistic update
    setTopics(prev => prev.map(t => t.topic_id === topicId ? { ...t, pinned: newPinned } : t))

    if (userId) {
      const { error } = await supabase.from('user_topics').update({ pinned: newPinned }).eq('user_id', userId).eq('topic_id', topicId)
      if (error) {
        console.error('Failed to toggle pin:', error.message)
        // Rollback
        setTopics(prev => prev.map(t => t.topic_id === topicId ? { ...t, pinned: !newPinned } : t))
      }
    }
  }, [userId, topics])

  const setVoiceOverride = useCallback((topicId: string, voiceId: string | null) => {
    updateTopic(topicId, { voice_override: voiceId })
  }, [updateTopic])

  const addCustomTag = useCallback(async (topicId: string, tag: string) => {
    if (!userId) return

    let newTags: string[] = []
    let previousTags: string[] = []

    setTopics(prev => prev.map(t => {
      if (t.topic_id === topicId) {
        if (t.custom_tags.includes(tag)) {
          newTags = t.custom_tags // no change needed
          return t
        }
        previousTags = t.custom_tags
        newTags = [...t.custom_tags, tag]
        return { ...t, custom_tags: newTags }
      }
      return t
    }))

    if (newTags.length === 0 || newTags === previousTags) return

    const { error } = await supabase.from('user_topics').update({ custom_tags: newTags }).eq('user_id', userId).eq('topic_id', topicId)
    if (error) {
      console.error('Failed to add tag:', error.message)
      setTopics(prev => prev.map(t => t.topic_id === topicId ? { ...t, custom_tags: previousTags } : t))
    }
  }, [userId])

  const removeCustomTag = useCallback(async (topicId: string, tag: string) => {
    if (!userId) return

    let newTags: string[] = []
    let previousTags: string[] = []

    setTopics(prev => prev.map(t => {
      if (t.topic_id === topicId) {
        previousTags = t.custom_tags
        newTags = t.custom_tags.filter(ct => ct !== tag)
        return { ...t, custom_tags: newTags }
      }
      return t
    }))

    const { error } = await supabase.from('user_topics').update({ custom_tags: newTags }).eq('user_id', userId).eq('topic_id', topicId)
    if (error) {
      console.error('Failed to remove tag:', error.message)
      setTopics(prev => prev.map(t => t.topic_id === topicId ? { ...t, custom_tags: previousTags } : t))
    }
  }, [userId])

  return {
    topics,
    loaded,
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
