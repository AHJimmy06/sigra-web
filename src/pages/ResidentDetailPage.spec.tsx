import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
import { ResidentDetailPage } from './ResidentDetailPage'

vi.mock('@/api/client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/client')>()), api: vi.fn() }))

const resident = { id: 'resident-1', name: 'Ana García', email: 'ana@example.com', phone: null, active: true, archivedAt: null, unitId: 'unit-1', unit: { id: 'unit-1', code: 'A-101', address: 'Calle 1', parkingSpaces: 1, active: true, createdAt: '', updatedAt: '' }, createdAt: '', updatedAt: '' }
function detail() { return render(<MemoryRouter initialEntries={['/residents/resident-1']}><Routes><Route path="/residents/:residentId" element={<ResidentDetailPage />} /></Routes></MemoryRouter>) }

describe('ResidentDetailPage', () => {
  beforeEach(() => vi.mocked(api).mockReset())

  it('loads resident detail and renders an accessible archive confirmation', async () => {
    vi.mocked(api).mockResolvedValue(resident as never)
    detail()
    expect(await screen.findByText('Ana García')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /archivar residente/i }))
    expect(screen.getByRole('dialog', { name: /archivar residente/i })).toHaveTextContent('Ana García')
  })

  it('keeps the loading state visible until the detail request resolves', async () => {
    let resolveDetail!: (value: unknown) => void
    vi.mocked(api).mockReturnValueOnce(new Promise((resolve) => { resolveDetail = resolve }) as never)
    detail()
    expect(await screen.findByText('Cargando…')).toBeInTheDocument()
    resolveDetail(resident)
    expect(await screen.findByText('Ana García')).toBeInTheDocument()
  })

  it('renders 404, 401, and 403 without retry and retries generic errors', async () => {
    for (const error of [new ApiError(404, 'Resident not found', 'NOT_FOUND'), new ApiError(401, 'Bearer token required', 'UNAUTHORIZED'), new ApiError(403, 'Insufficient role', 'FORBIDDEN')]) {
      vi.mocked(api).mockRejectedValueOnce(error)
      const view = detail()
      expect(await screen.findByRole('alert')).toHaveTextContent(error.message)
      expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
      view.unmount()
    }
    vi.mocked(api).mockReset()
    vi.mocked(api).mockRejectedValueOnce(new Error('Network down')).mockResolvedValueOnce(resident as never)
    detail()
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    await waitFor(() => expect(vi.mocked(api)).toHaveBeenLastCalledWith('/residents/resident-1?includeArchived=true', expect.objectContaining({ signal: expect.any(AbortSignal) })))
    expect(vi.mocked(api).mock.calls.filter(([path]) => path === '/residents/resident-1?includeArchived=true')).toHaveLength(2)
    expect(await screen.findByText('Ana García')).toBeInTheDocument()
    expect(screen.queryByText('Network down')).not.toBeInTheDocument()
  })

  it('keeps a stale detail response from replacing the current route owner', async () => {
    let resolveFirst!: (value: unknown) => void
    vi.mocked(api).mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }) as never).mockResolvedValueOnce({ ...resident, id: 'resident-2', name: 'Beto' } as never)
    const view = render(<MemoryRouter initialEntries={['/residents/resident-1']}><Routes><Route path="/residents/:residentId" element={<ResidentDetailPage />} /></Routes></MemoryRouter>)
    view.rerender(<MemoryRouter initialEntries={['/residents/resident-2']}><Routes><Route path="/residents/:residentId" element={<ResidentDetailPage />} /></Routes></MemoryRouter>)
    resolveFirst(resident)
    await waitFor(() => expect(screen.queryByText('Ana García')).not.toBeInTheDocument())
  })

  it('retries archive and restore failures, then renders only server-confirmed lifecycle state', async () => {
    let archived = false
    let archiveAttempts = 0
    let restoreAttempts = 0
    vi.mocked(api).mockImplementation((path) => {
      if (path === '/residents/resident-1/archive') return ++archiveAttempts === 1 ? Promise.reject(new Error('Archive failed')) as never : Promise.resolve({}) as never
      if (path === '/residents/resident-1/restore') return ++restoreAttempts === 1 ? Promise.reject(new Error('Restore failed')) as never : Promise.resolve({}) as never
      return Promise.resolve({ ...resident, archivedAt: archived ? '2026-01-01' : null, active: !archived }) as never
    })
    detail()
    await screen.findByText('Ana García')
    fireEvent.click(screen.getByRole('button', { name: /archivar residente/i }))
    const archiveDialog = screen.getByRole('dialog', { name: /archivar residente/i })
    fireEvent.click(within(archiveDialog).getByRole('button', { name: /archivar residente/i }))
    expect(await within(archiveDialog).findByRole('alert')).toHaveTextContent('Archive failed')
    archived = true
    fireEvent.click(within(archiveDialog).getByRole('button', { name: /archivar residente/i }))
    expect(await screen.findByRole('button', { name: /restaurar residente/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /restaurar residente/i }))
    const restoreDialog = screen.getByRole('dialog', { name: /restaurar residente/i })
    fireEvent.click(within(restoreDialog).getByRole('button', { name: /restaurar residente/i }))
    expect(await within(restoreDialog).findByRole('alert')).toHaveTextContent('Restore failed')
    archived = false
    fireEvent.click(within(restoreDialog).getByRole('button', { name: /restaurar residente/i }))
    expect(await screen.findByRole('button', { name: /archivar residente/i })).toBeInTheDocument()
  })
})
