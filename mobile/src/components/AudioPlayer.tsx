import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../lib/theme'
import type { Episode } from '../lib/types'
import { useEpisodeAudio } from '../hooks/useEpisodeAudio'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ episode }: { episode: Episode }) {
  const { status, toggle, seekBy, hasAudio } = useEpisodeAudio(episode)

  if (!hasAudio) {
    return (
      <View style={styles.transcriptOnly}>
        <Text style={styles.transcriptOnlyText}>
          Transcript only — audio was not generated for this episode.
        </Text>
      </View>
    )
  }

  const duration = status.duration || episode.duration_seconds || 0
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0

  return (
    <View style={styles.wrap}>
      <View style={styles.trackOuter}>
        <View style={[styles.trackInner, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(status.currentTime)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => seekBy(-15)}
          accessibilityRole="button"
          accessibilityLabel="Back 15 seconds"
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        >
          <Text style={styles.skipLabel}>−15</Text>
        </Pressable>

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          <Text style={styles.playGlyph}>{status.playing ? '❙❙' : '▶'}</Text>
        </Pressable>

        <Pressable
          onPress={() => seekBy(30)}
          accessibilityRole="button"
          accessibilityLabel="Forward 30 seconds"
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        >
          <Text style={styles.skipLabel}>+30</Text>
        </Pressable>
      </View>

      {status.isBuffering && <Text style={styles.buffering}>Buffering…</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space(2) },
  trackOuter: {
    height: 4,
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackInner: {
    height: '100%',
    backgroundColor: theme.color.accent,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: theme.color.textDim,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space(6),
    paddingTop: theme.space(1),
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 22,
  },
  skip: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    color: theme.color.textMid,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  pressed: { opacity: 0.7 },
  buffering: {
    color: theme.color.textDim,
    fontSize: 11,
    textAlign: 'center',
  },
  transcriptOnly: {
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.space(3),
  },
  transcriptOnlyText: {
    color: theme.color.textDim,
    fontSize: 13,
    lineHeight: 18,
  },
})
