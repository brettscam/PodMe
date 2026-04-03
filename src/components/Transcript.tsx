import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface TranscriptProps {
  transcript: string
}

interface TranscriptLine {
  speaker: string | null
  text: string
}

function parseTranscript(raw: string): TranscriptLine[] {
  const lines = raw.split('\n').filter((l) => l.trim())
  return lines.map((line) => {
    const match = line.match(/^(ALEX|JAMIE):\s*(.*)/)
    if (match) {
      return { speaker: match[1], text: match[2] }
    }
    return { speaker: null, text: line }
  })
}

function speakerColor(speaker: string | null): string {
  if (speaker === 'ALEX') return 'text-blue-400'
  if (speaker === 'JAMIE') return 'text-amber-400'
  return 'text-gray-400'
}

export default function Transcript({ transcript }: TranscriptProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = parseTranscript(transcript)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-white font-medium text-sm">Transcript</span>
        {expanded ? (
          <ChevronDown size={18} className="text-gray-400" />
        ) : (
          <ChevronRight size={18} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 max-h-96 overflow-y-auto">
          {lines.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {line.speaker && (
                <span className={`font-bold ${speakerColor(line.speaker)} mr-1`}>
                  {line.speaker}:
                </span>
              )}
              <span className="text-gray-300">{line.text}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
