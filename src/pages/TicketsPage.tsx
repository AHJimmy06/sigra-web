import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
interface Ticket { id: string; description: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; createdAt: string }
export function TicketsPage() {
  const [items, setItems] = useState<Ticket[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = () => api<Ticket[]>('/tickets').then(setItems).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); useEffect(() => { void load() }, [])
  async function update(item: Ticket, status: Ticket['status']) { try { await api(`/tickets/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load() } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible actualizar la incidencia.') } }
  return <><PageHeader title="Incidencias de mantenimiento" description="Revise las incidencias de los residentes y supervise su estado de resolución." />{error && <ErrorState message={error} />}{loading ? <LoadingState /> : items.length === 0 ? <EmptyState>No se han registrado incidencias de mantenimiento.</EmptyState> : <div className="grid gap-3">{items.map((item) => <article key={item.id} className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('es')}</p></div><select aria-label="Estado de la incidencia" className="rounded-lg border bg-background px-3 py-2 text-sm" value={item.status} onChange={(e) => void update(item, e.target.value as Ticket['status'])}><option value="OPEN">Abierta</option><option value="IN_PROGRESS">En curso</option><option value="RESOLVED">Resuelta</option></select></div></article>)}</div>}</>
}
