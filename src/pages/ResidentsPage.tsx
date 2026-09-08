// oxlint-disable react/set-state-in-effect -- List state is synchronized with server query state.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Edit, Filter, Plus, RotateCcw, Search, UserRoundX, X } from 'lucide-react'
import { api } from '@/api/client'
import { toQueryString, type PaginatedResponse } from '@/api/contracts'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { applyApiFieldErrors, clearSpanishValidationMessage, setSpanishValidationMessage } from '@/components/FieldFeedback'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface Unit { id: string; code: string; active: boolean }
interface Resident { id: string; name: string; email?: string; phone: string | null; active: boolean; unit: Unit }
const unitPageSize = 100

async function loadAllUnits(signal?: AbortSignal) {
  const units: Unit[] = []
  const seen = new Set<string>()
  let page = 1
  let pageCount = 1
  do {
    const response = await api<PaginatedResponse<Unit>>(`/units?page=${page}&pageSize=${unitPageSize}`, { signal })
    if (signal?.aborted) return []
    response.items.forEach((unit) => { if (!seen.has(unit.id)) { seen.add(unit.id); units.push(unit) } })
    pageCount = Math.max(1, Math.ceil(response.total / unitPageSize))
    page += 1
  } while (page <= pageCount)
  return units
}

function ModalError({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null
}

export function ResidentsPage() {
  const [items, setItems] = useState<Resident[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState('')
  const [editError, setEditError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Resident | null>(null)
  const [pendingAccess, setPendingAccess] = useState<{ item: Resident; active: boolean } | null>(null)
  const [accessBusy, setAccessBusy] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [unitFilter, setUnitFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [reloadVersion, setReloadVersion] = useState(0)
  const pageSize = 10

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const [residents, unitList] = await Promise.all([
        api<PaginatedResponse<Resident>>(`/residents${toQueryString({ page, pageSize, search: query.trim(), status: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE', unitId: unitFilter === 'ALL' ? undefined : unitFilter })}`, { signal }),
        loadAllUnits(signal),
      ])
      if (signal?.aborted) return
      const lastPage = Math.max(1, Math.ceil(residents.total / pageSize))
      if (page > lastPage) { setPage(lastPage); return }
      setItems(residents.items)
      setTotal(residents.total)
      setUnits(unitList)
    } catch (value) {
      if (!signal?.aborted) setError(value instanceof Error ? value.message : 'No fue posible cargar los residentes.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [page, query, statusFilter, unitFilter])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, reloadVersion])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (form.dataset.submitting) return
    form.dataset.submitting = 'true'
    const data = new FormData(form)
    setCreateBusy(true)
    setCreateError('')
    try {
      await api('/residents', { method: 'POST', body: JSON.stringify({ name: data.get('name'), phone: data.get('phone'), unitId: data.get('unitId'), email: String(data.get('email')).trim().toLowerCase(), password: data.get('password') }) })
      form.reset()
      setModalOpen(false)
      setReloadVersion((value) => value + 1)
    } catch (value) {
      const hasFieldError = applyApiFieldErrors(form, value)
      const message = hasFieldError ? 'La solicitud contiene datos no válidos.' : value instanceof Error ? value.message : 'No fue posible crear el residente.'
      setCreateError(message)
      setError(message)
    } finally {
      delete form.dataset.submitting
      setCreateBusy(false)
    }
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const form = event.currentTarget
    if (form.dataset.submitting) return
    form.dataset.submitting = 'true'
    const data = new FormData(form)
    setEditBusy(true)
    setEditError('')
    try {
      await api(`/residents/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name: data.get('name'), phone: data.get('phone'), unitId: data.get('unitId') }) })
      setEditing(null)
      setReloadVersion((value) => value + 1)
    } catch (value) {
      const hasFieldError = applyApiFieldErrors(form, value)
      const message = hasFieldError ? 'La solicitud contiene datos no válidos.' : value instanceof Error ? value.message : 'No fue posible actualizar el residente.'
      setEditError(message)
      setError(message)
    } finally {
      delete form.dataset.submitting
      setEditBusy(false)
    }
  }

  async function setAccess(item: Resident, active: boolean) {
    if (accessBusy) return
    setAccessBusy(true)
    setAccessError('')
    try { await api(`/residents/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active }) }); setPendingAccess(null); setReloadVersion((value) => value + 1) }
    catch (value) { setAccessError(value instanceof Error ? value.message : `No fue posible ${active ? 'activar' : 'revocar'} el acceso.`) }
    finally { setAccessBusy(false) }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return <>
    <PageHeader title="Residentes" description="Gestione las cuentas, unidades asignadas y permisos de acceso." action={<Button onClick={() => { setCreateError(''); setModalOpen(true) }}><Plus className="size-4" />Agregar residente</Button>} />
    {error && !pendingAccess && <ErrorState message={error} onRetry={() => void load()} />}
    <section className="mb-6 rounded-xl border bg-card p-4" aria-label="Filtros de residentes">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Filter className="size-4" />Buscar y filtrar residentes</div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px]">
        <label className="relative"><span className="sr-only">Buscar por nombre o unidad</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Ej. Ana García o Torre A-101" className="w-full rounded-lg border bg-background py-2 pl-9 pr-3" /></label>
        <label><span className="sr-only">Filtrar por estado</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="ALL">Todos los estados</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Revocados</option></select></label>
        <label><span className="sr-only">Filtrar por unidad</span><select value={unitFilter} onChange={(event) => { setUnitFilter(event.target.value); setPage(1) }} className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="ALL">Todas las unidades</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code}</option>)}</select></label>
      </div>
    </section>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} busy={createBusy} title="Agregar residente" description="Complete los campos obligatorios. Los campos marcados como opcionales pueden dejarse vacíos.">
      <form id="create-resident-form" onSubmit={create} onInvalid={setSpanishValidationMessage} onInput={clearSpanishValidationMessage} className="grid gap-3">
        <ModalError message={createError} />
        <label className="grid gap-1 text-sm font-medium">Nombre completo <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="name" required minLength={3} maxLength={100} autoComplete="name" placeholder="Ej. Ana García" className="rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Correo electrónico <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="email" required type="email" autoComplete="email" placeholder="ana.garcia@correo.com" onBlur={(event) => { event.currentTarget.value = event.currentTarget.value.trim().toLowerCase() }} className="rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Teléfono <span className="font-normal text-muted-foreground">(opcional)</span><input name="phone" maxLength={40} autoComplete="tel" placeholder="Ej. +593 300 123 4567 ext. 4" className="rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Unidad residencial <span className="font-normal text-muted-foreground">(obligatorio)</span><select name="unitId" required className="cursor-pointer rounded-lg border bg-background px-3 py-2 font-normal"><option value="">Seleccione una unidad</option>{units.filter((unit) => unit.active).map((unit) => <option key={unit.id} value={unit.id}>{unit.code}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Contraseña temporal <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="password" required type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="rounded-lg border px-3 py-2 font-normal" /></label>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={createBusy} onClick={() => setModalOpen(false)}><X className="size-4" />Cancelar</Button><Button type="submit" disabled={createBusy}><Plus className="size-4" />{createBusy ? 'Creando…' : 'Crear residente'}</Button></div>
      </form>
    </Modal>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} busy={editBusy} title="Editar residente" description="Actualice los datos administrativos del residente. El correo y la contraseña se gestionan mediante seguridad de cuenta.">
      <form id="edit-resident-form" onSubmit={update} onInvalid={setSpanishValidationMessage} onInput={clearSpanishValidationMessage} className="grid gap-3">
        <ModalError message={editError} />
        <label className="grid gap-1 text-sm font-medium">Nombre completo <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="name" required minLength={3} maxLength={100} defaultValue={editing?.name} className="rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Teléfono <span className="font-normal text-muted-foreground">(opcional)</span><input name="phone" maxLength={40} defaultValue={editing?.phone ?? ''} placeholder="Ej. +593 300 123 4567 ext. 4" className="rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Unidad residencial <span className="font-normal text-muted-foreground">(obligatorio)</span><select name="unitId" required defaultValue={editing?.unit.id} className="cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="">Seleccione una unidad</option>{units.filter((unit) => unit.active || unit.id === editing?.unit.id).map((unit) => <option key={unit.id} value={unit.id}>{unit.code}</option>)}</select></label>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={editBusy} onClick={() => setEditing(null)}><X className="size-4" />Cancelar</Button><Button type="submit" disabled={editBusy}><Edit className="size-4" />{editBusy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
      </form>
    </Modal>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>No hay residentes que coincidan con los filtros seleccionados.</EmptyState> : <><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50"><tr><th className="p-3">Residente</th><th className="p-3">Unidad</th><th className="p-3">Teléfono</th><th className="p-3">Estado</th><th className="p-3 text-right"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-medium">{item.name}</td><td className="p-3">{item.unit.code}</td><td className="p-3">{item.phone || 'No registrado'}</td><td className="p-3">{item.active ? 'Activo' : 'Revocado'}</td><td className="flex justify-end gap-2 p-3"><Button variant="outline" size="sm" aria-label={`Editar a ${item.name}`} onClick={() => { setEditError(''); setEditing(item) }}><Edit className="size-4" />Editar</Button>{item.active ? <Button variant="outline" size="sm" onClick={() => { setAccessError(''); setPendingAccess({ item, active: false }) }}><UserRoundX className="size-4" />Revocar acceso</Button> : <Button variant="outline" size="sm" onClick={() => { setAccessError(''); setPendingAccess({ item, active: true }) }}><RotateCcw className="size-4" />Activar acceso</Button>}</td></tr>)}</tbody></table></div><Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} /></>}
    <ConfirmDialog open={Boolean(pendingAccess)} onCancel={() => setPendingAccess(null)} onConfirm={() => { if (pendingAccess) void setAccess(pendingAccess.item, pendingAccess.active) }} busy={accessBusy} error={accessError} title={pendingAccess?.active ? 'Activar acceso' : 'Revocar acceso'} description={pendingAccess ? `¿Desea ${pendingAccess.active ? 'activar nuevamente' : 'revocar'} el acceso de ${pendingAccess.item.name}?` : ''} confirmLabel={pendingAccess?.active ? 'Activar acceso' : 'Revocar acceso'} destructive={pendingAccess ? !pendingAccess.active : false} />
  </>
}
