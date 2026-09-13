import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
import { ResidentDetailPage } from './ResidentDetailPage'
import { ResidentsPage } from './ResidentsPage'
import { UnitsPage } from './UnitsPage'

vi.mock('@/api/client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/client')>()), api: vi.fn() }))

const resident = (overrides = {}) => ({ id: 'resident-1', name: 'Ana', email: 'ana@example.com', phone: null, active: false, archivedAt: null, unit: { id: 'unit-1', code: 'A-101', active: true }, ...overrides })
const unit = (overrides = {}) => ({ id: 'unit-1', code: 'A-101', address: 'Main Street 101', parkingSpaces: 2, active: true, archivedAt: null, ...overrides })
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 10 })
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej }); return { promise, resolve, reject } }
function DetailRoute() { const navigate = useNavigate(); return <><button onClick={() => navigate('/residents/second')}>second</button><button onClick={() => navigate('/residents/third')}>third</button><ResidentDetailPage /></> }

describe('administration remediation integration', () => {
  beforeEach(() => vi.mocked(api).mockReset())

  it('exposes the resident row link to the ADMIN-owned detail route', async () => {
    vi.mocked(api).mockImplementation((path) => String(path).startsWith('/units') ? Promise.resolve(page([])) as never : Promise.resolve(page([resident()])) as never)
    render(<MemoryRouter initialEntries={['/residents']}><Routes><Route path="/residents" element={<ResidentsPage />} /><Route path="/residents/:residentId" element={<ResidentDetailPage />} /></Routes></MemoryRouter>)
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    const detailLink = screen.getByRole('link', { name: /ver detalle de ana/i })
    expect(detailLink).toHaveAttribute('href', '/residents/resident-1')
  })

  it('uses server query transitions for resident archive and restore without optimistic divergence', async () => {
    let archived = false
    const currentPeer = resident({ id: 'current-peer', name: 'Current peer' })
    const archivedPeer = resident({ id: 'archived-peer', name: 'Archived peer', archivedAt: '2026-01-01' })
    vi.mocked(api).mockImplementation((path) => {
      if (String(path).startsWith('/units')) return Promise.resolve(page([])) as never
      if (path === '/residents/resident-1/archive') { archived = true; return Promise.resolve({}) as never }
      if (path === '/residents/resident-1/restore') { archived = false; return Promise.resolve({}) as never }
      const archivedOnly = String(path).includes('includeArchived=true')
      return Promise.resolve(page(archivedOnly ? (archived ? [resident({ archivedAt: '2026-01-01' }), currentPeer, archivedPeer] : [resident(), currentPeer, archivedPeer]) : (archived ? [] : [resident()]))) as never
    })
    render(<ResidentsPage />)
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /archivar residente/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /archivar residente/i })).getByRole('button', { name: /archivar residente/i }))
    await waitFor(() => expect(screen.queryByText('Ana')).not.toBeInTheDocument())
    expect(api).toHaveBeenCalledWith('/residents/resident-1/archive', expect.objectContaining({ method: 'POST' }))
    fireEvent.change(screen.getByRole('combobox', { name: /archivados/i }), { target: { value: 'ARCHIVED' } })
    const [restoreResident] = await screen.findAllByRole('button', { name: /restaurar residente/i })
    fireEvent.click(restoreResident)
    fireEvent.click(within(screen.getByRole('dialog', { name: /restaurar residente/i })).getByRole('button', { name: /restaurar residente/i }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /archivar residente/i })).toHaveLength(2))
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Current peer')).toBeInTheDocument()
    expect(screen.getByText('Archived peer')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: /archivados/i }), { target: { value: 'CURRENT' } })
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Revocado')).toBeInTheDocument()
  })

  it('keeps current and archived residents visible when the server includes both sets', async () => {
    const current = resident({ id: 'current', name: 'Current Ana' })
    const archived = resident({ id: 'archived', name: 'Archived Ana', archivedAt: '2026-01-01', active: false })
    vi.mocked(api).mockImplementation((path) => String(path).startsWith('/units') ? Promise.resolve(page([])) as never : Promise.resolve(page(String(path).includes('includeArchived=true') ? [current, archived] : [current])) as never)
    render(<ResidentsPage />)
    expect(await screen.findByText('Current Ana')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: /archivados/i }), { target: { value: 'ARCHIVED' } })
    expect(await screen.findByText('Archived Ana')).toBeInTheDocument()
    expect(screen.getByText('Current Ana')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /incluir archivados/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /archivar residente/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurar residente/i })).toBeInTheDocument()
  })

  it('sends status=false, then proves unit archive, restore, code reservation conflict, and activation isolation through server responses', async () => {
    let archived = false
    const currentPeer = unit({ id: 'current-peer', code: 'CURRENT-PEER' })
    const archivedPeer = unit({ id: 'archived-peer', code: 'ARCHIVED-PEER', archivedAt: '2026-01-01' })
    vi.mocked(api).mockImplementation((path, options) => {
      if (path === '/units/unit-1/archive') { archived = true; return Promise.resolve({}) as never }
      if (path === '/units/unit-1/restore') { archived = false; return Promise.resolve({}) as never }
      if (path === '/units' && options?.method === 'POST') return Promise.reject(new ApiError(409, 'Unit code is already registered', 'CONFLICT', { details: { code: ['Unit code is already registered'] } })) as never
      if (String(path).startsWith('/units/unit-1') && options?.method === 'PATCH') return Promise.resolve({}) as never
      const archivedOnly = String(path).includes('includeArchived=true')
      return Promise.resolve(page(archivedOnly ? (archived ? [unit({ archivedAt: '2026-01-01' }), currentPeer, archivedPeer] : [unit(), currentPeer, archivedPeer]) : (archived ? [] : [unit()]))) as never
    })
    render(<UnitsPage />)
    expect(await screen.findByText('A-101')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por estado/i }), { target: { value: 'INACTIVE' } })
    await waitFor(() => expect(api).toHaveBeenCalledWith('/units?page=1&pageSize=10&status=false', expect.anything()))
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por estado/i }), { target: { value: 'ALL' } })
    fireEvent.click(await screen.findByRole('button', { name: /archivar unidad/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /archivar unidad/i })).getByRole('button', { name: /archivar unidad/i }))
    await waitFor(() => expect(screen.queryByText('A-101')).not.toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox', { name: /archivados/i }), { target: { value: 'ARCHIVED' } })
    expect(await screen.findByText('A-101')).toBeInTheDocument()
    expect(screen.getByText('CURRENT-PEER')).toBeInTheDocument()
    expect(screen.getByText('ARCHIVED-PEER')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /desactivar/i })).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: /agregar unidad/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej. Torre A-101'), { target: { value: 'A-101' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. Calle 10 # 20-30'), { target: { value: 'Main Street 101' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. 2'), { target: { value: '2' } })
    fireEvent.submit(screen.getByRole('button', { name: /crear unidad/i }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('La solicitud contiene datos no válidos.')
    expect(api).toHaveBeenCalledWith('/units', { method: 'POST', body: JSON.stringify({ code: 'A-101', address: 'Main Street 101', parkingSpaces: 2 }) })
    expect(screen.getByPlaceholderText('Ej. Torre A-101')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Revise este campo.')).toBeInTheDocument()
    expect(screen.getByText('A-101')).toBeInTheDocument()
    expect(screen.getByText('CURRENT-PEER')).toBeInTheDocument()
    expect(screen.getByText('ARCHIVED-PEER')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /restaurar unidad/i })[0])
    fireEvent.click(within(screen.getByRole('dialog', { name: /restaurar unidad/i })).getByRole('button', { name: /restaurar unidad/i }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /archivar unidad/i })).toHaveLength(2))
    expect(screen.getByText('A-101')).toBeInTheDocument()
    expect(screen.getByText('CURRENT-PEER')).toBeInTheDocument()
    expect(screen.getByText('ARCHIVED-PEER')).toBeInTheDocument()
  })

  it('keeps current and archived units visible when the server includes both sets', async () => {
    const current = unit({ id: 'current', code: 'CURRENT-1' })
    const archived = unit({ id: 'archived', code: 'ARCHIVED-1', archivedAt: '2026-01-01', active: false })
    vi.mocked(api).mockImplementation((path) => Promise.resolve(page(String(path).includes('includeArchived=true') ? [current, archived] : [current])) as never)
    render(<UnitsPage />)
    expect(await screen.findByText('CURRENT-1')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: /archivados/i }), { target: { value: 'ARCHIVED' } })
    expect(await screen.findByText('ARCHIVED-1')).toBeInTheDocument()
    expect(screen.getByText('CURRENT-1')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /incluir archivadas/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /archivar unidad/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurar unidad/i })).toBeInTheDocument()
  })

  it.each([{ Page: ResidentsPage, row: resident(), path: '/residents', input: /buscar por nombre/i }, { Page: UnitsPage, row: unit(), path: '/units', input: /buscar por código/i }])('clears $path rows for 401 and 403 without a forbidden retry', async ({ Page, row, path, input }) => {
    for (const status of [401, 403]) {
      vi.mocked(api).mockImplementation((request) => String(request).startsWith(path) && String(request).includes('search=blocked') ? Promise.reject(new ApiError(status, `${status} terminal`, status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN')) as never : Promise.resolve(String(request).startsWith(path) ? page([row]) : page([])) as never)
      const view = render(<Page />)
      expect(await screen.findByText(status === 401 ? (path === '/residents' ? 'Ana' : 'A-101') : path === '/residents' ? 'Ana' : 'A-101')).toBeInTheDocument()
      fireEvent.change(screen.getByRole('textbox', { name: input }), { target: { value: 'blocked' } })
      await waitFor(() => expect(api).toHaveBeenCalledWith(`${path}?page=1&pageSize=10&search=blocked`, expect.anything()))
      expect(await screen.findByRole('alert')).toHaveTextContent(`${status} terminal`)
      expect(screen.queryByText(path === '/residents' ? 'Ana' : 'A-101')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
      view.unmount(); vi.mocked(api).mockReset()
    }
  })

  it('renders only the newest detail route and aborts route and unmount owners', async () => {
    const first = deferred<ReturnType<typeof resident>>(), second = deferred<ReturnType<typeof resident>>(), third = deferred<ReturnType<typeof resident>>()
    vi.mocked(api).mockImplementation((path) => (path === '/residents/first?includeArchived=true' ? first : path === '/residents/second?includeArchived=true' ? second : third).promise as never)
    const view = render(<MemoryRouter initialEntries={['/residents/first']}><Routes><Route path="/residents/:residentId" element={<DetailRoute />} /></Routes></MemoryRouter>)
    await waitFor(() => expect(vi.mocked(api)).toHaveBeenCalledWith('/residents/first?includeArchived=true', expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: 'second' })); expect(vi.mocked(api)).toHaveBeenCalledWith('/residents/second?includeArchived=true', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    second.resolve(resident({ id: 'second', name: 'Second' })); expect(await screen.findByText('Second')).toBeInTheDocument()
    first.resolve(resident({ id: 'first', name: 'First' })); await waitFor(() => expect(screen.queryByText('First')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'third' })); await waitFor(() => expect(vi.mocked(api)).toHaveBeenCalledWith('/residents/third?includeArchived=true', expect.objectContaining({ signal: expect.any(AbortSignal) })))
    view.unmount(); expect(vi.mocked(api).mock.calls[2][1]?.signal?.aborted).toBe(true); third.resolve(resident({ id: 'third', name: 'Third' }))
  })

  it.each([{ Page: ResidentsPage, start: /archivar residente/i, next: /activar/i, request: '/residents/resident-1/archive', stale: 'resident stale' }, { Page: UnitsPage, start: /archivar unidad/i, next: /desactivar/i, request: '/units/unit-1/archive', stale: 'unit stale' }])('isolates stale $request failures from a newer action', async ({ Page, start, next, request, stale }) => {
    const old = deferred<object>()
    vi.mocked(api).mockImplementation((path, options) => path === request ? old.promise as never : String(path).startsWith('/residents') || String(path).startsWith('/units') ? options?.method === 'PATCH' ? Promise.resolve({}) as never : Promise.resolve(page([Page === ResidentsPage ? resident() : unit()])) as never : Promise.resolve(page([])) as never)
    render(<Page />); expect(await screen.findByRole('button', { name: start })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: start })); fireEvent.click(within(screen.getByRole('dialog', { name: start })).getByRole('button', { name: start }))
    fireEvent.click(screen.getByRole('button', { name: next, hidden: true })); old.reject(new Error(stale))
    expect(await screen.findByRole('dialog', { name: next })).toBeInTheDocument(); await waitFor(() => expect(screen.queryByText(stale)).not.toBeInTheDocument())
    fireEvent.click(within(screen.getByRole('dialog', { name: next })).getByRole('button', { name: next }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/(residents|units)\/resident-1|\/units\/unit-1/), expect.objectContaining({ method: 'PATCH' })))
  })
})
