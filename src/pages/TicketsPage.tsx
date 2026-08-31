import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
interface Ticket { id: string; description: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; createdAt: string }
export function TicketsPage() {
  const [items, setItems] = useState<Ticket[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = () => api<Ticket[]>('/tickets').then(setItems).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); useEffect(() => { void load() }, [])
  async function update(item: Ticket, status: Ticket['status']) { try { await api(`/tickets/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update ticket') } }
  return <><PageHeader title="Maintenance tickets" description="Review resident incidents and track resolution status." />{error && <ErrorState message={error} />}{loading ? <LoadingState /> : items.length === 0 ? <EmptyState>No maintenance tickets have been submitted.</EmptyState> : <div className="grid gap-3">{items.map((item) => <article key={item.id} className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></div><select aria-label="Ticket status" className="rounded-lg border bg-background px-3 py-2 text-sm" value={item.status} onChange={(e) => void update(item, e.target.value as Ticket['status'])}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select></div></article>)}</div>}</>
}
