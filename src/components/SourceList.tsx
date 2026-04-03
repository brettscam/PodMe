import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { EpisodeSource } from '../lib/types'

interface SourceListProps {
  sources: EpisodeSource[]
}

export default function SourceList({ sources }: SourceListProps) {
  const [expanded, setExpanded] = useState(false)

  if (!sources.length) return null

  // Group sources by story_title
  const grouped = sources.reduce<Record<string, EpisodeSource[]>>((acc, src) => {
    const key = src.story_title || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(src)
    return acc
  }, {})

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-white font-medium text-sm">
          Sources ({sources.length})
        </span>
        {expanded ? (
          <ChevronDown size={18} className="text-gray-400" />
        ) : (
          <ChevronRight size={18} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {Object.entries(grouped).map(([storyTitle, storySources]) => (
            <div key={storyTitle}>
              <h4 className="text-sm font-medium text-white mb-2">
                {storyTitle}
              </h4>
              <div className="space-y-1.5">
                {storySources.map((src) => (
                  <a
                    key={src.id}
                    href={src.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors group"
                  >
                    <ExternalLink
                      size={14}
                      className="shrink-0 mt-0.5 opacity-50 group-hover:opacity-100"
                    />
                    <span>
                      {src.article_title}
                      <span className="text-gray-500 ml-1.5">
                        {src.source_name}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
