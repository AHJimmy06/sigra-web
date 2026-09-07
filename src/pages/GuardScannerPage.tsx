import { Camera, CameraOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '@/api/client'
import { ErrorState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'

interface Result { id: string; decision: 'ALLOWED' | 'DENIED'; reason: string; occurredAt: string }
const decisionLabels: Record<Result['decision'], string> = { ALLOWED: 'AUTORIZADO', DENIED: 'DENEGADO' }
const reasonLabels: Record<string, string> = {
  ALLOWED: 'Acceso autorizado.',
  DENIED: 'Acceso denegado.',
  EXPIRED: 'El código de acceso ha vencido.',
  INVALID: 'El código de acceso no es válido.',
  INVALID_TOTP: 'El código de acceso no es válido.',
  RESIDENT_INACTIVE: 'El acceso del residente está inactivo.',
  UNIT_INACTIVE: 'El acceso de la unidad está inactivo.',
}
export function GuardScannerPage() {
  const scanner = useRef<Html5Qrcode | null>(null); const processing = useRef(false)
  const [running, setRunning] = useState(false); const [direction, setDirection] = useState<'ENTRY' | 'EXIT'>('ENTRY'); const [result, setResult] = useState<Result>(); const [error, setError] = useState('')
  useEffect(() => () => { if (scanner.current?.isScanning) void scanner.current.stop() }, [])
  async function submit(payload: string) { if (processing.current) return; processing.current = true; setError(''); try { const value = await api<Result>('/access/validate', { method: 'POST', body: JSON.stringify({ qrPayload: payload, clientEventId: crypto.randomUUID(), direction }) }); setResult(value) } catch { setError('No fue posible validar el acceso.') } finally { window.setTimeout(() => { processing.current = false }, 1500) } }
  async function start() { setError(''); const instance = new Html5Qrcode('qr-reader'); scanner.current = instance; try { await instance.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => void submit(text), () => undefined); setRunning(true) } catch { setError('Se requiere permiso para utilizar la cámara.'); instance.clear() } }
  async function stop() { if (scanner.current?.isScanning) await scanner.current.stop(); await scanner.current?.clear(); setRunning(false) }
  return <><PageHeader title="Escáner QR para guardias" description="La validación en línea comprueba la autenticidad temporal y registra cada decisión." />{error && <ErrorState message={error} />}
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><section className="rounded-xl border bg-card p-4"><div id="qr-reader" className="min-h-72 overflow-hidden rounded-lg bg-muted" /><div className="mt-4 flex flex-wrap gap-3"><select aria-label="Dirección del acceso" className="cursor-pointer rounded-lg border bg-background px-3 py-2" value={direction} onChange={(e) => setDirection(e.target.value as 'ENTRY' | 'EXIT')} disabled={running}><option value="ENTRY">Entrada</option><option value="EXIT">Salida</option></select>{running ? <Button variant="outline" onClick={() => void stop()}><CameraOff className="size-4" />Detener cámara</Button> : <Button onClick={() => void start()}><Camera className="size-4" />Iniciar cámara</Button>}</div></section>
      <aside className={`rounded-xl border p-5 ${result?.decision === 'ALLOWED' ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : result ? 'border-red-500 bg-red-50 text-red-950' : 'bg-card'}`}><h2 className="font-semibold">Última validación</h2>{result ? <><p className="mt-5 text-3xl font-bold">{decisionLabels[result.decision]}</p><p className="mt-2 text-sm">{reasonLabels[result.reason] ?? (result.decision === 'ALLOWED' ? 'Acceso autorizado.' : 'Acceso denegado.')}</p><p className="mt-4 text-xs opacity-70">Registrado a las {new Date(result.occurredAt).toLocaleTimeString('es')}</p></> : <p className="mt-3 text-sm text-muted-foreground">Escanee un código de acceso de SIGRA para ver el resultado.</p>}</aside></div>
    <p className="mt-5 text-sm text-muted-foreground">Límite sin conexión: este cliente para guardias requiere la API para validar el material TOTP. No almacena en caché los secretos de verificación. Las solicitudes de red fallidas no se registran hasta que se vuelven a intentar.</p>
  </>
}
