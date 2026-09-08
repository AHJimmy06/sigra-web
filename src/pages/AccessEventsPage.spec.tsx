import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { AccessEventsPage } from './AccessEventsPage'

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return { ...original, api: vi.fn() }
})

const event = {
  id: 'event-1',
  decision: 'ALLOWED',
  reason: 'VALID_PASS',
  direction: 'ENTRY',
  occurredAt: '2026-09-07T12:00:00.000Z',
  requestId: 'request-1',
  resident: { name: 'Ana Garcia', unitCode: 'A-101' },
  guard: { email: 'guard@example.com' },
} as const

const response = { items: [event], total: 21, page: 1, pageSize: 10 }

describe('AccessEventsPage contract integration', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockResolvedValue(response as never)
  })

  it('uses the exact endpoint with server filters and pagination', async () => {
    render(<AccessEventsPage />)
    expect(await screen.findByText('Ana Garcia')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/access/events?page=1&pageSize=10', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    fireEvent.change(screen.getByPlaceholderText('Residente, unidad o guardia'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Fecha inicial'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Fecha final'), { target: { value: '2026-09-07' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Decisión' }), { target: { value: 'DENIED' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Dirección' }), { target: { value: 'EXIT' } })
    await waitFor(() => expect(api).toHaveBeenCalledWith('/access/events?search=Ana&from=2026-09-01&to=2026-09-07&decision=DENIED&direction=EXIT&page=1&pageSize=10', expect.anything()))

    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/^\/access\/events\?.*page=2&pageSize=10$/), expect.anything()))
  })

  it('cancels stale requests when filters change', async () => {
    let resolveFirst!: (value: typeof response) => void
    const first = new Promise<typeof response>((resolve) => { resolveFirst = resolve })
    vi.mocked(api)
      .mockReturnValueOnce(first as never)
      .mockResolvedValueOnce({ ...response, items: [{ ...event, id: 'event-2', resident: { name: 'Current Resident', unitCode: 'B-202' } }] } as never)

    render(<AccessEventsPage />)
    const firstSignal = vi.mocked(api).mock.calls[0]?.[1]?.signal
    fireEvent.change(screen.getByRole('combobox', { name: 'Decisión' }), { target: { value: 'DENIED' } })

    expect(await screen.findByText('Current Resident')).toBeInTheDocument()
    expect(firstSignal?.aborted).toBe(true)
    resolveFirst(response)
    await Promise.resolve()
    expect(screen.queryByText('Ana Garcia')).not.toBeInTheDocument()
  })

  it('retries a failed list operation without reloading the page', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('History unavailable')).mockResolvedValueOnce(response as never)
    render(<AccessEventsPage />)

    fireEvent.click(await screen.findByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Ana Garcia')).toBeInTheDocument()
    expect(api).toHaveBeenCalledTimes(2)
  })
})
