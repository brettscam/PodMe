import { useState, useCallback } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Hash,
  Plus,
  Radio,
  Sparkles,
  X,
} from 'lucide-react'
import type {
  Topic,
  UserTopic,
  UserPreferences,
  Tone,
  EpisodeLength,
} from '../lib/types'
import type { useCustomTopics } from '../hooks/useCustomTopics'
import type { useTier } from '../hooks/useTier'
import CustomTopicCreator from './CustomTopicCreator'

type Step = 'welcome' | 'topics' | 'custom' | 'voice' | 'ready'

const STEP_ORDER: Step[] = ['welcome', 'topics', 'custom', 'voice', 'ready']

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: 'factual', label: 'Factual', desc: 'Just the facts, tightly told' },
  { value: 'conversational', label: 'Conversational', desc: 'Two hosts talking it through' },
  { value: 'witty', label: 'Witty', desc: 'Lighter, with some edge' },
]

const LENGTHS: { value: EpisodeLength; label: string; desc: string }[] = [
  { value: 'short', label: 'Short', desc: '~5 min' },
  { value: 'medium', label: 'Medium', desc: '~12 min' },
  { value: 'long', label: 'Long', desc: '~20 min' },
]

interface Props {
  topics: Topic[]
  userTopics: UserTopic[]
  preferences: UserPreferences
  customTopics: ReturnType<typeof useCustomTopics>
  tier: ReturnType<typeof useTier>
  onToggleTopic: (topicId: string, enabled: boolean) => void
  onSaveTopics: () => void
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void
  onComplete: () => void
}

export default function Onboarding({
  topics,
  userTopics,
  preferences,
  customTopics,
  tier,
  onToggleTopic,
  onSaveTopics,
  onUpdatePreferences,
  onComplete,
}: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const enabledCount = userTopics.filter((t) => t.enabled && !t.custom_topic_id).length
  const stepIndex = STEP_ORDER.indexOf(step)

  const isEnabled = useCallback(
    (topicId: string) =>
      userTopics.find((t) => t.topic_id === topicId && !t.custom_topic_id)?.enabled ??
      false,
    [userTopics],
  )

  const goNext = () => {
    const next = STEP_ORDER[stepIndex + 1]
    if (next) setStep(next)
  }
  const goBack = () => {
    const prev = STEP_ORDER[stepIndex - 1]
    if (prev) setStep(prev)
  }

  async function finish() {
    setFinishing(true)
    // Persist topic selections before the flow closes, otherwise the picks
    // made here are lost — toggleTopic only updates local state.
    onSaveTopics()
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 overflow-y-auto">
      <div className="max-w-md mx-auto px-5 min-h-full flex flex-col">
        {/* Progress */}
        <div className="flex gap-1.5 pt-6 pb-8">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-indigo-500' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col">
          {step === 'welcome' && (
            <StepShell
              eyebrow="Getting started"
              title="Welcome to your PuckPuck"
              body="A briefing built from the things you actually follow, read by two hosts, ready every morning. Three quick steps and you're set."
            >
              <div className="space-y-3 mt-8">
                <Bullet icon={<Hash size={14} />} text="Pick the topics you care about" />
                <Bullet icon={<Sparkles size={14} />} text="Add your own — a team, a hobby, your city" />
                <Bullet icon={<Radio size={14} />} text="Choose how it sounds and how long it runs" />
              </div>
            </StepShell>
          )}

          {step === 'topics' && (
            <StepShell
              eyebrow={`Step 1 · ${enabledCount} selected`}
              title="What should we cover?"
              body="Pick a few to start. You can change these any time in Settings."
            >
              <div className="grid grid-cols-2 gap-2.5 mt-6">
                {topics.map((topic) => {
                  const on = isEnabled(topic.id)
                  return (
                    <button
                      key={topic.id}
                      onClick={() => onToggleTopic(topic.id, !on)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${
                        on
                          ? 'bg-indigo-500/10 border-indigo-500/60'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <span className="text-lg">{topic.icon}</span>
                      <span className="text-sm text-white font-medium flex-1 min-w-0 truncate">
                        {topic.label}
                      </span>
                      {on && <Check size={14} className="text-indigo-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </StepShell>
          )}

          {step === 'custom' && (
            <StepShell
              eyebrow="Step 2 · Optional"
              title="Anything more specific?"
              body="The built-in topics are broad. A custom topic follows something narrow — your team, your city, a hobby — and we'll find the sources for it."
            >
              <div className="mt-6 space-y-2">
                {customTopics.topics.map((ct) => (
                  <div
                    key={ct.id}
                    className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-indigo-400 shrink-0" />
                        <span className="text-sm text-white font-medium truncate">
                          {ct.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        {ct.feeds.length} source{ct.feeds.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <button
                      onClick={() => customTopics.remove(ct.id)}
                      className="text-gray-500 hover:text-red-400 p-1"
                      aria-label={`Remove ${ct.label}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setCreatorOpen(true)}
                  disabled={tier.atCustomTopicLimit}
                  className="w-full border-2 border-dashed border-gray-800 hover:border-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3.5 text-sm text-gray-400 hover:text-indigo-300 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={14} />
                  {tier.atCustomTopicLimit
                    ? `Limit reached (${tier.customTopicLimit})`
                    : 'Add a custom topic'}
                </button>

                <p className="text-[11px] text-gray-600 text-center pt-1">
                  e.g. &ldquo;Arsenal transfer news&rdquo;, &ldquo;Portland restaurants&rdquo;,
                  &ldquo;AI safety research&rdquo;
                </p>
              </div>
            </StepShell>
          )}

          {step === 'voice' && (
            <StepShell
              eyebrow="Step 3"
              title="How should it sound?"
              body="These shape the writing and the run time. Both live in Settings if you want to change them later."
            >
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2.5 block">
                    Tone
                  </label>
                  <div className="space-y-2">
                    {TONES.map((t) => (
                      <OptionRow
                        key={t.value}
                        label={t.label}
                        desc={t.desc}
                        selected={preferences.tone === t.value}
                        onSelect={() => onUpdatePreferences({ tone: t.value })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2.5 block">
                    Length
                  </label>
                  <div className="flex gap-2">
                    {LENGTHS.map((l) => {
                      const locked = l.value === 'long' && tier.tier === 'free'
                      const selected = preferences.episode_length === l.value
                      return (
                        <button
                          key={l.value}
                          disabled={locked}
                          onClick={() => onUpdatePreferences({ episode_length: l.value })}
                          className={`flex-1 py-3 rounded-xl border text-center transition-colors ${
                            selected
                              ? 'bg-indigo-500/10 border-indigo-500/60'
                              : locked
                                ? 'bg-gray-900 border-gray-800 opacity-40 cursor-not-allowed'
                                : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <div className="text-sm text-white font-medium">{l.label}</div>
                          <div className="text-[11px] text-gray-500">{l.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                  {tier.tier === 'free' && (
                    <p className="text-[11px] text-gray-600 mt-2">
                      Long episodes are a Pro feature.
                    </p>
                  )}
                </div>
              </div>
            </StepShell>
          )}

          {step === 'ready' && (
            <StepShell
              eyebrow="All set"
              title="You're ready"
              body={`${enabledCount} topic${enabledCount === 1 ? '' : 's'}${
                customTopics.topics.length > 0
                  ? ` plus ${customTopics.topics.length} custom`
                  : ''
              }, ${preferences.tone}, ${preferences.episode_length}. Generate your first episode whenever you like — it takes a couple of minutes.`}
            >
              <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Some mornings a topic has no real news. We leave it out rather than
                  padding the episode, so length varies day to day.
                </p>
              </div>
            </StepShell>
          )}
        </div>

        {/* Footer */}
        <div className="py-6 flex gap-3">
          {stepIndex > 0 && (
            <button
              onClick={goBack}
              className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          {step === 'ready' ? (
            <button
              onClick={finish}
              disabled={finishing}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {finishing ? 'Saving…' : 'Start listening'}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={step === 'topics' && enabledCount === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {step === 'topics' && enabledCount === 0
                ? 'Pick at least one topic'
                : step === 'custom'
                  ? 'Continue'
                  : 'Next'}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

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

function StepShell({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold">
        {eyebrow}
      </span>
      <h1 className="text-2xl font-bold text-white mt-2 tracking-tight text-balance">
        {title}
      </h1>
      <p className="text-sm text-gray-400 mt-2.5 leading-relaxed">{body}</p>
      {children}
    </div>
  )
}

function Bullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  )
}

function OptionRow({
  label,
  desc,
  selected,
  onSelect,
}: {
  label: string
  desc: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
        selected
          ? 'bg-indigo-500/10 border-indigo-500/60'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
      }`}
    >
      <div>
        <div className="text-sm text-white font-medium">{label}</div>
        <div className="text-[11px] text-gray-500">{desc}</div>
      </div>
      {selected && <Check size={15} className="text-indigo-400 shrink-0" />}
    </button>
  )
}
