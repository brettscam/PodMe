import { useState, useCallback } from 'react'
import { X, LogOut } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Topic, UserTopic, UserPreferences, Tone, EpisodeLength } from '../lib/types'

interface SettingsViewProps {
  user: User
  session: Session
  topics: Topic[]
  userTopics: UserTopic[]
  preferences: UserPreferences
  preferencesLoading: boolean
  topicsLoading: boolean
  onToggleTopic: (topicId: string, enabled: boolean) => void
  onUpdateCustomTags: (topicId: string, tags: string[]) => void
  onSaveTopics: () => void
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void
  onGenerate: () => void
  generating: boolean
  onSignOut: () => void
}

const TONES: { value: Tone; label: string }[] = [
  { value: 'factual', label: 'Factual' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'witty', label: 'Witty' },
]

const LENGTHS: { value: EpisodeLength; label: string; desc: string }[] = [
  { value: 'short', label: 'Short', desc: '~5min' },
  { value: 'medium', label: 'Medium', desc: '~12min' },
  { value: 'long', label: 'Long', desc: '~20min' },
]

function TopicIcon({ icon }: { icon: string }) {
  return <span className="text-lg">{icon}</span>
}

export default function SettingsView({
  user,
  topics,
  userTopics,
  preferences,
  preferencesLoading,
  topicsLoading,
  onToggleTopic,
  onUpdateCustomTags,
  onSaveTopics,
  onUpdatePreferences,
  onGenerate,
  generating,
  onSignOut,
}: SettingsViewProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})

  const isTopicEnabled = useCallback(
    (topicId: string) => {
      const ut = userTopics.find((t) => t.topic_id === topicId)
      return ut?.enabled ?? false
    },
    [userTopics]
  )

  const getCustomTags = useCallback(
    (topicId: string) => {
      const ut = userTopics.find((t) => t.topic_id === topicId)
      return ut?.custom_tags ?? []
    },
    [userTopics]
  )

  const handleTagKeyDown = (topicId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = (tagInputs[topicId] || '').trim().replace(/,/g, '')
      if (!value) return
      const existing = getCustomTags(topicId)
      if (!existing.includes(value)) {
        onUpdateCustomTags(topicId, [...existing, value])
      }
      setTagInputs((prev) => ({ ...prev, [topicId]: '' }))
    }
  }

  const removeTag = (topicId: string, tag: string) => {
    const existing = getCustomTags(topicId)
    onUpdateCustomTags(
      topicId,
      existing.filter((t) => t !== tag)
    )
  }

  const displayName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User'

  return (
    <div className="space-y-6 pb-4">
      {/* Topics */}
      <section>
        <h2 className="text-white font-semibold text-base mb-3">Topics</h2>
        {topicsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {topics.map((topic) => {
                const enabled = isTopicEnabled(topic.id)
                const tags = getCustomTags(topic.id)
                return (
                  <div
                    key={topic.id}
                    className={`bg-gray-900 border rounded-xl p-3 transition-colors ${
                      enabled ? 'border-indigo-500/50' : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <TopicIcon icon={topic.icon} />
                        <span className="text-sm text-white font-medium">
                          {topic.label}
                        </span>
                      </div>
                      {/* Toggle */}
                      <button
                        onClick={() => onToggleTopic(topic.id, !enabled)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          enabled ? 'bg-indigo-600' : 'bg-gray-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {enabled && (
                      <div className="mt-2">
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full"
                              >
                                {tag}
                                <button
                                  onClick={() => removeTag(topic.id, tag)}
                                  className="text-gray-500 hover:text-white"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="Add tags..."
                          value={tagInputs[topic.id] || ''}
                          onChange={(e) =>
                            setTagInputs((prev) => ({
                              ...prev,
                              [topic.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => handleTagKeyDown(topic.id, e)}
                          className="w-full bg-gray-800 border border-gray-700 rounded text-xs text-white px-2 py-1 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button
              onClick={onSaveTopics}
              className="mt-3 w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Save Topics
            </button>
          </>
        )}
      </section>

      {/* Preferences */}
      <section>
        <h2 className="text-white font-semibold text-base mb-3">Preferences</h2>
        {preferencesLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-5">
            {/* Tone */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Tone</label>
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => onUpdatePreferences({ tone: t.value })}
                    className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium ${
                      preferences.tone === t.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Length</label>
              <div className="flex gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() =>
                      onUpdatePreferences({ episode_length: l.value })
                    }
                    className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium ${
                      preferences.episode_length === l.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div>{l.label}</div>
                    <div className="text-xs opacity-70">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery time */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Delivery Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={preferences.delivery_time}
                  disabled
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-500 text-sm px-3 py-2 cursor-not-allowed"
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  Coming soon
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Generate */}
      <section>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {generating ? 'Generating...' : 'Generate Now'}
        </button>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-white font-semibold text-base mb-3">Account</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-white text-sm mb-4">{displayName}</p>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
