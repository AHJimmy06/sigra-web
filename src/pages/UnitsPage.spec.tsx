import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { UnitsPage } from './UnitsPage'

vi.mock('@/api/client', () => ({ api: vi.fn() }))

describe('UnitsPage pagination integration', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockResolvedValue({
      items: [{ id: 'unit-1', code: 'A-101', address: 'Main Street 101', parkingSpaces: 2, active: true }],
      total: 21,
      page: 1,
      pageSize: 10,
    })
  })

  it('renders response.items and requests server pages and filters', async () => {
    render(<UnitsPage />)
    expect(await screen.findByText('A-101')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1-10 de 21')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/units?page=1&pageSize=10', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/units?page=2&pageSize=10', expect.anything()))
    fireEvent.change(screen.getByPlaceholderText(/Torre A-101 o Calle 10/i), { target: { value: 'tower' } })
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('search=tower'), expect.anything()))
    expect(api).toHaveBeenCalledWith(expect.stringContaining('page=1'), expect.anything())

    fireEvent.click(screen.getByRole('button', { name: /agregar unidad/i }))
    expect(screen.getByPlaceholderText('Ej. Torre A-101')).toHaveAttribute('minlength', '2')
    expect(screen.getByPlaceholderText('Ej. Calle 10 # 20-30')).toBeRequired()
    expect(screen.getByPlaceholderText('Ej. 2')).toHaveAttribute('min', '0')
  })

  it('ignores a stale response after the query changes', async () => {
    let resolveFirst!: (value: unknown) => void
    const first = new Promise((resolve) => { resolveFirst = resolve })
    vi.mocked(api)
      .mockReturnValueOnce(first as never)
      .mockResolvedValueOnce({
        items: [{ id: 'new', code: 'NEW-1', address: 'New address', parkingSpaces: 1, active: true }],
        total: 1,
        page: 1,
        pageSize: 10,
      })

    render(<UnitsPage />)
    fireEvent.change(screen.getByPlaceholderText(/Torre A-101 o Calle 10/i), { target: { value: 'new' } })
    expect(await screen.findByText('NEW-1')).toBeInTheDocument()
    resolveFirst({
      items: [{ id: 'old', code: 'OLD-1', address: 'Old address', parkingSpaces: 1, active: true }],
      total: 1,
      page: 1,
      pageSize: 10,
    })
    await Promise.resolve()
    expect(screen.queryByText('OLD-1')).not.toBeInTheDocument()
  })
})
