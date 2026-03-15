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

    setTopics(prev => {
      if (prev.length >= 12) return prev
      if (prev.some(t => t.topic_id === topicId)) return prev
      const newTopic: UserTopic = {
        id: crypto.randomUUID(),
        user_id: userId,
        topic_id: topicId,
        weight: 'standard',
        pinned: false,
        voice_override: null,
        sort_order: prev.length,
        custom_tags: [],
      }

      // Persist
      supabase.from('user_topics').insert({
        id: newTopic.id,
        user_id: userId,
        topic_id: topicId,
        weight: 'standard',
        pinned: false,
        voice_override: null,
        sort_order: prev.length,
        custom_tags: [],
      }).then(({ error }) => {
        if (error) console.error('Failed to insert topic:', error.message, error.details)
      })

      return [...prev, newTopic]
    })
  }, [userId])

  const removeTopic = useCallback(async (topicId: string) => {
    setTopics(prev => prev.filter(t => t.topic_id !== topicId))
    if (userId) {
      await supabase.from('user_topics').delete().eq('user_id', userId).eq('topic_id', topicId)
    }
  }, [userId])

  const updateTopic = useCallback(async (topicId: string, updates: Partial<UserTopic>) => {
    setTopics(prev => prev.map(t =>
      t.topic_id === topicId ? { ...t, ...updates } : t
    ))
    if (userId) {
      const dbUpdates: Record<string, unknown> = { ...updates }
      delete dbUpdates.id
      delete dbUpdates.user_id
      await supabase.from('user_topics').update(dbUpdates).eq('user_id', userId).eq('topic_id', topicId)
    }
  }, [userId])

  const setWeight = useCallback((topicId: string, weight: Weight) => {
    updateTopic(topicId, { weight })
  }, [updateTopic])

  const togglePin = useCallback((topicId: string) => {
    setTopics(prev => {
      const topic = prev.find(t => t.topic_id === topicId)
      if (!topic) return prev
      const newPinned = !topic.pinned
      if (userId) {
        supabase.from('user_topics').update({ pinned: newPinned }).eq('user_id', userId).eq('topic_id', topicId).then()
      }
      return prev.map(t => t.topic_id === topicId ? { ...t, pinned: newPinned } : t)
    })
  }, [userId])

  const setVoiceOverride = useCallback((topicId: string, voiceId: string | null) => {
    updateTopic(topicId, { voice_override: voiceId })
  }, [updateTopic])

  const addCustomTag = useCallback((topicId: string, tag: string) => {
    setTopics(prev => {
      const topic = prev.find(t => t.topic_id === topicId)
      if (!topic || topic.custom_tags.includes(tag)) return prev
      const newTags = [...topic.custom_tags, tag]
      if (userId) {
        supabase.from('user_topics').update({ custom_tags: newTags }).eq('user_id', userId).eq('topic_id', topicId).then()
      }
      return prev.map(t => t.topic_id === topicId ? { ...t, custom_tags: newTags } : t)
    })
  }, [userId])

  const removeCustomTag = useCallback((topicId: string, tag: string) => {
    setTopics(prev => {
      const topic = prev.find(t => t.topic_id === topicId)
      if (!topic) return prev
      const newTags = topic.custom_tags.filter(ct => ct !== tag)
      if (userId) {
        supabase.from('user_topics').update({ custom_tags: newTags }).eq('user_id', userId).eq('topic_id', topicId).then()
      }
      return prev.map(t => t.topic_id === topicId ? { ...t, custom_tags: newTags } : t)
    })
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
