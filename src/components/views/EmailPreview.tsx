import { useEffect, useRef } from 'react'
import { generateEmailHtml } from '../../lib/emailTemplate'
import { SAMPLE_EPISODE } from '../../lib/constants'

interface EmailPreviewProps {
  onClose: () => void
}

export default function EmailPreview({ onClose }: EmailPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const html = generateEmailHtml(SAMPLE_EPISODE, 'Brett')
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#0B0F1A', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <span className="caps-label text-[10px]" style={{ color: 'var(--accent-pulse)' }}>EMAIL DIGEST PREVIEW</span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>This is what subscribers receive each morning</p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all-200"
          style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          Close
        </button>
      </div>

      {/* Email iframe */}
      <div className="flex-1 overflow-auto flex justify-center" style={{ backgroundColor: '#0B0F1A' }}>
        <iframe
          ref={iframeRef}
          title="Email Preview"
          className="w-full max-w-[600px] h-full border-0"
          style={{ backgroundColor: '#0B0F1A' }}
        />
      </div>
    </div>
  )
}
