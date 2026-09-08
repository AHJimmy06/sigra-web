// oxlint-disable react/set-state-in-effect -- List state is synchronized with server query state.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Archive, Edit, Filter, Megaphone, Plus, Search, X } from 'lucide-react'
import { api } from '@/api/client'
import { toQueryString, type PaginatedResponse } from '@/api/contracts'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { applyApiFieldErrors, clearSpanishValidationMessage, setSpanishValidationMessage } from '@/components/FieldFeedback'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface Announcement { id: string; title: string; body: string; status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; publishedAt: string | null; updatedAt?: string; author?: { name: string; email: string } }
function ModalError({ message }: { message: string }) { return message ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null }

export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState('')
  const [editError, setEditError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [pendingPublication, setPendingPublication] = useState<{ item: Announcement; published: boolean } | null>(null)
  const [publicationBusy, setPublicationBusy] = useState(false)
  const [publicationError, setPublicationError] = useState('')
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
      const response = await api<PaginatedResponse<Announcement>>(`/announcements${toQueryString({ page, pageSize, search: query.trim(), status: statusFilter === 'ALL' ? undefined : statusFilter })}`, { signal })
      if (signal?.aborted) return
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize))
      if (page > lastPage) { setPage(lastPage); return }
      setItems(response.items); setTotal(response.total)
    } catch (value) { if (!signal?.aborted) setError(value instanceof Error ? value.message : 'No fue posible cargar los anuncios.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [page, query, statusFilter])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, reloadVersion])

  async function save(event: FormEvent<HTMLFormElement>, item?: Announcement) {
    event.preventDefault()
    const form = event.currentTarget
    if (form.dataset.submitting) return
    form.dataset.submitting = 'true'
    const data = new FormData(form)
    const setBusy = item ? setEditBusy : setCreateBusy
    const setModalError = item ? setEditError : setCreateError
    setBusy(true); setModalError('')
    try {
      await api(item ? `/announcements/${item.id}` : '/announcements', { method: item ? 'PATCH' : 'POST', body: JSON.stringify({ title: data.get('title'), body: data.get('body'), ...(!item ? { published: data.get('published') === 'on' } : {}) }) })
      if (item) setEditing(null); else { form.reset(); setModalOpen(false) }
      setReloadVersion((value) => value + 1)
    } catch (value) {
      const hasFieldError = applyApiFieldErrors(form, value)
      const message = hasFieldError ? 'La solicitud contiene datos no válidos.' : value instanceof Error ? value.message : `No fue posible ${item ? 'editar' : 'crear'} el anuncio.`
      setModalError(message); setError(message)
    } finally { delete form.dataset.submitting; setBusy(false) }
  }

  async function setPublished(item: Announcement, published: boolean) {
    if (publicationBusy) return
    setPublicationBusy(true); setPublicationError('')
    try { await api(`/announcements/${item.id}`, { method: 'PATCH', body: JSON.stringify({ published }) }); setPendingPublication(null); setReloadVersion((value) => value + 1) }
    catch (value) { setPublicationError(value instanceof Error ? value.message : `No fue posible ${published ? 'publicar' : 'retirar'} el anuncio.`) }
    finally { setPublicationBusy(false) }
  }

  const fields = (item?: Announcement) => <>
    <label className="grid gap-1 text-sm font-medium">Título del anuncio <span className="font-normal text-muted-foreground">(obligatorio)</span><input name="title" required minLength={5} maxLength={160} defaultValue={item?.title} placeholder="Ej. Mantenimiento del ascensor" className="w-full rounded-lg border px-3 py-2 font-normal" /></label>
    <label className="grid gap-1 text-sm font-medium">Mensaje <span className="font-normal text-muted-foreground">(obligatorio)</span><textarea name="body" required minLength={10} maxLength={2000} rows={5} defaultValue={item?.body} placeholder="Ej. El ascensor estará fuera de servicio el sábado..." className="w-full rounded-lg border px-3 py-2 font-normal" /></label>
  </>
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return <>
    <PageHeader title="Cartelera digital" description="Redacte y publique anuncios de texto para los residentes." action={<Button onClick={() => { setCreateError(''); setModalOpen(true) }}><Plus className="size-4" />Crear anuncio</Button>} />
    {error && !pendingPublication && <ErrorState message={error} onRetry={() => void load()} />}
    <section className="mb-6 rounded-xl border bg-card p-4" aria-label="Filtros de anuncios"><div className="mb-3 flex items-center gap-2 text-sm font-medium"><Filter className="size-4" />Buscar y filtrar anuncios</div><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"><label className="relative"><span className="sr-only">Buscar en anuncios</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Ej. mantenimiento o ascensor" className="w-full rounded-lg border bg-background py-2 pl-9 pr-3" /></label><label><span className="sr-only">Filtrar por estado</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="ALL">Todos los estados</option><option value="PUBLISHED">Publicados</option><option value="DRAFT">Borradores</option></select></label></div></section>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} busy={createBusy} title="Crear anuncio" description="Complete los campos obligatorios. Marque la opción de publicación solo si desea mostrarlo inmediatamente."><form id="create-announcement-form" onSubmit={(event) => void save(event)} onInvalid={setSpanishValidationMessage} onInput={clearSpanishValidationMessage} className="space-y-3"><ModalError message={createError} />{fields()}<label className="flex items-center gap-2 text-sm"><input name="published" type="checkbox" />Publicar inmediatamente <span className="text-muted-foreground">(opcional)</span></label><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={createBusy} onClick={() => setModalOpen(false)}><X className="size-4" />Cancelar</Button><Button type="submit" disabled={createBusy}><Plus className="size-4" />{createBusy ? 'Creando…' : 'Crear anuncio'}</Button></div></form></Modal>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} busy={editBusy} title="Editar anuncio" description="Actualice el título y el contenido del comunicado. El estado de publicación se gestiona mediante una confirmación separada."><form id="edit-announcement-form" onSubmit={(event) => { if (editing) void save(event, editing) }} onInvalid={setSpanishValidationMessage} onInput={clearSpanishValidationMessage} className="space-y-3"><ModalError message={editError} />{fields(editing ?? undefined)}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={editBusy} onClick={() => setEditing(null)}><X className="size-4" />Cancelar</Button><Button type="submit" disabled={editBusy}><Edit className="size-4" />{editBusy ? 'Guardando…' : 'Guardar cambios'}</Button></div></form></Modal>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>No hay anuncios que coincidan con los filtros seleccionados.</EmptyState> : <><div className="grid gap-4">{items.map((item) => { const isPublished = item.status ? item.status === 'PUBLISHED' : Boolean(item.publishedAt); return <article key={item.id} className="rounded-xl border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p><p className="mt-3 text-xs text-muted-foreground">{item.author ? `Publicado por ${item.author.name}` : 'Autor no disponible'}{item.updatedAt ? ` · Actualizado ${new Date(item.updatedAt).toLocaleDateString('es')}` : ''}</p></div><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{isPublished ? 'Publicado' : 'Borrador'}</span></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setEditError(''); setEditing(item) }}><Edit className="size-4" />Editar</Button><Button variant="outline" size="sm" onClick={() => { setPublicationError(''); setPendingPublication({ item, published: !isPublished }) }}>{isPublished ? <><Archive className="size-4" />Retirar publicación</> : <><Megaphone className="size-4" />Publicar</>}</Button></div></article> })}</div><Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} /></>}
    <ConfirmDialog open={Boolean(pendingPublication)} onCancel={() => setPendingPublication(null)} onConfirm={() => { if (pendingPublication) void setPublished(pendingPublication.item, pendingPublication.published) }} busy={publicationBusy} error={publicationError} title={pendingPublication?.published ? 'Publicar anuncio' : 'Retirar publicación'} description={pendingPublication ? `¿Desea ${pendingPublication.published ? 'publicar' : 'retirar'} el anuncio “${pendingPublication.item.title}”?` : ''} confirmLabel={pendingPublication?.published ? 'Publicar anuncio' : 'Retirar publicación'} destructive={pendingPublication ? !pendingPublication.published : false} />
  </>
}
