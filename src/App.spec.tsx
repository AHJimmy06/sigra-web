import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import App from './App'

const auth = vi.hoisted(() => ({ user: null as null | { role: 'ADMIN' | 'GUARD' }, loading: false }))
vi.mock('@/auth/AuthContext', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children, useAuth: () => auth }))
vi.mock('@/components/Shell', () => ({ Shell: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('@/pages/DashboardPage', () => ({ DashboardPage: () => <div>Admin dashboard</div> }))
vi.mock('@/pages/GuardScannerPage', () => ({ GuardScannerPage: () => <div>Guard scanner</div> }))

describe('role routes', () => {
  beforeEach(() => window.history.pushState({}, '', '/'))

  it('routes ADMIN users to administration and blocks guard routes', async () => {
    auth.user = { role: 'ADMIN' }
    window.history.pushState({}, '', '/guard')
    render(<App />)
    expect(await screen.findByText('Admin dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Guard scanner')).not.toBeInTheDocument()
  })

  it('routes GUARD users to the scanner and blocks administration', async () => {
    auth.user = { role: 'GUARD' }
    window.history.pushState({}, '', '/residents')
    render(<App />)
    expect(await screen.findByText('Guard scanner')).toBeInTheDocument()
    expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument()
  })

  it('does not expose routes for backend capabilities that are not implemented', async () => {
    auth.user = null
    window.history.pushState({}, '', '/forgot-password')
    render(<App />)
    expect(await screen.findByText('Bienvenido a SIGRA')).toBeInTheDocument()
    expect(screen.queryByText('Recuperar acceso')).not.toBeInTheDocument()
    expect(screen.queryByText(/olvidó su contraseña/i)).not.toBeInTheDocument()
  })
})
