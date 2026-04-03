import { useEffect } from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

interface AudioPlayerProps {
  audioUrl: string | null
  title: string
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const RATES = [1, 1.25, 1.5, 2, 0.5]

export default function AudioPlayer({ audioUrl, title }: AudioPlayerProps) {
  const {
    playing,
    currentTime,
    duration,
    playbackRate,
    loading,
    error,
    toggle,
    seek,
    setRate,
    loadTrack,
  } = useAudioPlayer()

  useEffect(() => {
    if (audioUrl) loadTrack(audioUrl)
  }, [audioUrl, loadTrack])

  if (!audioUrl) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-400">Audio unavailable</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const cycleRate = () => {
    const idx = RATES.indexOf(playbackRate)
    const next = RATES[(idx + 1) % RATES.length]
    setRate(next)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    seek(pct * duration)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-white font-medium text-sm mb-4 truncate">{title}</p>

      <div className="flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={toggle}
          disabled={loading}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 transition-colors text-white shrink-0 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : playing ? (
            <Pause size={22} />
          ) : (
            <Play size={22} className="ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Progress bar */}
          <div
            className="w-full h-2 bg-gray-800 rounded-full cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-all relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Time + Rate */}
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs text-gray-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              onClick={cycleRate}
              className="text-xs text-gray-400 hover:text-white transition-colors bg-gray-800 px-2 py-0.5 rounded"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
