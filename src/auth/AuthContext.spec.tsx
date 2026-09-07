import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return { ...original, api: vi.fn() }
})

function SessionState() {
  const { user, loading } = useAuth()
  return <div>{loading ? 'loading' : user?.email ?? 'signed-out'}</div>
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
})
