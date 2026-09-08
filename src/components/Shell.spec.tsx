import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/auth/AuthContext'
import { Shell } from './Shell'

vi.mock('@/auth/AuthContext', () => ({ useAuth: vi.fn() }))

describe('Shell responsive navigation', () => {
  it('keeps icon-only navigation named and exposes the default expanded state', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN', residentId: null }, loading: false, login: vi.fn(), logout: vi.fn() })
    render(<MemoryRouter><Shell><p>Content</p></Shell></MemoryRouter>)

    for (const name of ['Panel', 'Residentes', 'Unidades', 'Cartelera', 'Incidencias']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('title', name)
    }
    const collapse = screen.getByRole('button', { name: 'Colapsar menú lateral' })
    expect(collapse).toHaveAttribute('aria-controls', 'primary-navigation')
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
  })

  it('updates the control and retains navigation names when collapsed', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN', residentId: null }, loading: false, login: vi.fn(), logout: vi.fn() })
    render(<MemoryRouter><Shell><p>Content</p></Shell></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Colapsar menú lateral' }))

    expect(screen.queryByRole('button', { name: 'Colapsar menú lateral' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expandir menú lateral' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('link', { name: 'Residentes' })).toBeInTheDocument()
  })

  it('keeps the responsive logout control named when its visible text is hidden', () => {
    const logout = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ user: { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN', residentId: null }, loading: false, login: vi.fn(), logout })
    render(<MemoryRouter><Shell><p>Content</p></Shell></MemoryRouter>)

    const button = screen.getByRole('button', { name: 'Cerrar sesión' })
    expect(button).toHaveAttribute('aria-label', 'Cerrar sesión')
    expect(button).toHaveAttribute('title', 'Cerrar sesión')
    expect(within(button).getByText('Cerrar sesión')).toHaveClass('hidden', 'sm:inline')
    fireEvent.click(button)
    expect(logout).toHaveBeenCalledOnce()
  })
})
