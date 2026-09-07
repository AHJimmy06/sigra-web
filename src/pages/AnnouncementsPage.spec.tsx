import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { AnnouncementsPage } from './AnnouncementsPage'

vi.mock('@/api/client', () => ({ api: vi.fn() }))

describe('AnnouncementsPage pagination integration', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockResolvedValue({
      items: [{ id: 'announcement-1', title: 'Water maintenance', body: 'Service window details', status: 'PUBLISHED', publishedAt: '2026-09-07T12:00:00.000Z' }],
      total: 21,
      page: 1,
      pageSize: 10,
    })
  })

  it('uses enum status filters and server pagination', async () => {
    render(<AnnouncementsPage />)
    expect(await screen.findByText('Water maintenance')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DRAFT' } })
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('status=DRAFT'), expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()))
  })
})
