import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthContext } from '../../context/AuthContext'
import { useTier } from '../../hooks/useTier'
import { Button, Card, Eyebrow, Spinner } from '../../components/ui'
import { theme } from '../../lib/theme'

const TIER_LABEL = { free: 'Free', pro: 'Pro', unlimited: 'Unlimited' } as const

export default function SettingsScreen() {
  const { session, user, signOut } = useAuthContext()
  const insets = useSafeAreaInsets()
  const tier = useTier(session)

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'Signed in'

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.space(4) },
      ]}
    >
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.section}>
        <Eyebrow>Plan</Eyebrow>
        {tier.loading ? (
          <Spinner />
        ) : (
          <Card>
            <View style={styles.planRow}>
              <Text style={styles.planName}>{TIER_LABEL[tier.tier]}</Text>
            </View>
            <Meter
              label="Episodes this week"
              used={tier.episodeUsed}
              limit={tier.episodeLimit}
            />
            <Meter
              label="Custom topics"
              used={tier.customTopicUsed}
              limit={tier.customTopicLimit}
            />
            <Text style={styles.note}>
              Manage your subscription on the web app.
            </Text>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Eyebrow>Topics &amp; preferences</Eyebrow>
        <Card>
          <Text style={styles.note}>
            Topic selection, tone, and length are on the web app for now. They
            land here next.
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Eyebrow>Account</Eyebrow>
        <Card>
          <Text style={styles.accountName}>{displayName}</Text>
          <View style={styles.signOut}>
            <Button label="Sign out" onPress={signOut} variant="secondary" />
          </View>
        </Card>
      </View>
    </ScrollView>
  )
}

function Meter({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number | null
}) {
  const limitLabel = limit === null ? '∞' : limit
  const pct = limit === null ? 0 : Math.min(100, (used / limit) * 100)
  const atLimit = limit !== null && used >= limit

  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>
          {used}/{limitLabel}
        </Text>
      </View>
      {limit !== null && (
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              {
                width: `${pct}%`,
                backgroundColor: atLimit ? theme.color.warning : theme.color.accent,
              },
            ]}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.color.bg },
  content: {
    paddingHorizontal: theme.space(4),
    paddingBottom: theme.space(8),
    gap: theme.space(5),
  },
  heading: {
    color: theme.color.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: { gap: theme.space(2) },
  planRow: { marginBottom: theme.space(3) },
  planName: { color: theme.color.text, fontSize: 17, fontWeight: '700' },
  meter: { marginBottom: theme.space(3), gap: theme.space(1.5) },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between' },
  meterLabel: { color: theme.color.textMid, fontSize: 13 },
  meterValue: {
    color: theme.color.text,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  meterTrack: {
    height: 4,
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  meterFill: { height: '100%' },
  note: { color: theme.color.textDim, fontSize: 12, lineHeight: 17 },
  accountName: { color: theme.color.text, fontSize: 14 },
  signOut: { marginTop: theme.space(4) },
})
