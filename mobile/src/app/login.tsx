import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthContext } from '../context/AuthContext'
import { Button, ErrorNote } from '../components/ui'
import { theme } from '../lib/theme'

export default function LoginScreen() {
  const { signInWithGoogle, error, loading } = useAuthContext()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.hero}>
        <Text style={styles.logo}>
          Puck<Text style={styles.logoAccent}>Puck</Text>
        </Text>
        <Text style={styles.tagline}>Your news. Your voice. Your commute.</Text>
      </View>

      <View style={styles.actions}>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button
          label="Continue with Google"
          onPress={signInWithGoogle}
          loading={loading}
        />
        <Text style={styles.legal}>
          A personalized briefing, generated fresh from sources you choose.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.color.bg,
    paddingHorizontal: theme.space(6),
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.space(3),
  },
  logo: {
    fontSize: 38,
    fontWeight: '800',
    color: theme.color.text,
    letterSpacing: -1,
  },
  logoAccent: { color: theme.color.accent },
  tagline: {
    color: theme.color.textMid,
    fontSize: 15,
    textAlign: 'center',
  },
  actions: {
    gap: theme.space(3),
    paddingBottom: theme.space(10),
  },
  legal: {
    color: theme.color.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
})
