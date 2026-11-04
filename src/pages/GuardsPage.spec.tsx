import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuardsPage } from './GuardsPage'
const api = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', () => ({ api }))
const guard = { id: 'g1', email: 'guard@test.dev', displayName: 'José', active: true, authorized: false }
describe('guard administration', () => {
 beforeEach(() => { api.mockReset(); api.mockImplementation((_path: string, options?: RequestInit) => options?.method === 'POST' ? Promise.resolve(guard) : options?.method === 'PATCH' ? Promise.resolve({ ...guard, authorized: true }) : Promise.resolve([guard])) })
 it('creates guards without automatic gate authorization and authorizes explicitly', async () => {
  render(<GuardsPage />); await screen.findByText('guard@test.dev')
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'new@test.dev' } }); fireEvent.change(screen.getByLabelText('Contraseña temporal'), { target: { value: 'securepassword12' } }); fireEvent.click(screen.getByRole('button', { name: 'Crear guardia' }))
  await waitFor(() => expect(api.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true))
  const created = api.mock.calls.find(([, options]) => options?.method === 'POST')!; expect(JSON.parse(created[1].body)).toEqual({ email: 'new@test.dev', password: 'securepassword12' }); expect(api.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Autorizar a José' })); await waitFor(() => expect(api).toHaveBeenCalledWith('/access/guards/g1/gate-authorization', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ authorized: true }) })))
 })
 it('disables authorization for inactive guards and shows errors', async () => { api.mockResolvedValue([{ ...guard, active: false }]); render(<GuardsPage />); expect(await screen.findByRole('button', { name: 'Autorizar a José' })).toBeDisabled() })
})
