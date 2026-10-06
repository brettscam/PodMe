import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthContext } from '../../context/AuthContext'
import { useEpisodes } from '../../hooks/useEpisodes'
import { useTier } from '../../hooks/useTier'
import AudioPlayer from '../../components/AudioPlayer'
import { Button, Card, ErrorNote, Eyebrow, Spinner, Title } from '../../components/ui'
import { theme } from '../../lib/theme'

export default function TodayScreen() {
  const { session } = useAuthContext()
  const insets = useSafeAreaInsets()
  const tier = useTier(session)
  const {
    todayEpisode,
    loadingToday,
    generating,
    stageProgress,
    error,
    quotaBlocked,
    generateNow,
  } = useEpisodes(session)

  const limitLabel = tier.episodeLimit === null ? '∞' : tier.episodeLimit
  const blocked = quotaBlocked || tier.atEpisodeLimit

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.space(4) },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>
          Puck<Text style={styles.logoAccent}>Puck</Text>
        </Text>
        <Text style={styles.quota}>
          {tier.episodeUsed}/{limitLabel} this week
        </Text>
      </View>

      {loadingToday ? (
        <Spinner />
      ) : todayEpisode ? (
        <Card>
          <Eyebrow>
            {new Date(todayEpisode.date).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Eyebrow>
          <View style={styles.titleSpacing}>
            <Title>{todayEpisode.title}</Title>
          </View>

          {todayEpisode.status === 'ready' ? (
            <View style={styles.playerSpacing}>
              <AudioPlayer episode={todayEpisode} />
            </View>
          ) : todayEpisode.status === 'failed' ? (
            <View style={styles.playerSpacing}>
              <ErrorNote>
                {todayEpisode.error_message || 'This episode failed to generate.'}
              </ErrorNote>
            </View>
          ) : (
            <View style={styles.playerSpacing}>
              <Text style={styles.stage}>
                {todayEpisode.stage_progress || 'Working…'}
              </Text>
            </View>
          )}

          {todayEpisode.sources?.length > 0 && (
            <View style={styles.sources}>
              <Eyebrow>{todayEpisode.sources.length} sources</Eyebrow>
            </View>
          )}
        </Card>
      ) : (
        <Card>
          <Title>No episode yet today</Title>
          <View style={styles.titleSpacing}>
            <Text style={styles.body}>
              Generate your briefing from the topics you follow.
            </Text>
          </View>
        </Card>
      )}

      {generating && (
        <Card style={styles.progressCard}>
          <Eyebrow>Generating</Eyebrow>
          <Text style={styles.stage}>{stageProgress || 'Starting…'}</Text>
        </Card>
      )}

      {error && !generating ? <ErrorNote>{error}</ErrorNote> : null}

      <Button
        label={
          generating
            ? 'Generating…'
            : blocked
              ? 'Weekly limit reached'
              : todayEpisode
                ? 'Regenerate'
                : 'Generate now'
        }
        onPress={generateNow}
        loading={generating}
        disabled={blocked}
      />

      {blocked && (
        <Text style={styles.hint}>
          Resets Monday. Upgrade on the web for daily episodes.
        </Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.color.bg },
  content: {
    paddingHorizontal: theme.space(4),
    paddingBottom: theme.space(8),
    gap: theme.space(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { fontSize: 22, fontWeight: '800', color: theme.color.text, letterSpacing: -0.5 },
  logoAccent: { color: theme.color.accent },
  quota: {
    color: theme.color.textDim,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  titleSpacing: { marginTop: theme.space(2) },
  playerSpacing: { marginTop: theme.space(4) },
  progressCard: { borderColor: theme.color.accent },
  body: { color: theme.color.textMid, fontSize: 14, lineHeight: 20 },
  stage: { color: theme.color.textMid, fontSize: 13, marginTop: theme.space(1) },
  sources: {
    marginTop: theme.space(4),
    paddingTop: theme.space(3),
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSoft,
  },
  hint: {
    color: theme.color.textDim,
    fontSize: 12,
    textAlign: 'center',
  },
})
