import { useState, useCallback } from 'react'
import {
  X,
  LogOut,
  Sparkles,
  Plus,
  Hash,
  Trash2,
  Rss,
  MessageSquare,
  ChevronDown,
  Check,
  Lock,
  CreditCard,
} from 'lucide-react'
import type { Session, User } from '@supabase/supabase-js'
import type {
  Topic,
  UserTopic,
  UserPreferences,
  Tone,
  EpisodeLength,
  Tier,
} from '../lib/types'
import type { useTier } from '../hooks/useTier'
import type { useCustomTopics } from '../hooks/useCustomTopics'
import type { useBilling, BillingInterval, PaidTier } from '../hooks/useBilling'
import CustomTopicCreator from './CustomTopicCreator'

interface SettingsViewProps {
  user: User
  session: Session
  topics: Topic[]
  userTopics: UserTopic[]
  preferences: UserPreferences
  preferencesLoading: boolean
  topicsLoading: boolean
  tier: ReturnType<typeof useTier>
  customTopics: ReturnType<typeof useCustomTopics>
  billing: ReturnType<typeof useBilling>
  onToggleTopic: (topicId: string, enabled: boolean) => void
  onUpdateCustomTags: (topicId: string, tags: string[]) => void
  onSaveTopics: () => void
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void
  onGenerate: () => void
  generating: boolean
  onSignOut: () => void
}

const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  unlimited: 'Unlimited',
}

const TIER_PRICES: Record<BillingInterval, Record<Tier, string>> = {
  monthly: { free: '$0', pro: '$7.99/mo', unlimited: '$14.99/mo' },
  yearly: { free: '$0', pro: '$59/yr', unlimited: '$119/yr' },
}

const TIER_ORDER: Tier[] = ['free', 'pro', 'unlimited']

interface TierFeature {
  label: string
  values: Record<Tier, string>
}

const TIER_COMPARISON: TierFeature[] = [
  {
    label: 'Episodes per week',
    values: { free: '3', pro: '7 (daily)', unlimited: 'Unlimited' },
  },
  {
    label: 'Custom topics',
    values: { free: '3', pro: '10', unlimited: 'Unlimited' },
  },
  {
    label: 'Voice packs',
    values: { free: 'Morning Brief', pro: 'All 5 packs', unlimited: 'All + Studio' },
  },
  {
    label: 'Episode length',
    values: { free: 'Up to Medium', pro: 'Up to Long', unlimited: 'Up to Long' },
  },
]

const TONES: { value: Tone; label: string }[] = [
  { value: 'factual', label: 'Factual' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'witty', label: 'Witty' },
]

const LENGTHS: { value: EpisodeLength; label: string; desc: string; proOnly?: boolean }[] = [
  { value: 'short', label: 'Short', desc: '~5min' },
  { value: 'medium', label: 'Medium', desc: '~12min' },
  { value: 'long', label: 'Long', desc: '~20min', proOnly: true },
]

export default function SettingsView({
  user,
  topics,
  userTopics,
  preferences,
  preferencesLoading,
  topicsLoading,
  tier,
  customTopics,
  billing,
  onToggleTopic,
  onUpdateCustomTags,
  onSaveTopics,
  onUpdatePreferences,
  onGenerate,
  generating,
  onSignOut,
}: SettingsViewProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
  const [compareOpen, setCompareOpen] = useState(false)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  const isTopicEnabled = useCallback(
    (topicId: string) => {
      const ut = userTopics.find((t) => t.topic_id === topicId && !t.custom_topic_id)
      return ut?.enabled ?? false
    },
    [userTopics],
  )

  const getCustomTags = useCallback(
    (topicId: string) => {
      const ut = userTopics.find((t) => t.topic_id === topicId && !t.custom_topic_id)
      return ut?.custom_tags ?? []
    },
    [userTopics],
  )

  const handleTagKeyDown = (
    topicId: string,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
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
    onUpdateCustomTags(topicId, existing.filter((t) => t !== tag))
  }

  const displayName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User'

  const customTopicLimitLabel =
    tier.customTopicLimit === null ? '∞' : tier.customTopicLimit

  return (
    <div className="space-y-6 pb-4">
      {/* ========================================
          PLAN
          ======================================== */}
      <section>
        <SectionHeader>Plan</SectionHeader>
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TierBadge tier={tier.tier} />
                <span className="text-xs text-gray-500">
                  {TIER_PRICES.monthly[tier.tier]}
                </span>
              </div>
              {tier.tier === 'free' ? (
                <button
                  onClick={() => setCompareOpen(true)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                >
                  <Sparkles size={12} />
                  Upgrade
                </button>
              ) : (
                <button
                  onClick={billing.openPortal}
                  disabled={billing.pending}
                  className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                >
                  <CreditCard size={12} />
                  {billing.pending ? 'Opening…' : 'Manage billing'}
                </button>
              )}
            </div>

            {/* Usage meters */}
            <div className="space-y-3">
              <UsageMeter
                label="Episodes this week"
                used={tier.episodeUsed}
                limit={tier.episodeLimit}
                atLimit={tier.atEpisodeLimit}
              />
              <UsageMeter
                label="Custom topics"
                used={tier.customTopicUsed}
                limit={tier.customTopicLimit}
                atLimit={tier.atCustomTopicLimit}
              />
            </div>

            {tier.atEpisodeLimit && (
              <p className="text-xs text-amber-400 mt-3 flex items-center gap-1.5">
                <Lock size={10} />
                Weekly limit reached. Resets Monday.
              </p>
            )}

            {billing.error && (
              <p className="text-xs text-red-400 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {billing.error}
              </p>
            )}
          </div>

          {/* Tier comparison (collapsed by default) */}
          <button
            onClick={() => setCompareOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-800 text-xs uppercase tracking-wider text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <span>Compare plans</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${compareOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {compareOpen && (
            <div className="border-t border-gray-800 p-4 bg-black/20">
              {/* Billing interval toggle */}
              <div className="flex items-center justify-center gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit mx-auto">
                {(['monthly', 'yearly'] as BillingInterval[]).map((iv) => (
                  <button
                    key={iv}
                    onClick={() => setInterval(iv)}
                    className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors capitalize ${
                      interval === iv
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {iv}
                    {iv === 'yearly' && (
                      <span className="ml-1 text-emerald-400">−38%</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-1 text-xs">
                {/* Header row */}
                <div></div>
                {TIER_ORDER.map((t) => (
                  <div
                    key={t}
                    className={`text-center uppercase tracking-wider text-[10px] font-semibold py-1 ${
                      tier.tier === t ? 'text-indigo-300' : 'text-gray-500'
                    }`}
                  >
                    {TIER_LABELS[t]}
                  </div>
                ))}
                {/* Price row */}
                <div className="text-gray-500 text-[10px] uppercase tracking-wider self-center">
                  Price
                </div>
                {TIER_ORDER.map((t) => (
                  <div
                    key={t}
                    className={`text-center tabular-nums py-1 ${
                      tier.tier === t ? 'text-white font-medium' : 'text-gray-400'
                    }`}
                  >
                    {TIER_PRICES[interval][t]}
                  </div>
                ))}
                {/* Feature rows */}
                {TIER_COMPARISON.map((feature) => (
                  <ComparisonRow
                    key={feature.label}
                    label={feature.label}
                    values={feature.values}
                    currentTier={tier.tier}
                  />
                ))}
                {/* Action row */}
                <div></div>
                {TIER_ORDER.map((t) => (
                  <div key={t} className="pt-2 px-0.5">
                    {t === tier.tier ? (
                      <div className="text-center text-[10px] uppercase tracking-wider text-gray-500 py-1.5">
                        Current
                      </div>
                    ) : t === 'free' ? (
                      <div className="text-center text-[10px] text-gray-600 py-1.5">—</div>
                    ) : (
                      <button
                        onClick={() =>
                          billing.startCheckout(t as PaidTier, interval)
                        }
                        disabled={billing.pending}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-medium py-1.5 rounded-md transition-colors"
                      >
                        {billing.pending ? '…' : 'Choose'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                All tiers include every built-in topic and the shared feed pool. Pro
                unlocks daily cadence, deeper topics, and the full voice library. Cancel
                anytime — you keep access through the end of the paid period.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ========================================
          CUSTOM TOPICS
          ======================================== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader className="mb-0">Custom Topics</SectionHeader>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 tabular-nums">
            {tier.customTopicUsed}/{customTopicLimitLabel}
          </span>
        </div>

        {customTopics.loading ? (
          <SectionSpinner />
        ) : (
          <div className="space-y-2">
            {customTopics.topics.map((ct) => (
              <div
                key={ct.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-indigo-400 flex-shrink-0" />
                      <span className="text-sm text-white font-medium truncate">
                        {ct.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        {ct.parent_category}
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-[10px] text-gray-500">
                        {ct.feeds.length} source{ct.feeds.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {ct.feeds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ct.feeds.slice(0, 4).map((f) => {
                          const Icon = f.kind === 'reddit' ? MessageSquare : Rss
                          return (
                            <span
                              key={f.id}
                              className="inline-flex items-center gap-1 bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded"
                            >
                              <Icon size={9} />
                              {f.name}
                            </span>
                          )
                        })}
                        {ct.feeds.length > 4 && (
                          <span className="text-[10px] text-gray-500 self-center">
                            +{ct.feeds.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => customTopics.remove(ct.id)}
                    className="text-gray-500 hover:text-red-400 p-1.5 -mt-1 -mr-1 rounded-md hover:bg-gray-800 transition-colors"
                    title="Remove topic"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add button */}
            <button
              onClick={() => {
                if (tier.atCustomTopicLimit) {
                  setCompareOpen(true)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                  setCreatorOpen(true)
                }
              }}
              className={`w-full border-dashed border-2 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                tier.atCustomTopicLimit
                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/5'
                  : 'border-gray-800 text-gray-400 hover:border-indigo-500/40 hover:text-indigo-300 hover:bg-indigo-500/5'
              }`}
            >
              {tier.atCustomTopicLimit ? (
                <>
                  <Lock size={14} />
                  Upgrade for {TIER_COMPARISON[1].values.pro} topics
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Add custom topic
                </>
              )}
            </button>

            {customTopics.topics.length === 0 && !tier.atCustomTopicLimit && (
              <p className="text-xs text-gray-500 text-center pt-2">
                Follow a hobby, a sports team, or your local news.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ========================================
          BUILT-IN TOPICS
          ======================================== */}
      <section>
        <SectionHeader>Topics</SectionHeader>
        {topicsLoading ? (
          <SectionSpinner />
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
                        <span className="text-lg">{topic.icon}</span>
                        <span className="text-sm text-white font-medium">
                          {topic.label}
                        </span>
                      </div>
                      <Toggle
                        enabled={enabled}
                        onToggle={() => onToggleTopic(topic.id, !enabled)}
                      />
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

      {/* ========================================
          PREFERENCES
          ======================================== */}
      <section>
        <SectionHeader>Preferences</SectionHeader>
        {preferencesLoading ? (
          <SectionSpinner />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-5">
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

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Length</label>
              <div className="flex gap-2">
                {LENGTHS.map((l) => {
                  const locked = l.proOnly && tier.tier === 'free'
                  return (
                    <button
                      key={l.value}
                      onClick={() => {
                        if (locked) return
                        onUpdatePreferences({ episode_length: l.value })
                      }}
                      disabled={locked}
                      className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium relative ${
                        preferences.episode_length === l.value
                          ? 'bg-indigo-600 text-white'
                          : locked
                            ? 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {l.label}
                        {locked && <Lock size={10} />}
                      </div>
                      <div className="text-xs opacity-70">{l.desc}</div>
                    </button>
                  )
                })}
              </div>
              {tier.tier === 'free' && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Long episodes available on Pro.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Delivery Time</label>
              <div className="relative">
                <input
                  type="time"
                  value={preferences.delivery_time}
                  disabled
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-500 text-sm px-3 py-2 cursor-not-allowed"
                />
                <span className="text-xs text-gray-500 mt-1 block">Coming soon</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================
          GENERATE
          ======================================== */}
      <section>
        <button
          onClick={onGenerate}
          disabled={generating || tier.atEpisodeLimit}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
        >
          {generating
            ? 'Generating...'
            : tier.atEpisodeLimit
              ? 'Weekly limit reached'
              : 'Generate Now'}
        </button>
      </section>

      {/* ========================================
          ACCOUNT
          ======================================== */}
      <section>
        <SectionHeader>Account</SectionHeader>
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

      {creatorOpen && (
        <CustomTopicCreator
          topics={topics}
          tier={tier}
          customTopics={customTopics}
          onClose={() => setCreatorOpen(false)}
        />
      )}
    </div>
  )
}

/* ---------------- sub-components ---------------- */

function SectionHeader({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={`text-white font-semibold text-base mb-3 ${className}`}
    >
      {children}
    </h2>
  )
}

function SectionSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function TierBadge({ tier }: { tier: Tier }) {
  const styles: Record<Tier, string> = {
    free: 'bg-gray-800 text-gray-300 border-gray-700',
    pro: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    unlimited:
      'bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-amber-300 border-amber-500/40',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${styles[tier]}`}
    >
      {tier === 'pro' && <Sparkles size={10} />}
      {TIER_LABELS[tier]}
    </span>
  )
}

function UsageMeter({
  label,
  used,
  limit,
  atLimit,
}: {
  label: string
  used: number
  limit: number | null
  atLimit: boolean
}) {
  const limitLabel = limit === null ? '∞' : limit
  const pct = limit === null ? 0 : Math.min(100, (used / limit) * 100)
  return (
    <div>
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white tabular-nums">
          {used}/{limitLabel}
        </span>
      </div>
      {limit !== null && (
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              atLimit ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function ComparisonRow({
  label,
  values,
  currentTier,
}: {
  label: string
  values: Record<Tier, string>
  currentTier: Tier
}) {
  return (
    <>
      <div className="text-gray-400 text-[11px] py-1.5 self-center">{label}</div>
      {(['free', 'pro', 'unlimited'] as Tier[]).map((t) => (
        <div
          key={t}
          className={`text-center text-[11px] py-1.5 ${
            currentTier === t
              ? 'text-white font-medium'
              : 'text-gray-500'
          }`}
        >
          {values[t]}
        </div>
      ))}
    </>
  )
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-10 h-5 rounded-full transition-colors relative ${
        enabled ? 'bg-indigo-600' : 'bg-gray-700'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
      {enabled && (
        <Check
          size={10}
          strokeWidth={3}
          className="absolute left-1 top-1/2 -translate-y-1/2 text-white/0"
        />
      )}
    </button>
  )
}
