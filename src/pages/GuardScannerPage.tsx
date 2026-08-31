import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '@/api/client'
import { ErrorState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'

interface Result { id: string; decision: 'ALLOWED' | 'DENIED'; reason: string; occurredAt: string }
export function GuardScannerPage() {
  const scanner = useRef<Html5Qrcode | null>(null); const processing = useRef(false)
  const [running, setRunning] = useState(false); const [direction, setDirection] = useState<'ENTRY' | 'EXIT'>('ENTRY'); const [result, setResult] = useState<Result>(); const [error, setError] = useState('')
  useEffect(() => () => { if (scanner.current?.isScanning) void scanner.current.stop() }, [])
  async function submit(payload: string) { if (processing.current) return; processing.current = true; setError(''); try { const value = await api<Result>('/access/validate', { method: 'POST', body: JSON.stringify({ qrPayload: payload, clientEventId: crypto.randomUUID(), direction }) }); setResult(value) } catch (e) { setError(e instanceof Error ? e.message : 'Validation failed') } finally { window.setTimeout(() => { processing.current = false }, 1500) } }
  async function start() { setError(''); const instance = new Html5Qrcode('qr-reader'); scanner.current = instance; try { await instance.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => void submit(text), () => undefined); setRunning(true) } catch (e) { setError(e instanceof Error ? e.message : 'Camera permission is required'); instance.clear() } }
  async function stop() { if (scanner.current?.isScanning) await scanner.current.stop(); await scanner.current?.clear(); setRunning(false) }
  return <><PageHeader title="Guard QR scanner" description="Online validation checks temporal authenticity and records every decision." />{error && <ErrorState message={error} />}
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><section className="rounded-xl border bg-card p-4"><div id="qr-reader" className="min-h-72 overflow-hidden rounded-lg bg-muted" /><div className="mt-4 flex flex-wrap gap-3"><select className="rounded-lg border bg-background px-3 py-2" value={direction} onChange={(e) => setDirection(e.target.value as 'ENTRY' | 'EXIT')} disabled={running}><option value="ENTRY">Entry</option><option value="EXIT">Exit</option></select>{running ? <Button variant="outline" onClick={() => void stop()}>Stop camera</Button> : <Button onClick={() => void start()}>Start camera</Button>}</div></section>
      <aside className={`rounded-xl border p-5 ${result?.decision === 'ALLOWED' ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : result ? 'border-red-500 bg-red-50 text-red-950' : 'bg-card'}`}><h2 className="font-semibold">Latest validation</h2>{result ? <><p className="mt-5 text-3xl font-bold">{result.decision}</p><p className="mt-2 text-sm">{result.reason.replaceAll('_', ' ')}</p><p className="mt-4 text-xs opacity-70">Recorded {new Date(result.occurredAt).toLocaleTimeString()}</p></> : <p className="mt-3 text-sm text-muted-foreground">Scan a SIGRA access payload to see the result.</p>}</aside></div>
    <p className="mt-5 text-sm text-muted-foreground">Offline boundary: this guard client requires the API to validate TOTP material. It does not cache verifier secrets. Failed network requests are not recorded until retried.</p>
  </>
}
