import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { TicketsPage } from './TicketsPage'

vi.mock('@/api/client', () => ({ api: vi.fn() }))

const response = {
  items: [{ id: 'ticket-1', description: 'Leaking kitchen pipe', status: 'OPEN', createdAt: '2026-09-07T12:00:00.000Z' }],
  total: 21,
  page: 1,
  pageSize: 10,
}

describe('TicketsPage pagination and retry integration', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockResolvedValue(response)
  })

  it('requests server pages', async () => {
    render(<TicketsPage />)
    expect(await screen.findByText('Leaking kitchen pipe')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('/tickets?page=2&pageSize=10'), expect.anything()))
  })

  it('retries the ticket list operation without reloading the window', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('Ticket list unavailable')).mockResolvedValueOnce(response)
    render(<TicketsPage />)
    fireEvent.click(await screen.findByRole('button', { name: /reintentar/i }))
    expect(await screen.findByText('Leaking kitchen pipe')).toBeInTheDocument()
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('keeps status failures accessible inside the confirmation dialog', async () => {
    vi.mocked(api).mockImplementation((_path, options) => options?.method === 'PATCH' ? Promise.reject(new Error('No fue posible cambiar esta incidencia.')) : Promise.resolve(response))
    render(<TicketsPage />)
    await screen.findByText('Leaking kitchen pipe')
    fireEvent.change(screen.getByRole('combobox', { name: /estado de la incidencia/i }), { target: { value: 'IN_PROGRESS' } })
    const dialog = screen.getByRole('dialog', { name: /actualizar incidencia/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /confirmar cambio/i }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No fue posible cambiar esta incidencia.')
    expect(alert).toHaveFocus()
  })

  it('returns to the previous filtered page when updating its last ticket', async () => {
    let updated = false
    let patchAttempts = 0
    const ticket = { ...response.items[0], id: 'ticket-last' }
    vi.mocked(api).mockImplementation((path, options) => {
      if (options?.method === 'PATCH') {
        patchAttempts += 1
        if (patchAttempts === 1) return Promise.reject(new Error('No fue posible cambiar esta incidencia.'))
        updated = true
        return Promise.resolve({})
      }
      const page = String(path).includes('page=2') ? 2 : 1
      return Promise.resolve({ items: updated && page === 2 ? [] : [ticket], total: updated ? 10 : 11, page, pageSize: 10 })
    })
    render(<TicketsPage />)
    await screen.findByText('Leaking kitchen pipe')
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por estado/i }), { target: { value: 'OPEN' } })
    fireEvent.click(await screen.findByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()))
    fireEvent.change(screen.getByRole('combobox', { name: /estado de la incidencia/i }), { target: { value: 'IN_PROGRESS' } })
    const dialog = screen.getByRole('dialog', { name: /actualizar incidencia/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /confirmar cambio/i }))
    expect(await within(dialog).findByText('No fue posible cambiar esta incidencia.')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /confirmar cambio/i }))

    await waitFor(() => expect(screen.getByText('Mostrando 1-10 de 10')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument()
    expect(api).toHaveBeenCalledWith(expect.stringMatching(/page=1.*status=OPEN/), expect.anything())
  })
})
