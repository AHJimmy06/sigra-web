// oxlint-disable react/set-state-in-effect -- Session-scoped inbox synchronizes with server state.
import { useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/PageState'

interface Arrival { id: string; visitorName: string | null; occurredAt: string; unitCode: string }

export function ResidentArrivals() {
  const { user } = useAuth()
  const [epoch, setEpoch] = useState(0)
  const [suspended, setSuspended] = useState(false)
  useEffect(() => {
    const reset = () => { setEpoch((value) => value + 1); setSuspended(false) }
    const expire = () => { setEpoch((value) => value + 1); setSuspended(true) }
    window.addEventListener('sigra:session-updated', reset)
    window.addEventListener('sigra:session-expired', expire)
    return () => { window.removeEventListener('sigra:session-updated', reset); window.removeEventListener('sigra:session-expired', expire) }
  }, [])
  if (!user || user.role !== 'RESIDENT' || suspended) return null
  return <ArrivalInbox key={`${user.sub}:${user.residentId}:${epoch}`} />
}

function ArrivalInbox() {
  const [items, setItems] = useState<Arrival[]>([])
  const [notice, setNotice] = useState<Arrival>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const refresh = useRef<() => void>(() => undefined)
  useEffect(() => {
    let active = true
    let busy = false
    let initialized = false
    const seen = new Set<string>()
    const controller = new AbortController()
    async function load() {
      if (!active || busy || document.visibilityState === 'hidden') return
      busy = true
      setLoading(true)
      try {
        const response = await api<{ items: Arrival[] }>('/access/arrivals', { signal: controller.signal })
        if (!active) return
        const unique = [...new Map(response.items.map((item) => [item.id, item])).values()]
        const latest = unique.find((item) => !seen.has(item.id))
        if (initialized && latest) setNotice(latest)
        unique.forEach((item) => seen.add(item.id))
        initialized = true
        setItems(unique)
        setError('')
      } catch (value) { if (active) setError(value instanceof Error ? value.message : 'No se pudieron cargar las llegadas.') }
      finally { busy = false; if (active) setLoading(false) }
    }
    refresh.current = () => void load()
    void load()
    const timer = window.setInterval(() => void load(), 15_000)
    const foreground = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', foreground)
    return () => { active = false; controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', foreground) }
  }, [])
  return <section aria-labelledby="arrivals-heading" className="mb-7 rounded-xl border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="arrivals-heading" className="text-xl font-semibold">Llegadas de visitantes</h2><Button variant="outline" disabled={loading} onClick={() => refresh.current()}>Actualizar llegadas</Button></div>
    <p className="mt-2 text-sm text-muted-foreground">Se actualiza cada 15 segundos mientras esta pantalla está visible. No envía notificaciones con la aplicación cerrada.</p>
    {notice && <div role="status" className="mt-4 border-l-4 border-emerald-600 bg-emerald-50 p-3 text-emerald-950"><p>Ingresó {notice.visitorName || 'un visitante'} a su unidad {notice.unitCode}.</p><Button variant="outline" className="mt-2" onClick={() => setNotice(undefined)}>Cerrar aviso</Button></div>}
    {error && <ErrorState message={error} />}
    {items.length ? <ul className="mt-4 divide-y">{items.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3"><span className="font-medium">{item.visitorName || 'Visitante'}</span><span className="text-sm text-muted-foreground">{item.unitCode} · {new Date(item.occurredAt).toLocaleString('es')}</span></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">{loading ? 'Consultando llegadas…' : 'No hay llegadas registradas.'}</p>}
  </section>
}
