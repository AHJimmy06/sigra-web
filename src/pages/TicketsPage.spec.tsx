import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
})
