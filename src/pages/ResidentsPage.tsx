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
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { await api('/residents', { method: 'POST', body: JSON.stringify(Object.fromEntries(data)) }); event.currentTarget.reset(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible crear el residente.') } }
  async function revoke(item: Resident) { await api(`/residents/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await load() }
  return <><PageHeader title="Residentes" description="Cree cuentas de residentes y revoque su acceso cuando sea necesario." />{error && <ErrorState message={error} />}
    <form onSubmit={create} className="mb-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3"><input name="name" required placeholder="Nombre completo" aria-label="Nombre completo" className="rounded-lg border px-3 py-2" /><input name="email" required type="email" placeholder="Correo electrónico" aria-label="Correo electrónico" className="rounded-lg border px-3 py-2" /><input name="phone" placeholder="Teléfono (opcional)" aria-label="Teléfono (opcional)" className="rounded-lg border px-3 py-2" /><select name="unitId" required aria-label="Unidad residencial" className="rounded-lg border px-3 py-2"><option value="">Seleccione una unidad</option>{units.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><input name="password" required type="password" minLength={8} placeholder="Contraseña temporal" aria-label="Contraseña temporal" className="rounded-lg border px-3 py-2" /><Button>Agregar residente</Button></form>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>Todavía no hay residentes.</EmptyState> : <div className="grid gap-3">{items.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div><h2 className="font-medium">{item.name}</h2><p className="text-sm text-muted-foreground">Unidad {item.unit.code}{item.phone ? ` · ${item.phone}` : ''}</p></div><div className="flex items-center gap-3"><span className="text-sm">{item.active ? 'Activo' : 'Revocado'}</span>{item.active && <Button variant="outline" size="sm" onClick={() => void revoke(item)}>Revocar acceso</Button>}</div></article>)}</div>}
  </>
}
