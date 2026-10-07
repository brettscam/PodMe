import { createContext, useContext } from 'react'
import type { useAuth } from '../hooks/useAuth'

type AuthValue = ReturnType<typeof useAuth>

// Kept out of AuthContext.tsx so that file only exports a component,
// which is what Fast Refresh needs to reload it reliably.
export const AuthContext = createContext<AuthValue | null>(null)

export function useAuthContext(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
