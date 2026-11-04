import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResidentArrivals } from './ResidentArrivals'
const mocks = vi.hoisted(() => ({ api: vi.fn(), auth: { user: { sub: 'u1', role: 'RESIDENT', residentId: 'r1' } as null | { sub: string; role: string; residentId: string } } }))
vi.mock('@/api/client', () => ({ api: mocks.api }))
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => mocks.auth }))
const arrival = { id: 'e1', visitorName: 'Luis', occurredAt: '2026-01-01', unitCode: 'A-12' }
describe('resident arrival inbox', () => {
 afterEach(() => { vi.useRealTimers(); Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }) })
 beforeEach(() => { mocks.auth.user = { sub: 'u1', role: 'RESIDENT', residentId: 'r1' }; mocks.api.mockReset() })
 it('deduplicates stable IDs and does not announce historical first load as new', async () => {
  mocks.api.mockResolvedValue({ items: [arrival, arrival] }); render(<ResidentArrivals />); await screen.findByText('Luis'); expect(screen.getAllByText('Luis')).toHaveLength(1); expect(screen.queryByRole('status')).not.toBeInTheDocument()
  mocks.api.mockResolvedValue({ items: [{ ...arrival, id: 'e2', visitorName: 'María' }, arrival] }); fireEvent.click(screen.getByRole('button', { name: 'Actualizar llegadas' })); expect(await screen.findByRole('status')).toHaveTextContent('María')
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' })); fireEvent.click(screen.getByRole('button', { name: 'Actualizar llegadas' })); await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(3)); expect(screen.queryByRole('status')).not.toBeInTheDocument()
 })
 it('clears loaded arrivals on logout and session changes', async () => {
  mocks.api.mockResolvedValue({ items: [arrival] }); const view = render(<ResidentArrivals />); await screen.findByText('Luis')
  await act(async () => window.dispatchEvent(new Event('sigra:session-expired'))); expect(screen.queryByText('Luis')).not.toBeInTheDocument()
  mocks.auth.user = null; view.rerender(<ResidentArrivals />); expect(screen.queryByText('Llegadas de visitantes')).not.toBeInTheDocument()
 })
 it('polls only in the foreground and refreshes when visible again', async () => {
  vi.useFakeTimers()
  mocks.api.mockResolvedValue({ items: [] }); await act(async () => { render(<ResidentArrivals />) }); expect(mocks.api).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000) }); expect(mocks.api).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(mocks.api).toHaveBeenCalledTimes(2)
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000) }); expect(mocks.api).toHaveBeenCalledTimes(3)
  vi.useRealTimers()
 })
 it('clears private arrivals immediately on account change and ignores stale responses', async () => {
  let resolve!: (value: unknown) => void; mocks.api.mockImplementationOnce(() => new Promise((r) => { resolve = r })).mockResolvedValue({ items: [] })
  const view = render(<ResidentArrivals />); mocks.auth.user = { sub: 'u2', residentId: 'r2', role: 'RESIDENT' }; view.rerender(<ResidentArrivals />); resolve({ items: [arrival] }); await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2)); expect(screen.queryByText('Luis')).not.toBeInTheDocument()
 })
})
