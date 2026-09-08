// oxlint-disable react/set-state-in-effect -- List state is synchronized with server query state.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Edit, Filter, Power, Plus, Search, X } from 'lucide-react'
import { api } from '@/api/client'
import { toQueryString, type PaginatedResponse } from '@/api/contracts'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { applyApiFieldErrors, clearSpanishValidationMessage, setSpanishValidationMessage } from '@/components/FieldFeedback'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface Unit { id: string; code: string; address: string; parkingSpaces: number; active: boolean }
function ModalError({ message }: { message: string }) { return message ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null }

export function UnitsPage() {
  const [items, setItems] = useState<Unit[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState('')
  const [editError, setEditError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [pendingToggle, setPendingToggle] = useState<Unit | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [toggleError, setToggleError] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [reloadVersion, setReloadVersion] = useState(0)
  const pageSize = 10

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('')
    try {
      const response = await api<PaginatedResponse<Unit>>(`/units${toQueryString({ page, pageSize, search: query.trim(), status: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE' })}`, { signal })
      if (signal?.aborted) return
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize))
      if (page > lastPage) { setPage(lastPage); return }
      setItems(response.items); setTotal(response.total)
    } catch (value) { if (!signal?.aborted) setError(value instanceof Error ? value.message : 'No fue posible cargar las unidades.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [page, query, statusFilter])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, reloadVersion])

  async function save(event: FormEvent<HTMLFormElement>, item?: Unit) {
    event.preventDefault()
    const form = event.currentTarget
    if (form.dataset.submitting) return
    form.dataset.submitting = 'true'
    const data = new FormData(form)
    const setBusy = item ? setEditBusy : setCreateBusy
    const setModalError = item ? setEditError : setCreateError
    setBusy(true); setModalError('')
    try {
      await api(item ? `/units/${item.id}` : '/units', { method: item ? 'PATCH' : 'POST', body: JSON.stringify({ code: data.get('code'), address: data.get('address'), parkingSpaces: Number(data.get('parkingSpaces')) }) })
      if (item) setEditing(null); else { form.reset(); setModalOpen(false) }
      setReloadVersion((value) => value + 1)
    } catch (value) {
      const hasFieldError = applyApiFieldErrors(form, value)
      const message = hasFieldError ? 'La solicitud contiene datos no válidos.' : value instanceof Error ? value.message : `No fue posible ${item ? 'actualizar' : 'crear'} la unidad.`
      setModalError(message); setError(message)
    } finally { delete form.dataset.submitting; setBusy(false) }
  }

  async function toggle(item: Unit) {
    if (toggleBusy) return
    setToggleBusy(true); setToggleError('')
    try { await api(`/units/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) }); setPendingToggle(null); setReloadVersion((value) => value + 1) }
    catch (value) { setToggleError(value instanceof Error ? value.message : `No fue posible ${item.active ? 'desactivar' : 'activar'} la unidad.`) }
    finally { setToggleBusy(false) }
  }

  const fields = (item?: Unit) => <>
    <label className="grid gap-1 text-sm font-medium">Código de unidad <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="code" required minLength={2} maxLength={30} defaultValue={item?.code} placeholder="Ej. Torre A-101" className="rounded-lg border px-3 py-2 font-normal" /></label>
    <label className="grid gap-1 text-sm font-medium">Dirección <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="address" required minLength={5} maxLength={160} defaultValue={item?.address} autoComplete="street-address" placeholder="Ej. Calle 10 # 20-30" className="rounded-lg border px-3 py-2 font-normal" /></label>
    <label className="grid gap-1 text-sm font-medium">Plazas de estacionamiento <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="parkingSpaces" required type="number" min="0" max="1000" step="1" inputMode="numeric" defaultValue={item?.parkingSpaces} placeholder="Ej. 2" className="rounded-lg border px-3 py-2 font-normal" /></label>
  </>
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = Boolean(query.trim()) || statusFilter !== 'ALL'
  return <>
    <PageHeader title="Unidades residenciales" description="Gestione las direcciones, la capacidad de estacionamiento y el estado de acceso de las unidades." action={<Button onClick={() => { setCreateError(''); setModalOpen(true) }}><Plus className="size-4" />Agregar unidad</Button>} />
    {error && !pendingToggle && <ErrorState message={error} onRetry={() => void load()} />}
    <section className="mb-6 rounded-xl border bg-card p-4" aria-label="Filtros de unidades"><div className="mb-3 flex items-center gap-2 text-sm font-medium"><Filter className="size-4" />Buscar y filtrar unidades</div><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"><label className="relative"><span className="sr-only">Buscar por código o dirección</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Ej. Torre A-101 o Calle 10" className="w-full rounded-lg border bg-background py-2 pl-9 pr-3" /></label><label><span className="sr-only">Filtrar por estado</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="ALL">Todos los estados</option><option value="ACTIVE">Activas</option><option value="INACTIVE">Inactivas</option></select></label></div></section>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} busy={createBusy} title="Agregar unidad" description="Complete los campos obligatorios para registrar una unidad residencial."><form id="create-unit-form" onSubmit={(event) => void save(event)} onInvalid={setSpanishValidationMessage} onInput={clearSpanishValidationMessage} className="grid gap-3"><ModalError message={createError} />{fields()}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={createBusy} onClick={() => setModalOpen(false)}><X className="size-4" />Cancelar</Button><Button type="submit" disabled={createBusy}><Plus className="size-4" />{createBusy ? 'Creando…' : 'Crear unidad'}</Button></div></form></Modal>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} busy={editBusy} title="Editar unidad" description="Actualice la información administrativa de la unidad."><form id="edit-unit-form" onSubmit={(event) => { if (editing) void save(event, editing) }} onInvalid={setSpanishValidationMessage} onInput={clearSpanishValidationMessage} className="grid gap-3"><ModalError message={editError} />{fields(editing ?? undefined)}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={editBusy} onClick={() => setEditing(null)}><X className="size-4" />Cancelar</Button><Button type="submit" disabled={editBusy}><Edit className="size-4" />{editBusy ? 'Guardando…' : 'Guardar cambios'}</Button></div></form></Modal>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>{hasFilters ? 'No hay unidades que coincidan con los filtros seleccionados.' : 'Todavía no hay unidades registradas.'}</EmptyState> : <><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50"><tr><th className="p-3">Código</th><th className="p-3">Dirección</th><th className="p-3">Estacionamiento</th><th className="p-3">Estado</th><th className="p-3 text-right"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-medium">{item.code}</td><td className="p-3">{item.address}</td><td className="p-3">{item.parkingSpaces.toLocaleString('es')}</td><td className="p-3">{item.active ? 'Activa' : 'Inactiva'}</td><td className="flex justify-end gap-2 p-3"><Button variant="outline" size="sm" aria-label={`Editar unidad ${item.code}`} onClick={() => { setEditError(''); setEditing(item) }}><Edit className="size-4" />Editar</Button><Button variant="outline" size="sm" onClick={() => { setToggleError(''); setPendingToggle(item) }}><Power className="size-4" />{item.active ? 'Desactivar' : 'Activar'}</Button></td></tr>)}</tbody></table></div><Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} /></>}
    <ConfirmDialog open={Boolean(pendingToggle)} onCancel={() => setPendingToggle(null)} onConfirm={() => { if (pendingToggle) void toggle(pendingToggle) }} busy={toggleBusy} error={toggleError} title={pendingToggle?.active ? 'Desactivar unidad' : 'Activar unidad'} description={pendingToggle ? `¿Desea ${pendingToggle.active ? 'desactivar' : 'activar'} la unidad ${pendingToggle.code}?` : ''} confirmLabel={pendingToggle?.active ? 'Desactivar unidad' : 'Activar unidad'} destructive={pendingToggle?.active ?? false} />
  </>
}
