import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const login = vi.fn()
vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: null, login }),
}))

describe('LoginPage form', () => {
  it('validates required fields and submits credentials through auth', async () => {
    login.mockResolvedValue(undefined)
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    const email = screen.getByPlaceholderText('ejemplo@correo.com')
    const password = screen.getByPlaceholderText('Escriba su contraseña')
    expect(email).toBeRequired()
    expect(password).toBeRequired()

    expect(password).toHaveAttribute('minlength', '8')
    fireEvent.change(email, { target: { value: '  ADMIN@example.com  ' } })
    fireEvent.change(password, { target: { value: 'secure-password' } })
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => expect(login).toHaveBeenCalledWith('admin@example.com', 'secure-password'))
  })

  it('toggles password visibility without changing the field contract', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    const password = screen.getByPlaceholderText('Escriba su contraseña')
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' })

    expect(password).toHaveAttribute('name', 'password')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'current-password')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(password).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true')
  })
})
