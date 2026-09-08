import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { UnitsPage } from './UnitsPage'

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return { ...original, api: vi.fn() }
})

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
    expect(screen.getByPlaceholderText('Ej. 2')).toHaveAttribute('max', '1000')
    expect(screen.getByPlaceholderText('Ej. 2')).toHaveAttribute('step', '1')
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

  it('distinguishes an empty registry from an empty filtered result', async () => {
    vi.mocked(api).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 })
    render(<UnitsPage />)
    expect(await screen.findByText('Todavía no hay unidades registradas.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Torre A-101 o Calle 10/i), { target: { value: 'Torre' } })
    expect(await screen.findByText('No hay unidades que coincidan con los filtros seleccionados.')).toBeInTheDocument()
  })

  it('keeps activation failures accessible inside the confirmation dialog', async () => {
    vi.mocked(api).mockImplementation((_path, options) => options?.method === 'PATCH' ? Promise.reject(new Error('No fue posible desactivar esta unidad.')) : Promise.resolve({ items: [{ id: 'unit-1', code: 'A-101', address: 'Main Street 101', parkingSpaces: 2, active: true }], total: 1, page: 1, pageSize: 10 }))
    render(<UnitsPage />)
    await screen.findByText('A-101')
    fireEvent.click(screen.getByRole('button', { name: /desactivar/i }))
    const dialog = screen.getByRole('dialog', { name: /desactivar unidad/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /desactivar unidad/i }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No fue posible desactivar esta unidad.')
    expect(alert).toHaveFocus()
  })

  it('returns to the previous filtered page when deactivating its last unit', async () => {
    let deactivated = false
    let patchAttempts = 0
    const unit = { id: 'unit-last', code: 'Z-999', address: 'Last Street 999', parkingSpaces: 1, active: true }
    vi.mocked(api).mockImplementation((path, options) => {
      if (options?.method === 'PATCH') {
        patchAttempts += 1
        if (patchAttempts === 1) return Promise.reject(new Error('No fue posible desactivar esta unidad.'))
        deactivated = true
        return Promise.resolve({})
      }
      const page = String(path).includes('page=2') ? 2 : 1
      return Promise.resolve({ items: deactivated && page === 2 ? [] : [unit], total: deactivated ? 10 : 11, page, pageSize: 10 })
    })
    render(<UnitsPage />)
    await screen.findByText('Z-999')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ACTIVE' } })
    fireEvent.click(await screen.findByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: /desactivar/i }))
    const dialog = screen.getByRole('dialog', { name: /desactivar unidad/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /desactivar unidad/i }))
    expect(await within(dialog).findByText('No fue posible desactivar esta unidad.')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /desactivar unidad/i }))

    await waitFor(() => expect(screen.getByText('Mostrando 1-10 de 10')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument()
    expect(api).toHaveBeenCalledWith(expect.stringMatching(/page=1.*status=true/), expect.anything())
  })
})
