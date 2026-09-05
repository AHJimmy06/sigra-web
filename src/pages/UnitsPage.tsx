import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
interface Unit { id: string; code: string; address: string; parkingSpaces: number; active: boolean }
export function UnitsPage() {
  const [items, setItems] = useState<Unit[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = () => api<Unit[]>('/units').then(setItems).catch((e: Error) => setError(e.message)).finally(() => setLoading(false))
  useEffect(() => { void load() }, [])
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setError(''); try { await api('/units', { method: 'POST', body: JSON.stringify({ code: data.get('code'), address: data.get('address'), parkingSpaces: Number(data.get('parkingSpaces')) }) }); event.currentTarget.reset(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible crear la unidad.') } }
  async function toggle(item: Unit) { await api(`/units/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) }); await load() }
  return <><PageHeader title="Unidades residenciales" description="Gestione las direcciones, la capacidad de estacionamiento y el estado de acceso de las unidades." />{error && <ErrorState message={error} />}
    <form onSubmit={create} className="mb-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_2fr_1fr_auto]"><input name="code" required placeholder="Código de unidad" aria-label="Código de unidad" className="rounded-lg border px-3 py-2" /><input name="address" required placeholder="Dirección" aria-label="Dirección" className="rounded-lg border px-3 py-2" /><input name="parkingSpaces" required type="number" min="0" placeholder="Plazas de estacionamiento" aria-label="Plazas de estacionamiento" className="rounded-lg border px-3 py-2" /><Button>Agregar unidad</Button></form>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>Todavía no hay unidades residenciales.</EmptyState> : <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50"><tr><th className="p-3">Código</th><th className="p-3">Dirección</th><th className="p-3">Estacionamiento</th><th className="p-3">Estado</th><th className="p-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-medium">{item.code}</td><td className="p-3">{item.address}</td><td className="p-3">{item.parkingSpaces.toLocaleString('es')}</td><td className="p-3">{item.active ? 'Activa' : 'Inactiva'}</td><td className="p-3 text-right"><Button variant="outline" size="sm" onClick={() => void toggle(item)}>{item.active ? 'Desactivar' : 'Activar'}</Button></td></tr>)}</tbody></table></div>}
  </>
}
