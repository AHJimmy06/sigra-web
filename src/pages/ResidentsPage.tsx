import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
interface Unit { id: string; code: string; active: boolean }
interface Resident { id: string; name: string; phone: string | null; active: boolean; unit: Unit }
export function ResidentsPage() {
  const [items, setItems] = useState<Resident[]>([]); const [units, setUnits] = useState<Unit[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = () => Promise.all([api<Resident[]>('/residents'), api<Unit[]>('/units')]).then(([residents, unitList]) => { setItems(residents); setUnits(unitList) }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false))
  useEffect(() => { void load() }, [])
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { await api('/residents', { method: 'POST', body: JSON.stringify(Object.fromEntries(data)) }); event.currentTarget.reset(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create resident') } }
  async function revoke(item: Resident) { await api(`/residents/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await load() }
  return <><PageHeader title="Residents" description="Create resident accounts and revoke access when needed." />{error && <ErrorState message={error} />}
    <form onSubmit={create} className="mb-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3"><input name="name" required placeholder="Full name" className="rounded-lg border px-3 py-2" /><input name="email" required type="email" placeholder="Email" className="rounded-lg border px-3 py-2" /><input name="phone" placeholder="Phone (optional)" className="rounded-lg border px-3 py-2" /><select name="unitId" required className="rounded-lg border px-3 py-2"><option value="">Select unit</option>{units.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><input name="password" required type="password" minLength={8} placeholder="Temporary password" className="rounded-lg border px-3 py-2" /><Button>Add resident</Button></form>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>No residents yet.</EmptyState> : <div className="grid gap-3">{items.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div><h2 className="font-medium">{item.name}</h2><p className="text-sm text-muted-foreground">Unit {item.unit.code}{item.phone ? ` · ${item.phone}` : ''}</p></div><div className="flex items-center gap-3"><span className="text-sm">{item.active ? 'Active' : 'Revoked'}</span>{item.active && <Button variant="outline" size="sm" onClick={() => void revoke(item)}>Revoke access</Button>}</div></article>)}</div>}
  </>
}
