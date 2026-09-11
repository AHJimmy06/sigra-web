// oxlint-disable react/only-export-components -- The provider and hook form one public auth boundary.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, invalidateSession as invalidateClientSession, logoutSession, restoreSession, shareSession, type SessionUser } from '@/api/client'

interface AuthContextValue { user: SessionUser | null; loading: boolean; sessionError: string | null; login(email: string, password: string): Promise<void>; logout(): Promise<void>; invalidateSession(message: string): void }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const identityGeneration = useRef(0)
  const isSupportedUser = (candidate: SessionUser) => candidate.role === 'ADMIN' || candidate.role === 'GUARD'
  function invalidateLocal(message: string) {
    identityGeneration.current += 1
    setUser(null)
    setLoading(false)
    setSessionError(message)
  }
  function invalidateSession(message: string) {
    invalidateClientSession()
    invalidateLocal(message)
  }
  function commitIdentity(candidate: SessionUser, generation: number) {
    if (generation !== identityGeneration.current) return
    if (!isSupportedUser(candidate)) {
      invalidateSession('Unsupported session role.')
      return
    }
    setUser(candidate)
    setSessionError(null)
  }
  useEffect(() => {
    const generation = identityGeneration.current
    restoreSession().then((sessionUser) => {
      commitIdentity(sessionUser, generation)
    }).catch(() => {
      if (generation === identityGeneration.current) invalidateLocal('Session ended or could not be restored.')
    }).finally(() => {
      if (generation === identityGeneration.current) setLoading(false)
    })
  }, [])
  useEffect(() => {
    const handleSessionExpired = () => invalidateLocal('Session ended or could not be restored.')
    const handleSessionUpdated = () => {
      const generation = ++identityGeneration.current
      setLoading(true)
      api<SessionUser>('/auth/me', { retries: 0 }).then((sessionUser) => {
        commitIdentity(sessionUser, generation)
      }).catch(() => {
        if (generation === identityGeneration.current) invalidateLocal('Session ended or could not be restored.')
      }).finally(() => {
        if (generation === identityGeneration.current) setLoading(false)
      })
    }
    const handleSessionAvailable = () => {
      const generation = ++identityGeneration.current
      setLoading(true)
      restoreSession().then((sessionUser) => {
        commitIdentity(sessionUser, generation)
      }).catch(() => {
        if (generation === identityGeneration.current) invalidateLocal('Session ended or could not be restored.')
      }).finally(() => {
        if (generation === identityGeneration.current) setLoading(false)
      })
    }
    window.addEventListener('sigra:session-expired', handleSessionExpired)
    window.addEventListener('sigra:session-updated', handleSessionUpdated)
    window.addEventListener('sigra:session-available', handleSessionAvailable)
    return () => {
      window.removeEventListener('sigra:session-expired', handleSessionExpired)
      window.removeEventListener('sigra:session-updated', handleSessionUpdated)
      window.removeEventListener('sigra:session-available', handleSessionAvailable)
    }
  }, [])
  async function login(email: string, password: string) {
    const generation = ++identityGeneration.current
    await api<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    const sessionUser = await api<SessionUser>('/auth/me', { retries: 0 })
    if (generation !== identityGeneration.current) return
    if (!isSupportedUser(sessionUser)) {
      invalidateSession('Unsupported session role.')
      throw new Error('Unsupported session role.')
    }
    commitIdentity(sessionUser, generation)
    shareSession()
  }
  async function logout() {
    invalidateLocal('Session ended or could not be restored.')
    await logoutSession().catch(() => undefined)
  }
  return <AuthContext.Provider value={{ user, loading, sessionError, login, logout, invalidateSession }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is missing'); return value }
