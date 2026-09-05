// oxlint-disable react/only-export-components -- The provider and hook form one public auth boundary.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type SessionUser } from '@/api/client'

interface AuthContextValue { user: SessionUser | null; loading: boolean; login(email: string, password: string): Promise<void>; logout(): void }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('sigra_token')))
  useEffect(() => {
    if (!localStorage.getItem('sigra_token')) return
    api<SessionUser>('/auth/me').then((sessionUser) => {
      if (sessionUser.role === 'RESIDENT') {
        localStorage.removeItem('sigra_token')
        setUser(null)
        return
      }
      setUser(sessionUser)
    }).catch(() => localStorage.removeItem('sigra_token')).finally(() => setLoading(false))
  }, [])
  async function login(email: string, password: string) {
    const session = await api<{ accessToken: string; user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (session.user.role === 'RESIDENT') {
      localStorage.removeItem('sigra_token')
      setUser(null)
      throw new Error('El acceso para residentes aún no está disponible en la aplicación web.')
    }
    localStorage.setItem('sigra_token', session.accessToken)
    setUser(session.user)
  }
  function logout() { localStorage.removeItem('sigra_token'); setUser(null) }
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is missing'); return value }
