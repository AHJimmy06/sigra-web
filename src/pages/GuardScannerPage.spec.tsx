import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuardScannerPage } from './GuardScannerPage'
const mocks = vi.hoisted(() => ({ api: vi.fn(), scan: undefined as undefined | ((value: string) => void) }))
vi.mock('@/api/client', async (original) => ({ ...await original<object>(), api: mocks.api }))
vi.mock('html5-qrcode', () => ({ Html5Qrcode: class { isScanning = false; async start(_camera: unknown, _config: unknown, scan: (value: string) => void) { this.isScanning = true; mocks.scan = scan } async stop() { this.isScanning = false } clear() {} } }))
const preview = { residentId: 'r1', residentName: 'Ana Pérez', unitCode: 'A-12', validUntil: '2099-01-01' }
async function scan() { fireEvent.click(screen.getByRole('button', { name: /Iniciar cámara/ })); await waitFor(() => expect(mocks.scan).toBeDefined()); await act(async () => mocks.scan!('qr-one')); await screen.findByLabelText('Visitante') }
describe('guard confirmation workflow', () => {
 beforeEach(() => { mocks.scan = undefined; mocks.api.mockReset(); mocks.api.mockImplementation((path: string) => path === '/access/preview' ? Promise.resolve(preview) : Promise.resolve({ id: 'e1', decision: 'ALLOWED', reason: 'VALID_PASS', occurredAt: '2026-01-01' })) })
 it('previews a scan without recording access, prefills resident, then explicitly confirms once', async () => {
  render(<GuardScannerPage />); await scan()
  expect(mocks.api).toHaveBeenCalledTimes(1); expect(mocks.api.mock.calls[0][0]).toBe('/access/preview')
  expect(screen.getByLabelText('Residente')).toHaveValue('Ana Pérez'); expect(screen.getByLabelText('Unidad')).toHaveValue('A-12')
  fireEvent.change(screen.getByLabelText('Visitante'), { target: { value: ' Luis ' } })
  let resolve!: (value: unknown) => void; mocks.api.mockImplementation(() => new Promise((r) => { resolve = r }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' })); fireEvent.click(screen.getByRole('button', { name: /Confirmando/ }))
  expect(mocks.api).toHaveBeenCalledTimes(2)
  expect(JSON.parse(mocks.api.mock.calls[1][1].body)).toMatchObject({ visitorName: 'Luis', qrPayload: 'qr-one', direction: 'ENTRY' })
  resolve({ id: 'e1', decision: 'ALLOWED', reason: 'VALID_PASS', occurredAt: '2026-01-01' }); expect(await screen.findByText('Acceso autorizado')).toBeInTheDocument()
 })
 it('ignores duplicate scan callbacks while preview is pending and never auto-validates', async () => {
  let resolve!: (value: unknown) => void; mocks.api.mockImplementation(() => new Promise((r) => { resolve = r }))
  render(<GuardScannerPage />); fireEvent.click(screen.getByRole('button', { name: /Iniciar cámara/ })); await waitFor(() => expect(mocks.scan).toBeDefined())
  await act(async () => { mocks.scan!('qr-one'); mocks.scan!('qr-two') }); expect(mocks.api).toHaveBeenCalledTimes(1)
  await act(async () => resolve(preview)); expect(await screen.findByLabelText('Visitante')).toBeInTheDocument()
 })
 it('shows the final server denial when a preview expires before confirmation', async () => {
  render(<GuardScannerPage />); await scan(); fireEvent.change(screen.getByLabelText('Visitante'), { target: { value: 'Luis' } })
  mocks.api.mockResolvedValue({ id: 'e1', decision: 'DENIED', reason: 'PASS_EXPIRED', occurredAt: '2026-01-01' })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' })); expect(await screen.findByText('Acceso denegado')).toBeInTheDocument(); expect(screen.getByText('El pase de acceso ha vencido.')).toBeInTheDocument()
 })
 it('offers manual preview when camera cannot start', async () => {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
  render(<GuardScannerPage />); fireEvent.click(screen.getByRole('button', { name: /Iniciar cámara/ })); expect(await screen.findByText(/HTTPS o localhost/)).toBeInTheDocument()
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: undefined })
  fireEvent.click(screen.getByText('Ingresar código manualmente')); fireEvent.change(screen.getByLabelText('Contenido del código QR'), { target: { value: 'manual-qr' } }); fireEvent.click(screen.getByRole('button', { name: 'Comprobar pase' }))
  await screen.findByLabelText('Visitante'); expect(mocks.api).toHaveBeenCalledWith('/access/preview', expect.objectContaining({ body: JSON.stringify({ qrPayload: 'manual-qr' }) })); expect(mocks.api).toHaveBeenCalledTimes(1)
 })
 it('cancels preview without recording any event', async () => { render(<GuardScannerPage />); await scan(); fireEvent.click(screen.getByRole('button', { name: 'Cancelar visita' })); expect(mocks.api).toHaveBeenCalledTimes(1); expect(screen.queryByLabelText('Visitante')).not.toBeInTheDocument() })
 it('retains the exact pending request after ambiguous failure and requires explicit new scan', async () => {
  render(<GuardScannerPage />); await scan(); fireEvent.change(screen.getByLabelText('Visitante'), { target: { value: 'Luis' } }); mocks.api.mockRejectedValue(new Error('network'))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' })); await screen.findByText(/resultado no está confirmado/)
  expect(screen.getByLabelText('Visitante')).toBeDisabled(); fireEvent.click(screen.getByRole('button', { name: 'Reintentar confirmación' })); await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(3)); expect(mocks.api.mock.calls[1][1].body).toBe(mocks.api.mock.calls[2][1].body)
 })
})
