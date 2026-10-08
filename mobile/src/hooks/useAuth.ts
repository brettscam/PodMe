import { useState, useEffect, useCallback } from 'react'
import { Platform } from 'react-native'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/**
 * Supabase returns the session in the URL fragment of the callback. On native
 * we open the OAuth URL in an auth session browser, then exchange whatever
 * comes back on the redirect for a real session.
 */
async function setSessionFromCallbackUrl(callbackUrl: string): Promise<void> {
  const url = new URL(callbackUrl)

  // PKCE flow: ?code=... exchanged for a session.
  const code = url.searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return
  }

  // Implicit flow: tokens arrive in the #fragment.
  const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  const params = new URLSearchParams(fragment)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw error
    return
  }

  const errDescription =
    params.get('error_description') || url.searchParams.get('error_description')
  throw new Error(errDescription || 'Sign-in did not return a session')
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(next?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      const redirectTo = Linking.createURL('/auth/callback')

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // We drive the browser ourselves so we can capture the redirect.
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      })
      if (oauthError) throw oauthError

      // On web the SDK handles the redirect itself.
      if (Platform.OS === 'web') return

      if (!data?.url) throw new Error('Supabase returned no authorization URL')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

      if (result.type === 'success' && result.url) {
        await setSessionFromCallbackUrl(result.url)
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User backed out; not an error worth surfacing.
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }, [])

  return { user, session, loading, error, signInWithGoogle, signOut }
}
