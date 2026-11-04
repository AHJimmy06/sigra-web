// oxlint-disable react/set-state-in-effect -- Administrative list is synchronized on mount.
import { useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import { ErrorState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'

interface Guard { id: string; email: string; displayName: string | null; active: boolean; authorized: boolean }
const inputClass = 'mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2'
export function GuardsPage() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [created, setCreated] = useState(false)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    api<Guard[]>('/access/guards', { signal: controller.signal }).then((items) => { if (active) setGuards(items) }).catch((value: Error) => { if (active) setError(value.message) })
    return () => { active = false; controller.abort() }
  }, [])
  async function create() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setCreated(false)
    try {
      const guard = await api<Guard>('/access/guards', { method: 'POST', body: JSON.stringify({ email: email.trim(), password, ...(displayName.trim() ? { displayName: displayName.trim() } : {}) }) })
      setGuards((items) => [...items.filter((item) => item.id !== guard.id), guard]); setEmail(''); setPassword(''); setDisplayName(''); setCreated(true)
    } catch (value) { setError(value instanceof Error ? value.message : 'No se pudo crear el guardia.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function authorize(guard: Guard) {
    if (lock.current || !guard.active) return
    lock.current = true; setBusy(true); setError('')
    try {
      await api(`/access/guards/${guard.id}/gate-authorization`, { method: 'PATCH', body: JSON.stringify({ authorized: !guard.authorized }) })
      setGuards((items) => items.map((item) => item.id === guard.id ? { ...item, authorized: !guard.authorized } : item))
    } catch (value) { setError(value instanceof Error ? value.message : 'No se pudo cambiar la autorización.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <><PageHeader title="Guardias" description="Cree cuentas de guardia y autorice por separado su acceso a la garita." />{error && <ErrorState message={error} />}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"><section className="min-w-0" aria-label="Guardias registrados"><h2 className="mb-4 text-xl font-semibold">Equipo de garita</h2>{guards.length ? <ul className="divide-y rounded-xl border bg-card px-4">{guards.map((guard) => <li key={guard.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-semibold">{guard.displayName || guard.email}</p><p className="break-all text-sm text-muted-foreground">{guard.email}</p><p className="mt-1 text-sm">{!guard.active ? 'Cuenta inactiva' : guard.authorized ? 'Garita autorizada' : 'Sin autorización de garita'}</p></div><Button variant="outline" disabled={busy || !guard.active} aria-label={`${guard.authorized ? 'Revocar autorización de' : 'Autorizar a'} ${guard.displayName || guard.email}`} onClick={() => void authorize(guard)}>{guard.authorized ? 'Revocar autorización' : 'Autorizar garita'}</Button></li>)}</ul> : <p className="text-muted-foreground">No hay guardias disponibles.</p>}</section>
    <form className="space-y-4 rounded-xl border bg-card p-5" onSubmit={(event) => { event.preventDefault(); void create() }}><h2 className="text-xl font-semibold">Nuevo guardia</h2><label className="block text-sm">Nombre (opcional)<input className={inputClass} value={displayName} maxLength={120} onChange={(event) => setDisplayName(event.target.value)} /></label><label className="block text-sm">Correo electrónico<input className={inputClass} type="email" autoComplete="off" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm">Contraseña temporal<input className={inputClass} type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><p className="text-xs text-muted-foreground">Mínimo 12 caracteres. La cuenta se crea sin autorización de garita.</p><Button disabled={busy}>{busy ? 'Guardando…' : 'Crear guardia'}</Button>{created && <p role="status" className="text-sm">Guardia creado. Autorice la garita solo cuando corresponda.</p>}</form></div>
  </>
}
