import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'

export function useShare() {
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [listenCount] = useState(12)

  const generateShareLink = useCallback(() => {
    const token = nanoid(10)
    setShareToken(token)
    return token
  }, [])

  const getShareUrl = useCallback((token?: string) => {
    const t = token || shareToken
    return t ? `puckpuck.ai/s/${t}` : ''
  }, [shareToken])

  const copyShareLink = useCallback(async () => {
    const url = getShareUrl()
    if (!url) return
    try {
      await navigator.clipboard.writeText(`https://${url}`)
    } catch {
      // Fallback for older browsers
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [getShareUrl])

  const nativeShare = useCallback(async (title: string) => {
    const url = `https://${getShareUrl()}`
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: `Listen to my PuckPuck episode: ${title}` })
      } catch {
        // User cancelled or not supported
      }
    } else {
      await copyShareLink()
    }
  }, [getShareUrl, copyShareLink])

  return {
    shareToken,
    copied,
    listenCount,
    generateShareLink,
    getShareUrl,
    copyShareLink,
    nativeShare,
  }
}
