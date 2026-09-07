import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { ResidentsPage } from './ResidentsPage'

vi.mock('@/api/client', () => ({ api: vi.fn() }))

describe('ResidentsPage pagination integration', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockImplementation((path) => Promise.resolve(
      path.startsWith('/units')
        ? { items: [{ id: 'unit-1', code: 'A-101', active: true }], total: 1, page: 1, pageSize: 100 }
        : { items: [{ id: 'resident-1', name: 'Ana Garcia', email: 'ana@example.com', phone: null, active: true, unit: { id: 'unit-1', code: 'A-101', active: true } }], total: 21, page: 1, pageSize: 10 },
    ) as never)
  })

  it('renders the resident unit relation and requests server pages', async () => {
    render(<ResidentsPage />)
    expect(await screen.findByText('Ana Garcia')).toBeInTheDocument()
    expect(screen.getAllByText('A-101')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('/residents?page=2&pageSize=10'), expect.anything()))
  })
})
