import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, invalidateSession, logoutSession, restoreSession, shareSession } from '@/api/client'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return { ...original, api: vi.fn(), invalidateSession: vi.fn(), logoutSession: vi.fn(), restoreSession: vi.fn(), shareSession: vi.fn() }
})

const admin = { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' as const, residentId: null }

function SessionState() {
  const { user, loading, login, logout, sessionError } = useAuth()
  return <div><span>{loading ? 'loading' : user?.email ?? 'signed-out'}</span><span>{sessionError ?? 'no-error'}</span><button onClick={() => void login('admin@example.com', 'password').catch(() => undefined)}>login</button><button onClick={() => void logout()}>logout</button></div>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(restoreSession).mockResolvedValue(admin)
    vi.mocked(logoutSession).mockResolvedValue()
  })

  it('keeps protected content hidden until refresh bootstrap resolves', async () => {
    let resolveRestore!: (user: typeof admin) => void
    vi.mocked(restoreSession).mockReturnValue(new Promise((resolve) => { resolveRestore = resolve }))
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(async () => resolveRestore(admin))
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
  })

  it('becomes signed out when bootstrap refresh fails', async () => {
    vi.mocked(restoreSession).mockRejectedValue(new Error('offline'))
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('signed-out')).toBeInTheDocument()
  })

  it('initializes login identity through /auth/me', async () => {
    vi.mocked(api).mockResolvedValueOnce({ accessToken: 'memory-only' }).mockResolvedValueOnce(admin)
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    act(() => window.dispatchEvent(new CustomEvent('sigra:session-expired')))
    fireEvent.click(screen.getByRole('button', { name: 'login' }))
    await waitFor(() => expect(api).toHaveBeenNthCalledWith(2, '/auth/me', { retries: 0 }))
    expect(shareSession).toHaveBeenCalledOnce()
  })

  it('clears local state even when remote logout fails', async () => {
    vi.mocked(logoutSession).mockRejectedValue(new Error('offline'))
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'logout' }))
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument())
    expect(logoutSession).toHaveBeenCalledOnce()
  })

  it('fences a bootstrap completion after logout and exposes the session error', async () => {
    let resolveRestore!: (user: typeof admin) => void
    vi.mocked(restoreSession).mockReturnValue(new Promise((resolve) => { resolveRestore = resolve }))
    render(<AuthProvider><SessionState /></AuthProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'logout' }))
    await act(async () => resolveRestore(admin))

    expect(await screen.findByText('signed-out')).toBeInTheDocument()
    expect(screen.getByText('Session ended or could not be restored.')).toBeInTheDocument()
  })

  it('fences stale /auth/me completion after expiry', async () => {
    let resolveIdentity!: (user: typeof admin) => void
    vi.mocked(restoreSession).mockResolvedValueOnce(admin)
    vi.mocked(api).mockReturnValueOnce(new Promise((resolve) => { resolveIdentity = resolve }))
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()

    act(() => window.dispatchEvent(new CustomEvent('sigra:session-updated')))
    act(() => window.dispatchEvent(new CustomEvent('sigra:session-expired')))
    await act(async () => resolveIdentity(admin))

    expect(await screen.findByText('signed-out')).toBeInTheDocument()
    expect(screen.getByText('Session ended or could not be restored.')).toBeInTheDocument()
  })

  it('invalidates the shared client session when an event-driven /auth/me rejection fences a stale identity', async () => {
    let resolveStaleIdentity!: (user: typeof admin) => void
    vi.mocked(api)
      .mockReturnValueOnce(new Promise((resolve) => { resolveStaleIdentity = resolve }))
      .mockRejectedValueOnce(new Error('offline'))
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()

    act(() => window.dispatchEvent(new CustomEvent('sigra:session-updated')))
    act(() => window.dispatchEvent(new CustomEvent('sigra:session-updated')))

    await waitFor(() => expect(invalidateSession).toHaveBeenCalledOnce())
    await act(async () => resolveStaleIdentity(admin))

    expect(screen.getByText('signed-out')).toBeInTheDocument()
    expect(screen.getByText('Session ended or could not be restored.')).toBeInTheDocument()
    expect(invalidateSession).toHaveBeenCalledOnce()
  })

  it('invalidates the shared client session when post-login /auth/me rejection fences a stale identity', async () => {
    let resolveStaleIdentity!: (user: typeof admin) => void
    vi.mocked(api)
      .mockReturnValueOnce(new Promise((resolve) => { resolveStaleIdentity = resolve }))
      .mockResolvedValueOnce({ accessToken: 'memory-only' })
      .mockRejectedValueOnce(new Error('offline'))
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()

    act(() => window.dispatchEvent(new CustomEvent('sigra:session-updated')))
    fireEvent.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => expect(invalidateSession).toHaveBeenCalledOnce())
    await act(async () => resolveStaleIdentity(admin))

    expect(screen.getByText('signed-out')).toBeInTheDocument()
    expect(screen.getByText('Session ended or could not be restored.')).toBeInTheDocument()
    expect(invalidateSession).toHaveBeenCalledOnce()
    expect(shareSession).not.toHaveBeenCalled()
  })

  it('cleans up bootstrap failure and reports a session error', async () => {
    vi.mocked(restoreSession).mockRejectedValue(new Error('offline'))
    render(<AuthProvider><SessionState /></AuthProvider>)

    expect(await screen.findByText('signed-out')).toBeInTheDocument()
    expect(screen.getByText('Session ended or could not be restored.')).toBeInTheDocument()
  })
})
