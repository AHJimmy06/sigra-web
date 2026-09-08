import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return { ...original, api: vi.fn() }
})

function SessionState() {
  const { user, loading, logout } = useAuth()
  return <div><span>{loading ? 'loading' : user?.email ?? 'signed-out'}</span><button onClick={logout}>logout</button></div>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.setItem('sigra_token', 'token')
    vi.mocked(api).mockResolvedValue({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      residentId: null,
    })
  })

  it('clears token and user through the central 401 event', async () => {
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    act(() => window.dispatchEvent(new CustomEvent('sigra:session-expired')))
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument())
    expect(window.localStorage.getItem('sigra_token')).toBeNull()
  })

  it('logs out locally without calling an unsupported endpoint', async () => {
    render(<AuthProvider><SessionState /></AuthProvider>)
    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'logout' }))
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument())
    expect(window.localStorage.getItem('sigra_token')).toBeNull()
    expect(api).toHaveBeenCalledWith('/auth/me')
    expect(api).not.toHaveBeenCalledWith('/auth/logout', expect.anything())
  })
})
