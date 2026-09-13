import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('renders 404, 401, and 403 without retry and retries generic errors', async () => {
    for (const error of [new ApiError(404, 'Resident not found', 'NOT_FOUND'), new ApiError(401, 'Bearer token required', 'UNAUTHORIZED'), new ApiError(403, 'Insufficient role', 'FORBIDDEN')]) {
      vi.mocked(api).mockRejectedValueOnce(error)
      const view = detail()
      expect(await screen.findByRole('alert')).toHaveTextContent(error.message)
      expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
      view.unmount()
    }
    vi.mocked(api).mockRejectedValueOnce(new Error('Network down'))
    detail()
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })

  it('keeps a stale detail response from replacing the current route owner', async () => {
    let resolveFirst!: (value: unknown) => void
    vi.mocked(api).mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }) as never).mockResolvedValueOnce({ ...resident, id: 'resident-2', name: 'Beto' } as never)
    const view = render(<MemoryRouter initialEntries={['/residents/resident-1']}><Routes><Route path="/residents/:residentId" element={<ResidentDetailPage />} /></Routes></MemoryRouter>)
    view.rerender(<MemoryRouter initialEntries={['/residents/resident-2']}><Routes><Route path="/residents/:residentId" element={<ResidentDetailPage />} /></Routes></MemoryRouter>)
    resolveFirst(resident)
    await waitFor(() => expect(screen.queryByText('Ana García')).not.toBeInTheDocument())
  })
})
