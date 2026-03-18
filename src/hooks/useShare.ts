import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'

export function useShare() {
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [listenCount, setListenCount] = useState(0)

  const generateShareLink = useCallback(async (episodeId: string, sharerName?: string) => {
    const token = nanoid(10)

    const { error } = await supabase.from('shared_episodes').insert({
      share_token: token,
      episode_id: episodeId,
      sharer_name: sharerName || null,
    })

    if (error) {
      console.error('Failed to create share link:', error.message)
      return null
    }

    // Also enable sharing on the episode
    await supabase.from('episodes').update({
      share_token: token,
      share_enabled: true,
    }).eq('id', episodeId)

    setShareToken(token)
    return token
  }, [])

  const getShareUrl = useCallback((token?: string) => {
    const t = token || shareToken
    return t ? `podme.ai/s/${t}` : ''
  }, [shareToken])

  const copyShareLink = useCallback(async () => {
    const url = getShareUrl()
    if (!url) return
    try {
      await navigator.clipboard.writeText(`https://${url}`)
    } catch { /* fallback */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [getShareUrl])

  const nativeShare = useCallback(async (title: string) => {
    const url = `https://${getShareUrl()}`
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: `Listen to my PodMe episode: ${title}` })
      } catch { /* cancelled */ }
    } else {
      await copyShareLink()
    }
  }, [getShareUrl, copyShareLink])

  const loadShareData = useCallback(async (token: string) => {
    const { data } = await supabase
      .from('shared_episodes')
      .select('listen_count')
      .eq('share_token', token)
      .single()
    if (data) {
      setListenCount(data.listen_count || 0)
      setShareToken(token)
    }
  }, [])

  return {
    shareToken,
    copied,
    listenCount,
    generateShareLink,
    getShareUrl,
    copyShareLink,
    nativeShare,
    loadShareData,
  }
}
