import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { configureAudioSession } from '../hooks/useEpisodeAudio'
import { AuthProvider } from '../context/AuthContext'
import { theme } from '../lib/theme'

export default function RootLayout() {
  useEffect(() => {
    configureAudioSession().catch(() => {
      // Non-fatal: playback still works, background/lock screen may not.
    })
  }, [])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.color.bg },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
