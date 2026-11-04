// oxlint-disable react/set-state-in-effect -- Administrative list is synchronized on mount.
import { useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import { ErrorState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Plus } from 'lucide-react'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  function closeCreate() {
    if (lock.current) return
    setModalOpen(false); setEmail(''); setPassword(''); setDisplayName(''); setCreateError('')
  }
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    api<Guard[]>('/access/guards', { signal: controller.signal }).then((items) => { if (active) setGuards(items) }).catch((value: Error) => { if (active) setError(value.message) })
    return () => { active = false; controller.abort() }
  }, [])
  async function create() {
    if (lock.current) return
    lock.current = true; setBusy(true); setCreateError(''); setCreated(false)
    try {
      const guard = await api<Guard>('/access/guards', { method: 'POST', body: JSON.stringify({ email: email.trim(), password, ...(displayName.trim() ? { displayName: displayName.trim() } : {}) }) })
      setGuards((items) => [...items.filter((item) => item.id !== guard.id), guard]); setEmail(''); setPassword(''); setDisplayName(''); setCreated(true); setModalOpen(false)
    } catch (value) { setCreateError(value instanceof Error ? value.message : 'No se pudo crear el guardia.') }
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
  return <><PageHeader title="Guardias" description="Cree cuentas de guardia y autorice por separado su acceso a la garita." action={<Button disabled={busy} onClick={() => { setCreated(false); setCreateError(''); setModalOpen(true) }}><Plus className="size-4" />Crear guardia</Button>} />{error && <ErrorState message={error} />}
    {created && <p role="status" className="mb-4 text-sm">Guardia creado. Autorice la garita solo cuando corresponda.</p>}
    <section className="min-w-0" aria-label="Guardias registrados"><h2 className="mb-4 text-xl font-semibold">Equipo de garita</h2>{guards.length ? <ul className="divide-y rounded-xl border bg-card px-4">{guards.map((guard) => <li key={guard.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-semibold">{guard.displayName || guard.email}</p><p className="break-all text-sm text-muted-foreground">{guard.email}</p><p className="mt-1 text-sm">{!guard.active ? 'Cuenta inactiva' : guard.authorized ? 'Garita autorizada' : 'Sin autorización de garita'}</p></div><Button variant="outline" disabled={busy || !guard.active} aria-label={`${guard.authorized ? 'Revocar autorización de' : 'Autorizar a'} ${guard.displayName || guard.email}`} onClick={() => void authorize(guard)}>{guard.authorized ? 'Revocar autorización' : 'Autorizar garita'}</Button></li>)}</ul> : <p className="text-muted-foreground">No hay guardias disponibles.</p>}</section>
    <Modal open={modalOpen} onClose={closeCreate} busy={busy} title="Nuevo guardia" description="Cree la cuenta y autorice su acceso a la garita por separado.">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void create() }}>
        {createError && <p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{createError}</p>}
        <label className="block text-sm">Nombre (opcional)<input className={inputClass} value={displayName} maxLength={120} disabled={busy} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <label className="block text-sm">Correo electrónico<input className={inputClass} type="email" autoComplete="off" required value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block text-sm">Contraseña temporal<input className={inputClass} type="password" autoComplete="new-password" minLength={12} required value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} /></label>
        <p className="text-xs text-muted-foreground">Mínimo 12 caracteres. La cuenta se crea sin autorización de garita.</p>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={closeCreate}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Crear guardia'}</Button></div>
      </form>
    </Modal>
  </>
}
