import { Camera, CameraOff, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api, ApiError } from '@/api/client'
import { ErrorState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { accessReasonLabel } from '@/lib/accessReasons'
import { nextValidationAttempt, type ValidationAttempt } from '@/lib/accessValidationAttempt'

interface Preview { residentId: string; residentName: string; unitCode: string; validUntil: string }
interface Result { id: string; decision: 'ALLOWED' | 'DENIED'; reason: string; occurredAt: string; residentName?: string; unitCode?: string }
const inputClass = 'mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-foreground'

export function GuardScannerPage() {
  const scanner = useRef<Html5Qrcode | null>(null)
  const processing = useRef(false)
  const scanLocked = useRef(false)
  const cameraLock = useRef(false)
  const mounted = useRef(true)
  const attempt = useRef<ValidationAttempt | undefined>(undefined)
  const [running, setRunning] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [direction, setDirection] = useState<'ENTRY' | 'EXIT'>('ENTRY')
  const [visitorName, setVisitorName] = useState('')
  const [payload, setPayload] = useState('')
  const [manual, setManual] = useState('')
  const [preview, setPreview] = useState<Preview>()
  const [result, setResult] = useState<Result>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    mounted.current = true
    const connection = () => setOnline(navigator.onLine)
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    return () => {
      mounted.current = false
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
      if (scanner.current?.isScanning) void scanner.current.stop().catch(() => undefined)
    }
  }, [])

  async function stop() {
    if (cameraLock.current) return
    cameraLock.current = true
    setCameraBusy(true)
    try {
      if (scanner.current?.isScanning) await scanner.current.stop()
      scanner.current?.clear()
    } catch { if (mounted.current) setError('No se pudo cerrar la cámara. Cierre esta pantalla para liberar el dispositivo.') }
    finally { cameraLock.current = false; if (mounted.current) { setRunning(false); setCameraBusy(false) } }
  }

  async function readPreview(text: string) {
    if (scanLocked.current || processing.current || !text.trim()) return
    if (!navigator.onLine) { setError('Sin conexión. Se necesita la API para comprobar el pase.'); return }
    scanLocked.current = true
    setLocked(true)
    processing.current = true
    setBusy(true)
    setError('')
    try {
      const value = await api<Preview>('/access/preview', { method: 'POST', body: JSON.stringify({ qrPayload: text }) })
      if (!mounted.current) return
      setPayload(text)
      setPreview(value)
      setResult(undefined)
      setVisitorName('')
    } catch (value) { if (mounted.current) setError(value instanceof ApiError ? value.message : 'No se pudo comprobar el pase. Inicie una nueva lectura para reintentar.') }
    finally {
      processing.current = false
      if (mounted.current) { setBusy(false); await stop() }
    }
  }

  async function start() {
    if (cameraLock.current || scanLocked.current) return
    if (window.isSecureContext === false) { setError('La cámara necesita HTTPS o localhost. Abra SIGRA mediante una conexión segura o use el código manual.'); return }
    cameraLock.current = true
    setCameraBusy(true)
    setError('')
    const instance = new Html5Qrcode('qr-reader')
    scanner.current = instance
    try {
      await instance.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => void readPreview(text), () => undefined)
      if (!mounted.current) { await instance.stop(); return }
      setRunning(true)
    } catch { if (mounted.current) setError('No se pudo abrir la cámara. Permita el acceso en el navegador, cierre otras aplicaciones o ingrese el código manualmente.'); instance.clear() }
    finally {
      cameraLock.current = false
      if (mounted.current) { setCameraBusy(false); if (scanLocked.current) void stop() }
    }
  }

  async function confirm() {
    if (processing.current || !preview || result) return
    if (!navigator.onLine) { setError('Sin conexión. No se puede confirmar el acceso.'); return }
    const name = visitorName.trim()
    if (!pending && (!name || name.length > 120)) { setError('Ingrese el nombre del visitante (1 a 120 caracteres).'); return }
    processing.current = true
    setBusy(true)
    setError('')
    attempt.current = pending ? attempt.current : nextValidationAttempt(attempt.current, payload, direction, name)
    try {
      const value = await api<Result>('/access/validate', { method: 'POST', body: JSON.stringify(attempt.current) })
      if (!mounted.current) return
      setResult(value)
      setPending(false)
      attempt.current = undefined
    } catch (value) {
      if (!mounted.current) return
      // Any transport/server failure may have committed: keep the exact request for reconciliation.
      setPending(true)
      setError(`${value instanceof ApiError ? value.message : 'No se pudo contactar al servidor.'} El resultado no está confirmado. Reintente la misma solicitud antes de registrar otra visita.`)
    } finally { processing.current = false; if (mounted.current) setBusy(false) }
  }

  function reset() {
    if (processing.current || cameraLock.current) return
    if (pending && !window.confirm('El resultado sigue sin confirmar. Una nueva lectura podría registrar otra visita. ¿Descartar el reintento pendiente?')) return
    scanLocked.current = false
    setLocked(false)
    attempt.current = undefined
    setPreview(undefined); setResult(undefined); setPending(false); setPayload(''); setManual(''); setVisitorName(''); setError('')
  }

  const stage = result ? 3 : preview ? 2 : 1
  return <div className="mx-auto max-w-5xl">
    <PageHeader title="Control de garita" description="Compruebe el pase, identifique al visitante y confirme el movimiento." />
    <ol aria-label="Progreso del acceso" className="mb-6 grid grid-cols-3 border-b text-sm">
      {['Escanear pase', 'Confirmar visita', 'Resultado'].map((label, index) => <li key={label} aria-current={stage === index + 1 ? 'step' : undefined} className={`border-b-2 px-2 py-3 ${stage === index + 1 ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground'}`}>{index + 1}. {label}</li>)}
    </ol>
    <p className={`mb-4 text-sm ${online ? 'text-foreground' : 'text-destructive'}`}>{online ? 'Verificación en línea disponible' : 'Sin conexión: no autorice accesos'}</p>
    {error && <ErrorState message={error} />}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <section className="min-w-0 rounded-xl border bg-card p-4 sm:p-6" aria-label="Control de acceso">
        <div hidden={!!preview || !!result}>
          <h2 className="mb-3 text-xl font-semibold">Lea el pase del residente</h2>
          <div id="qr-reader" className="min-h-64 overflow-hidden rounded-lg bg-muted" />
          <div className="mt-4 flex flex-wrap gap-3">{running ? <Button variant="outline" disabled={cameraBusy || busy} onClick={() => void stop()}><CameraOff className="size-4" />Detener cámara</Button> : <Button disabled={cameraBusy || busy || !online || locked} onClick={() => void start()}><Camera className="size-4" />{cameraBusy ? 'Iniciando…' : 'Iniciar cámara'}</Button>}{locked && !busy && <Button variant="outline" onClick={reset}>Nueva lectura</Button>}</div>
          <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Ingresar código manualmente</summary><form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); void readPreview(manual) }}><label className="block text-sm">Contenido del código QR<textarea className={inputClass} value={manual} onChange={(event) => setManual(event.target.value)} disabled={busy || locked} /></label><Button variant="outline" disabled={busy || !online || !manual.trim() || locked}>Comprobar pase</Button></form></details>
          {busy && <p role="status" className="mt-3">Comprobando pase…</p>}
        </div>
        {preview && !result && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void confirm() }}>
          <h2 className="text-xl font-semibold">Identifique la visita</h2><p className="text-sm text-muted-foreground">El pase todavía no ha registrado ningún movimiento. Se verificará de nuevo al confirmar.</p>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Residente<input className={inputClass} value={preview.residentName} readOnly /></label><label className="text-sm">Unidad<input className={inputClass} value={preview.unitCode} readOnly /></label></div>
          <label className="block text-sm">Visitante<input className={inputClass} autoFocus required maxLength={120} value={visitorName} disabled={busy || pending} onChange={(event) => setVisitorName(event.target.value)} autoComplete="off" /></label>
          <label className="block text-sm">Dirección del acceso<select className={inputClass} value={direction} disabled={busy || pending} onChange={(event) => setDirection(event.target.value as 'ENTRY' | 'EXIT')}><option value="ENTRY">Entrada</option><option value="EXIT">Salida</option></select></label>
          <p className="text-xs text-muted-foreground">Pase vigente hasta {new Date(preview.validUntil).toLocaleString('es')}.</p>
          <div className="flex flex-col gap-3 sm:flex-row"><Button disabled={busy || !online || !visitorName.trim()}>{busy ? 'Confirmando…' : pending ? 'Reintentar confirmación' : direction === 'ENTRY' ? 'Confirmar entrada' : 'Confirmar salida'}</Button><Button type="button" variant="outline" disabled={busy} onClick={reset}>{pending ? 'Nueva lectura' : 'Cancelar visita'}</Button></div>
        </form>}
        {result && <div role="status" className={`border-l-4 pl-5 ${result.decision === 'ALLOWED' ? 'border-emerald-600' : 'border-red-600'}`}><ShieldCheck className="mb-3 size-8" /><h2 className="text-3xl font-semibold">{result.decision === 'ALLOWED' ? 'Acceso autorizado' : 'Acceso denegado'}</h2><p className="mt-3">{accessReasonLabel(result.reason, result.decision)}</p><p className="mt-3 text-sm">{visitorName.trim()} visita a {preview?.residentName} · {preview?.unitCode}</p><p className="mt-2 text-xs text-muted-foreground">Decisión registrada: {new Date(result.occurredAt).toLocaleString('es')}</p><Button className="mt-6" onClick={reset}>Nueva lectura</Button></div>}
      </section>
      <aside className="border-l-2 border-primary pl-5 text-sm"><h2 className="font-semibold">Antes de abrir la garita</h2><p className="mt-3 text-muted-foreground">Compare el nombre del visitante y la unidad. Abra únicamente cuando el resultado indique acceso autorizado.</p><p className="mt-4 text-muted-foreground">No hay validación sin conexión. Si falla la confirmación, su resultado puede haberse registrado: reintente sin cambiar los datos.</p></aside>
    </div>
  </div>
}
