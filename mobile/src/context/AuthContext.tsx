import { useEffect, type ReactNode } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '../hooks/useAuth'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const segments = useSegments()
  const router = useRouter()

  // Redirect in an effect rather than conditionally rendering, so expo-router
  // keeps control of navigation state.
  useEffect(() => {
    if (auth.loading) return

    const inAuthGroup = segments[0] === 'login'

    if (!auth.session && !inAuthGroup) {
      router.replace('/login')
    } else if (auth.session && inAuthGroup) {
      router.replace('/')
    }
  }, [auth.loading, auth.session, segments, router])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
