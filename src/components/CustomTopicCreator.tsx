import { useState, useMemo } from 'react'
import { X, Loader2, Sparkles, Rss, MessageSquare, Lock } from 'lucide-react'
import type { Topic, DiscoveredFeed } from '../lib/types'
import type { useCustomTopics, AnalyzeResult } from '../hooks/useCustomTopics'
import type { useTier } from '../hooks/useTier'

type Stage = 'form' | 'analyzing' | 'review' | 'creating'

interface Props {
  topics: Topic[]
  tier: ReturnType<typeof useTier>
  customTopics: ReturnType<typeof useCustomTopics>
  onClose: () => void
}

export default function CustomTopicCreator({
  topics,
  tier,
  customTopics,
  onClose,
}: Props) {
  const [stage, setStage] = useState<Stage>('form')
  const [label, setLabel] = useState('')
  const [parentCategory, setParentCategory] = useState<string>(topics[0]?.id ?? 'tech')
  const [searchTermsInput, setSearchTermsInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set())
  const [selectedDiscovered, setSelectedDiscovered] = useState<Set<number>>(new Set())

  const atLimit = tier.atCustomTopicLimit
  const searchTerms = useMemo(
    () =>
      searchTermsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [searchTermsInput],
  )

  async function handleAnalyze() {
    setError(null)
    if (!label.trim()) {
      setError('Give your topic a name')
      return
    }
    setStage('analyzing')
    try {
      const result = await customTopics.analyze(label.trim(), parentCategory, searchTerms)
      setAnalysis(result)
      // Pre-select the top 3 strongest existing matches
      const strongMatches = result.existing_matches
        .filter((m) => m.match_reason !== 'category')
        .slice(0, 3)
      setSelectedPoolIds(new Set(strongMatches.map((m) => m.id)))
      // Pre-select all discovered feeds
      setSelectedDiscovered(new Set(result.discovered.map((_, i) => i)))
      setStage('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setStage('form')
    }
  }

  async function handleCreate() {
    if (!analysis) return
    setError(null)
    setStage('creating')
    try {
      const chosenDiscovered: DiscoveredFeed[] = [...selectedDiscovered].map(
        (i) => analysis.discovered[i],
      )
      await customTopics.create({
        label: label.trim(),
        parent_category: parentCategory,
        search_terms: searchTerms,
        pool_feed_ids: [...selectedPoolIds],
        new_feeds: chosenDiscovered,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed')
      setStage('review')
    }
  }

  const totalSelected = selectedPoolIds.size + selectedDiscovered.size

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-950 border border-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">Add Custom Topic</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {atLimit ? (
                <span className="text-amber-400 inline-flex items-center gap-1">
                  <Lock size={10} />
                  Limit reached — {tier.customTopicLimit} on {tier.tier}
                </span>
              ) : (
                <>
                  {tier.customTopicUsed}/{tier.customTopicLimit ?? '∞'} used on {tier.tier}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {stage === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block uppercase tracking-wider">
                  Topic name
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Portland pickleball"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg text-white text-sm px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block uppercase tracking-wider">
                  Parent category
                </label>
                <select
                  value={parentCategory}
                  onChange={(e) => setParentCategory(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block uppercase tracking-wider">
                  Search terms (optional)
                </label>
                <input
                  type="text"
                  value={searchTermsInput}
                  onChange={(e) => setSearchTermsInput(e.target.value)}
                  placeholder="e.g. pickleball, Portland OR, PNW"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg text-white text-sm px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Comma-separated. Helps us find and rank relevant articles.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}

          {stage === 'analyzing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-indigo-500 mb-3" />
              <p className="text-sm text-gray-300">
                Finding sources for &ldquo;{label}&rdquo;
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Checking our pool first, then discovering new ones
              </p>
            </div>
          )}

          {stage === 'review' && analysis && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  From our pool · {analysis.existing_matches.length} found
                </h3>
                {analysis.existing_matches.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No matches in the pool.</p>
                ) : (
                  <div className="space-y-1.5">
                    {analysis.existing_matches.map((m) => (
                      <FeedRow
                        key={m.id}
                        name={m.name}
                        kind={m.kind}
                        tier={m.tier}
                        tags={m.tags ?? []}
                        selected={selectedPoolIds.has(m.id)}
                        onToggle={() =>
                          setSelectedPoolIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(m.id)) next.delete(m.id)
                            else next.add(m.id)
                            return next
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {analysis.discovered.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <Sparkles size={10} />
                    Newly discovered · {analysis.discovered.length}
                  </h3>
                  <div className="space-y-1.5">
                    {analysis.discovered.map((d, i) => (
                      <FeedRow
                        key={d.url}
                        name={d.name}
                        kind={d.kind}
                        tier={d.tier}
                        tags={d.tags}
                        rationale={d.rationale}
                        selected={selectedDiscovered.has(i)}
                        isNew
                        onToggle={() =>
                          setSelectedDiscovered((prev) => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {analysis.discovery_skipped && (
                <p className="text-xs text-gray-500 italic">
                  Pool had enough matches — skipped discovery.
                </p>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}

          {stage === 'creating' && (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-indigo-500 mb-3" />
              <p className="text-sm text-gray-300">Creating topic…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 flex-shrink-0">
          {stage === 'form' && (
            <button
              onClick={handleAnalyze}
              disabled={!label.trim() || atLimit}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              {atLimit ? 'Upgrade to add more' : 'Find Sources'}
            </button>
          )}
          {stage === 'review' && (
            <div className="flex gap-2">
              <button
                onClick={() => setStage('form')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={totalSelected === 0}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Create with {totalSelected} source{totalSelected === 1 ? '' : 's'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FeedRow({
  name,
  kind,
  tier,
  tags,
  rationale,
  selected,
  isNew,
  onToggle,
}: {
  name: string
  kind: 'rss' | 'reddit' | 'atom'
  tier: 1 | 2 | 3
  tags: string[]
  rationale?: string
  selected: boolean
  isNew?: boolean
  onToggle: () => void
}) {
  const Icon = kind === 'reddit' ? MessageSquare : Rss
  const tierDot =
    tier === 1 ? 'bg-emerald-400' : tier === 2 ? 'bg-indigo-400' : 'bg-gray-500'

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left bg-gray-900 border rounded-lg p-3 transition-colors ${
        selected
          ? 'border-indigo-500/60 bg-indigo-500/5'
          : 'border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white font-medium">{name}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${tierDot}`} title={`Tier ${tier}`} />
            {isNew && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                New
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {rationale && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{rationale}</p>
          )}
        </div>
        <div
          className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 transition-colors ${
            selected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-700'
          }`}
        >
          {selected && (
            <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
              <path
                d="M4 8l3 3 5-6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}
