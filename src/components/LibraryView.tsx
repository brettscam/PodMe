import { Library } from 'lucide-react'
import type { Episode } from '../lib/types'

interface LibraryViewProps {
  episodes: Episode[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onPlayEpisode: (id: string) => void
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function LibraryView({
  episodes,
  loading,
  hasMore,
  onLoadMore,
  onPlayEpisode,
}: LibraryViewProps) {
  if (!loading && episodes.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <Library size={40} className="text-gray-600 mx-auto mb-4" />
        <h2 className="text-white font-medium text-lg mb-2">No episodes yet</h2>
        <p className="text-gray-400 text-sm">
          Your past episodes will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {episodes.map((ep) => (
        <button
          key={ep.id}
          onClick={() => onPlayEpisode(ep.id)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-left hover:bg-gray-800/70 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">
                {ep.title}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {formatDate(ep.date)}
              </p>
            </div>
            <span className="text-gray-500 text-xs shrink-0 ml-3">
              {formatDuration(ep.duration_seconds)}
            </span>
          </div>
        </button>
      ))}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !loading && (
        <button
          onClick={onLoadMore}
          className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 py-3 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  )
}
