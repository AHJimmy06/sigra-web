import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Filter, Search, ShieldAlert } from 'lucide-react'
import { api } from '@/api/client'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'

interface AccessEvent { id: string; decision: 'ALLOWED' | 'DENIED'; reason: string; direction: 'ENTRY' | 'EXIT'; occurredAt: string; resident?: { name: string; unitCode?: string }; guard?: { email: string } }
const reasonLabels: Record<string, string> = { ALLOWED: 'Acceso autorizado', DENIED: 'Acceso denegado', EXPIRED: 'Código vencido', INVALID: 'Código no válido', INVALID_TOTP: 'Código no válido', RESIDENT_INACTIVE: 'Residente inactivo', UNIT_INACTIVE: 'Unidad inactiva' }
const decisionLabels = { ALL: 'Todas las decisiones', ALLOWED: 'Autorizados', DENIED: 'Denegados' } as const

export function AccessEventsPage() {
  const [items, setItems] = useState<AccessEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [decisionFilter, setDecisionFilter] = useState<keyof typeof decisionLabels>('ALL')
  const [directionFilter, setDirectionFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)

  const load = () => api<AccessEvent[]>('/access/events').then(setItems).catch((value: Error) => setError(value.message)).finally(() => setLoading(false))
  useEffect(() => { void load() }, [])

  const filteredItems = useMemo(() => items.filter((item) => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const matchesQuery = !normalizedQuery || item.resident?.name.toLocaleLowerCase().includes(normalizedQuery) || item.resident?.unitCode?.toLocaleLowerCase().includes(normalizedQuery) || item.guard?.email.toLocaleLowerCase().includes(normalizedQuery)
    const matchesDecision = decisionFilter === 'ALL' || item.decision === decisionFilter
    const matchesDirection = directionFilter === 'ALL' || item.direction === directionFilter
    const matchesDate = !dateFilter || item.occurredAt.startsWith(dateFilter)
    return matchesQuery && matchesDecision && matchesDirection && matchesDate
  }), [items, query, decisionFilter, directionFilter, dateFilter])
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)

  return <><PageHeader title="Historial de accesos" description="Consulte las decisiones registradas por la garita y supervise el flujo de entradas y salidas." />{error && <ErrorState message={error} />}
    <section className="mb-6 rounded-xl border bg-card p-4" aria-label="Filtros del historial de accesos"><div className="mb-3 flex items-center gap-2 text-sm font-medium"><Filter className="size-4" />Buscar y filtrar eventos</div><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px_160px]"><label className="relative"><span className="sr-only">Buscar residente, unidad o guardia</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Ej. Ana García o Torre A-101" className="w-full rounded-lg border bg-background py-2 pl-9 pr-3" /></label><label><span className="sr-only">Filtrar por decisión</span><select value={decisionFilter} onChange={(event) => { setDecisionFilter(event.target.value as keyof typeof decisionLabels); setPage(1) }} className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2">{Object.entries(decisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="sr-only">Filtrar por dirección</span><select value={directionFilter} onChange={(event) => { setDirectionFilter(event.target.value); setPage(1) }} className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="ALL">Ambas direcciones</option><option value="ENTRY">Entradas</option><option value="EXIT">Salidas</option></select></label><label><span className="sr-only">Filtrar por fecha</span><input type="date" aria-label="Filtrar por fecha" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1) }} className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2" /></label></div></section>
    {loading ? <LoadingState /> : filteredItems.length === 0 ? <EmptyState>{items.length === 0 ? 'Todavía no hay eventos de acceso.' : 'No hay eventos que coincidan con los filtros seleccionados.'}</EmptyState> : <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50"><tr><th className="p-3">Resultado</th><th className="p-3">Residente / unidad</th><th className="p-3">Dirección</th><th className="p-3">Motivo</th><th className="p-3">Fecha y hora</th></tr></thead><tbody>{paginatedItems.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3"><span className={`inline-flex items-center gap-2 font-medium ${item.decision === 'ALLOWED' ? 'text-emerald-700' : 'text-red-700'}`}>{item.decision === 'ALLOWED' ? <CheckCircle2 className="size-4" /> : <ShieldAlert className="size-4" />}{item.decision === 'ALLOWED' ? 'Autorizado' : 'Denegado'}</span></td><td className="p-3"><p className="font-medium">{item.resident?.name ?? 'No identificado'}</p><p className="text-xs text-muted-foreground">{item.resident?.unitCode ?? 'Unidad no disponible'}</p></td><td className="p-3"><span className="inline-flex items-center gap-2">{item.direction === 'ENTRY' ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}{item.direction === 'ENTRY' ? 'Entrada' : 'Salida'}</span></td><td className="p-3">{reasonLabels[item.reason] ?? item.reason}</td><td className="p-3 text-muted-foreground">{new Date(item.occurredAt).toLocaleString('es')}</td></tr>)}</tbody></table></div>}
    {!loading && filteredItems.length > 0 && <Pagination page={page} pageCount={pageCount} total={filteredItems.length} pageSize={pageSize} onPageChange={setPage} />}
  </>
}
