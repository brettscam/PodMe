import { useCallback } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthContext } from '../../context/auth-context'
import { useEpisodes } from '../../hooks/useEpisodes'
import { Eyebrow, Spinner } from '../../components/ui'
import { theme } from '../../lib/theme'
import type { Episode } from '../../lib/types'

export default function LibraryScreen() {
  const { session } = useAuthContext()
  const insets = useSafeAreaInsets()
  const { episodes, loadingList, loadEpisode, refetchEpisodes } = useEpisodes(session)
  const router = useRouter()

  const openEpisode = useCallback(
    async (id: string) => {
      await loadEpisode(id)
      router.push('/')
    },
    [loadEpisode, router],
  )

  const shareEpisode = useCallback(async (episode: Episode) => {
    try {
      await Share.share({
        title: episode.title,
        message: episode.audio_url
          ? `${episode.title}\n\n${episode.audio_url}`
          : episode.title,
      })
    } catch {
      // User dismissed the share sheet.
    }
  }, [])

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + theme.space(4) }]}>
      <Text style={styles.heading}>Library</Text>

      {loadingList && episodes.length === 0 ? (
        <Spinner />
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loadingList}
              onRefresh={() => refetchEpisodes(0)}
              tintColor={theme.color.accent}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No episodes yet. Generate one from the Today tab.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                onPress={() => openEpisode(item.id)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
              >
                <Eyebrow>
                  {new Date(item.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Eyebrow>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.meta}>
                  <StatusDot status={item.status} />
                  <Text style={styles.metaText}>
                    {item.status === 'ready'
                      ? item.duration_seconds
                        ? `${Math.round(item.duration_seconds / 60)} min`
                        : 'Ready'
                      : item.status === 'failed'
                        ? 'Failed'
                        : 'In progress'}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => shareEpisode(item)}
                accessibilityRole="button"
                accessibilityLabel={`Share ${item.title}`}
                style={({ pressed }) => [styles.share, pressed && styles.pressed]}
              >
                <Text style={styles.shareGlyph}>↗</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  )
}

function StatusDot({ status }: { status: Episode['status'] }) {
  const color =
    status === 'ready'
      ? theme.color.success
      : status === 'failed'
        ? theme.color.danger
        : theme.color.warning
  return <View style={[styles.dot, { backgroundColor: color }]} />
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.color.bg,
    paddingHorizontal: theme.space(4),
  },
  heading: {
    color: theme.color.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: theme.space(4),
  },
  list: { gap: theme.space(2), paddingBottom: theme.space(8) },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  rowMain: { flex: 1, padding: theme.space(3.5), gap: theme.space(1) },
  rowTitle: {
    color: theme.color.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(1.5),
    marginTop: theme.space(1),
  },
  metaText: { color: theme.color.textDim, fontSize: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  share: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: theme.color.borderSoft,
  },
  shareGlyph: { color: theme.color.textMid, fontSize: 18 },
  pressed: { opacity: 0.7 },
  empty: {
    color: theme.color.textDim,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: theme.space(10),
  },
})
