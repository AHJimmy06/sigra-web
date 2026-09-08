import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { AnnouncementsPage } from './AnnouncementsPage'

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return { ...original, api: vi.fn() }
})

const response = {
  items: [{ id: 'announcement-1', title: 'Water maintenance', body: 'Service window details', status: 'PUBLISHED', publishedAt: '2026-09-07T12:00:00.000Z' }],
  total: 21,
  page: 1,
  pageSize: 10,
}

describe('AnnouncementsPage pagination integration', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockResolvedValue(response as never)
  })

  it('uses enum status filters and server pagination', async () => {
    render(<AnnouncementsPage />)
    expect(await screen.findByText('Water maintenance')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DRAFT' } })
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('status=DRAFT'), expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()))
  })

  it('exposes the exact announcement DTO text boundaries', async () => {
    render(<AnnouncementsPage />)
    await screen.findByText('Water maintenance')
    fireEvent.click(screen.getByRole('button', { name: /crear anuncio/i }))
    expect(screen.getByPlaceholderText('Ej. Mantenimiento del ascensor')).toHaveAttribute('minlength', '5')
    expect(screen.getByPlaceholderText('Ej. Mantenimiento del ascensor')).toHaveAttribute('maxlength', '160')
    expect(screen.getByPlaceholderText(/ascensor estará/i)).toHaveAttribute('minlength', '10')
    expect(screen.getByPlaceholderText(/ascensor estará/i)).toHaveAttribute('maxlength', '2000')
  })

  it('prevents duplicate submissions while creation is busy', async () => {
    const pending = new Promise(() => undefined)
    vi.mocked(api).mockImplementation((_path, options) => options?.method === 'POST' ? pending as never : Promise.resolve({ ...response, items: response.items }) as never)
    render(<AnnouncementsPage />)
    await screen.findByText('Water maintenance')
    fireEvent.click(screen.getByRole('button', { name: /crear anuncio/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej. Mantenimiento del ascensor'), { target: { value: 'Valid title' } })
    fireEvent.change(screen.getByPlaceholderText(/ascensor estará/i), { target: { value: 'Valid announcement body' } })
    const form = screen.getByRole('button', { name: /crear anuncio/i }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(vi.mocked(api).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1))
    expect(screen.getByRole('button', { name: /creando/i })).toBeDisabled()
  })

  it('distinguishes an empty registry from an empty filtered result', async () => {
    vi.mocked(api).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 } as never)
    render(<AnnouncementsPage />)
    expect(await screen.findByText('Todavía no hay anuncios registrados.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/mantenimiento o ascensor/i), { target: { value: 'ascensor' } })
    expect(await screen.findByText('No hay anuncios que coincidan con los filtros seleccionados.')).toBeInTheDocument()
  })

  it('keeps publication failures accessible inside the confirmation dialog', async () => {
    vi.mocked(api).mockImplementation((_path, options) => options?.method === 'PATCH' ? Promise.reject(new Error('No fue posible retirar este anuncio.')) : Promise.resolve(response) as never)
    render(<AnnouncementsPage />)
    await screen.findByText('Water maintenance')
    fireEvent.click(screen.getByRole('button', { name: /retirar publicación/i }))
    const dialog = screen.getByRole('dialog', { name: /retirar publicación/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /retirar publicación/i }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No fue posible retirar este anuncio.')
    expect(alert).toHaveFocus()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('returns to the previous filtered page when publishing removes its last item', async () => {
    let published = false
    let patchAttempts = 0
    const lastItem = { ...response.items[0], status: 'DRAFT' as const, publishedAt: null }
    vi.mocked(api).mockImplementation((path, options) => {
      if (options?.method === 'PATCH') {
        patchAttempts += 1
        if (patchAttempts === 1) return Promise.reject(new Error('No fue posible publicar este anuncio.'))
        published = true
        return Promise.resolve({}) as never
      }
      const page = String(path).includes('page=2') ? 2 : 1
      return Promise.resolve({ items: published && page === 2 ? [] : [lastItem], total: published ? 10 : 11, page, pageSize: 10 }) as never
    })
    render(<AnnouncementsPage />)
    await screen.findByText('Water maintenance')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DRAFT' } })
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('status=DRAFT'), expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: /^publicar$/i }))
    const dialog = screen.getByRole('dialog', { name: /publicar anuncio/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /publicar anuncio/i }))
    expect(await within(dialog).findByText('No fue posible publicar este anuncio.')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /publicar anuncio/i }))

    await waitFor(() => expect(screen.getByText('Mostrando 1-10 de 10')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument()
    const filteredReloads = vi.mocked(api).mock.calls.filter(([path, options]) => !options?.method && String(path).includes('page=1') && String(path).includes('status=DRAFT'))
    expect(filteredReloads.length).toBeGreaterThanOrEqual(1)
  })
})
