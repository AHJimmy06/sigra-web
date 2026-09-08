import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
import { ResidentsPage } from './ResidentsPage'

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>()
  return { ...original, api: vi.fn() }
})

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

  it('matches resident DTO boundaries including the international phone policy', async () => {
    render(<ResidentsPage />)
    await screen.findByText('Ana Garcia')
    fireEvent.click(screen.getByRole('button', { name: /agregar residente/i }))
    const name = screen.getByPlaceholderText('Ej. Ana García')
    const phone = screen.getByPlaceholderText(/ext\. 4/i)
    const password = screen.getByPlaceholderText('Mínimo 8 caracteres')
    expect(name).toHaveAttribute('minlength', '3')
    expect(name).toHaveAttribute('maxlength', '100')
    expect(name).not.toHaveAttribute('pattern')
    expect(phone).toHaveAttribute('maxlength', '40')
    expect(phone).toHaveAttribute('minlength', '7')
    expect(phone).toHaveAttribute('pattern')
    fireEvent.change(phone, { target: { value: 'extension textual' } })
    expect(phone).toBeInvalid()
    fireEvent.input(phone, { target: { value: '+593 300 123 4567 ext. 4' } })
    expect(phone).toBeValid()
    expect(password).toHaveAttribute('minlength', '8')
    expect(password).toHaveAttribute('maxlength', '72')
    expect(password).not.toHaveAttribute('pattern')
  })

  it('confirms discarding only after the creation form is modified', async () => {
    render(<ResidentsPage />)
    await screen.findByText('Ana Garcia')
    fireEvent.click(screen.getByRole('button', { name: /agregar residente/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /agregar residente/i })).getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog', { name: /descartar cambios/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /agregar residente/i }))
    const name = screen.getByPlaceholderText('Ej. Ana García')
    fireEvent.input(name, { target: { value: 'Ana' } })
    fireEvent.input(name, { target: { value: '' } })
    fireEvent.click(within(screen.getByRole('dialog', { name: /agregar residente/i })).getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog', { name: /descartar cambios/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /agregar residente/i }))
    fireEvent.input(screen.getByPlaceholderText('Ej. Ana García'), { target: { value: 'Ana' } })
    fireEvent.click(within(screen.getByRole('dialog', { name: /agregar residente/i })).getByRole('button', { name: /cancelar/i }))
    const confirmation = screen.getByRole('dialog', { name: /descartar cambios/i })
    fireEvent.click(within(confirmation).getByRole('button', { name: /descartar cambios/i }))
    expect(screen.queryByRole('dialog', { name: /agregar residente/i })).not.toBeInTheDocument()
  })

  it('distinguishes an empty registry from an empty filtered result', async () => {
    vi.mocked(api).mockImplementation((path) => Promise.resolve(path.startsWith('/units')
      ? { items: [], total: 0, page: 1, pageSize: 100 }
      : { items: [], total: 0, page: 1, pageSize: 10 }) as never)
    render(<ResidentsPage />)
    expect(await screen.findByText('Todavía no hay residentes registrados.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Ana García o Torre/i), { target: { value: 'Ana' } })
    expect(await screen.findByText('No hay residentes que coincidan con los filtros seleccionados.')).toBeInTheDocument()
  })

  it('normalizes API-normalized email and keeps structured errors inside the modal', async () => {
    vi.mocked(api).mockImplementation((path, options) => {
      if (options?.method === 'POST') return Promise.reject(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', { details: { phone: ['phone must be shorter than or equal to 40 characters'] } }))
      return Promise.resolve(path.startsWith('/units')
        ? { items: [{ id: 'unit-1', code: 'A-101', active: true }], total: 1, page: 1, pageSize: 100 }
        : { items: [], total: 0, page: 1, pageSize: 10 }) as never
    })
    render(<ResidentsPage />)
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: /agregar residente/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej. Ana García'), { target: { value: "Zoë O'Connor-Sánchez" } })
    fireEvent.change(screen.getByPlaceholderText('ana.garcia@correo.com'), { target: { value: '  ANA@example.com  ' } })
    fireEvent.change(screen.getByPlaceholderText(/ext\. 4/i), { target: { value: '+593 300 123 4567 ext. 4' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unidad residencial/i }), { target: { value: 'unit-1' } })
    fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), { target: { value: 'abcdefgh' } })
    fireEvent.submit(screen.getByRole('button', { name: /crear residente/i }).closest('form')!)

    const phone = screen.getByPlaceholderText(/ext\. 4/i)
    await waitFor(() => expect(phone).toHaveFocus())
    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog')).toHaveTextContent('La solicitud contiene datos no válidos.')
    const post = vi.mocked(api).mock.calls.find(([, options]) => options?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ name: "Zoë O'Connor-Sánchez", phone: '+593 300 123 4567 ext. 4', email: 'ana@example.com', password: 'abcdefgh' })
  })

  it('loads every unit page in stable order and allows selecting a later-page unit', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `unit-${index + 1}`, code: `A-${String(index + 1).padStart(3, '0')}`, active: true }))
    vi.mocked(api).mockImplementation((path) => {
      if (path === '/units?page=1&pageSize=100') return Promise.resolve({ items: firstPage, total: 101, page: 1, pageSize: 100 }) as never
      if (path === '/units?page=2&pageSize=100') return Promise.resolve({ items: [firstPage[99], { id: 'unit-101', code: 'Z-999', active: true }], total: 101, page: 2, pageSize: 100 }) as never
      return Promise.resolve({ items: [{ id: 'resident-1', name: 'Ana Garcia', email: 'ana@example.com', phone: null, active: true, unit: firstPage[0] }], total: 1, page: 1, pageSize: 10 }) as never
    })
    render(<ResidentsPage />)
    await screen.findByText('Ana Garcia')
    fireEvent.click(screen.getByRole('button', { name: /agregar residente/i }))
    const unitSelect = screen.getByRole('combobox', { name: /unidad residencial/i })
    fireEvent.change(unitSelect, { target: { value: 'unit-101' } })

    const options = within(unitSelect).getAllByRole('option')
    expect(options).toHaveLength(102)
    expect(options.at(-2)).toHaveTextContent('A-100')
    expect(options.at(-1)).toHaveTextContent('Z-999')
    expect(unitSelect).toHaveValue('unit-101')
    expect(within(unitSelect).getByRole('option', { name: 'Z-999' })).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/units?page=2&pageSize=100', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(vi.mocked(api).mock.calls.some(([path]) => String(path).includes('/units?page=3'))).toBe(false)
  })

  it('stops unit traversal when a later page is cancelled', async () => {
    let resolveSecond!: (value: unknown) => void
    const secondPage = new Promise((resolve) => { resolveSecond = resolve })
    vi.mocked(api).mockImplementation((path) => {
      if (path === '/units?page=1&pageSize=100') return Promise.resolve({ items: [{ id: 'unit-1', code: 'A-101', active: true }], total: 201, page: 1, pageSize: 100 }) as never
      if (path === '/units?page=2&pageSize=100') return secondPage as never
      return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10 }) as never
    })
    const { unmount } = render(<ResidentsPage />)
    await waitFor(() => expect(api).toHaveBeenCalledWith('/units?page=2&pageSize=100', expect.objectContaining({ signal: expect.any(AbortSignal) })))
    const signal = vi.mocked(api).mock.calls.find(([path]) => path === '/units?page=2&pageSize=100')?.[1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
    resolveSecond({ items: [{ id: 'unit-101', code: 'B-101', active: true }], total: 201, page: 2, pageSize: 100 })
    await Promise.resolve()
    expect(vi.mocked(api).mock.calls.some(([path]) => path === '/units?page=3&pageSize=100')).toBe(false)
  })

  it('surfaces a later unit-page failure and stops traversal', async () => {
    vi.mocked(api).mockImplementation((path) => {
      if (path === '/units?page=1&pageSize=100') return Promise.resolve({ items: [{ id: 'unit-1', code: 'A-101', active: true }], total: 201, page: 1, pageSize: 100 }) as never
      if (path === '/units?page=2&pageSize=100') return Promise.reject(new Error('No fue posible cargar todas las unidades.'))
      return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10 }) as never
    })
    render(<ResidentsPage />)

    expect(await screen.findByText('No fue posible cargar todas las unidades.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    expect(vi.mocked(api).mock.calls.some(([path]) => path === '/units?page=3&pageSize=100')).toBe(false)
  })

  it('keeps access failures accessible inside the confirmation dialog', async () => {
    vi.mocked(api).mockImplementation((path, options) => {
      if (options?.method === 'PATCH') return Promise.reject(new Error('No fue posible revocar este acceso.'))
      return Promise.resolve(path.startsWith('/units')
        ? { items: [{ id: 'unit-1', code: 'A-101', active: true }], total: 1, page: 1, pageSize: 100 }
        : { items: [{ id: 'resident-1', name: 'Ana Garcia', email: 'ana@example.com', phone: null, active: true, unit: { id: 'unit-1', code: 'A-101', active: true } }], total: 1, page: 1, pageSize: 10 }) as never
    })
    render(<ResidentsPage />)
    await screen.findByText('Ana Garcia')
    fireEvent.click(screen.getByRole('button', { name: /revocar acceso/i }))
    const dialog = screen.getByRole('dialog', { name: /revocar acceso/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /revocar acceso/i }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No fue posible revocar este acceso.')
    expect(alert).toHaveFocus()
  })

  it('returns to the previous filtered page when revoking its last resident', async () => {
    let revoked = false
    let patchAttempts = 0
    const resident = { id: 'resident-last', name: 'Last Resident', email: 'last@example.com', phone: null, active: true, unit: { id: 'unit-1', code: 'A-101', active: true } }
    vi.mocked(api).mockImplementation((path, options) => {
      if (options?.method === 'PATCH') {
        patchAttempts += 1
        if (patchAttempts === 1) return Promise.reject(new Error('No fue posible revocar este acceso.'))
        revoked = true
        return Promise.resolve({}) as never
      }
      if (path.startsWith('/units')) return Promise.resolve({ items: [resident.unit], total: 1, page: 1, pageSize: 100 }) as never
      const page = String(path).includes('page=2') ? 2 : 1
      return Promise.resolve({ items: revoked && page === 2 ? [] : [resident], total: revoked ? 10 : 11, page, pageSize: 10 }) as never
    })
    render(<ResidentsPage />)
    await screen.findByText('Last Resident')
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por estado/i }), { target: { value: 'ACTIVE' } })
    fireEvent.click(await screen.findByRole('button', { name: /siguiente/i }))
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()))
    fireEvent.click(screen.getByRole('button', { name: /revocar acceso/i }))
    const dialog = screen.getByRole('dialog', { name: /revocar acceso/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /revocar acceso/i }))
    expect(await within(dialog).findByText('No fue posible revocar este acceso.')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /revocar acceso/i }))

    await waitFor(() => expect(screen.getByText('Mostrando 1-10 de 10')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument()
    expect(api).toHaveBeenCalledWith(expect.stringMatching(/page=1.*status=true/), expect.anything())
  })
})
