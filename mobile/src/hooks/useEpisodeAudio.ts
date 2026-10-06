import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio'
import type { Episode } from '../lib/types'

/**
 * Configure the audio session once at startup.
 *
 * interruptionMode must be 'doNotMix' for lock screen controls to bind to our
 * player — expo-audio documents that the OS otherwise won't associate the
 * now-playing controls with us.
 */
export async function configureAudioSession(): Promise<void> {
  if (Platform.OS === 'web') return
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    allowsRecording: false,
  })
}

export function useEpisodeAudio(episode: Episode | null) {
  const player = useAudioPlayer(episode?.audio_url ?? undefined)
  const status = useAudioPlayerStatus(player)
  const lockScreenBound = useRef(false)

  // Publish now-playing metadata so the lock screen and Control Center show
  // the episode rather than a blank player.
  useEffect(() => {
    if (Platform.OS === 'web') return
    if (!episode?.audio_url) return

    const metadata = {
      title: episode.title,
      artist: 'PuckPuck',
      albumTitle: 'Your Daily Briefing',
    }

    if (!lockScreenBound.current) {
      player.setActiveForLockScreen(true, metadata)
      lockScreenBound.current = true
    } else {
      player.updateLockScreenMetadata(metadata)
    }
  }, [player, episode?.audio_url, episode?.title])

  // Release the lock screen slot when this player goes away, otherwise the
  // OS keeps showing stale now-playing info.
  useEffect(() => {
    return () => {
      if (Platform.OS === 'web') return
      if (lockScreenBound.current) {
        player.clearLockScreenControls()
        lockScreenBound.current = false
      }
    }
  }, [player])

  const toggle = () => {
    if (status.playing) player.pause()
    else player.play()
  }

  const seekBy = async (deltaSeconds: number) => {
    const target = Math.min(
      Math.max(0, status.currentTime + deltaSeconds),
      status.duration || 0,
    )
    await player.seekTo(target)
  }

  return {
    player,
    status,
    toggle,
    seekBy,
    seekTo: (s: number) => player.seekTo(s),
    hasAudio: Boolean(episode?.audio_url),
  }
}
