// oxlint-disable react/set-state-in-effect -- List state is synchronized with server query state.
import { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Filter, Search, ShieldAlert } from 'lucide-react'
import { api } from '@/api/client'
import { toQueryString, type PaginatedResponse } from '@/api/contracts'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageState'

interface AccessEvent {
  id: string
  decision: 'ALLOWED' | 'DENIED'
  reason: string
  direction: 'ENTRY' | 'EXIT'
  occurredAt: string
  requestId: string | null
  resident: { name: string; unitCode: string | null } | null
  guard: { email: string }
}

const reasonLabels: Record<string, string> = {
  VALID_PASS: 'Pase válido',
  INVALID_QR: 'Código QR no válido',
  PASS_NOT_FOUND: 'Pase no encontrado',
  PASS_REVOKED: 'Pase revocado',
  PASS_EXPIRED: 'Pase vencido',
  ACCESS_REVOKED: 'Acceso revocado',
  INVALID_OR_EXPIRED_TOKEN: 'Código no válido o vencido',
}

export function AccessEventsPage() {
  const [items, setItems] = useState<AccessEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [search, setSearch] = useState('')
  const [toDate, setToDate] = useState('')
  const [decision, setDecision] = useState('ALL')
  const [direction, setDirection] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await api<PaginatedResponse<AccessEvent>>(`/access/events${toQueryString({
        search,
        from: fromDate,
        to: toDate,
        decision: decision === 'ALL' ? undefined : decision,
        direction: direction === 'ALL' ? undefined : direction,
        page,
        pageSize,
      })}`, { signal })
      if (signal?.aborted) return
      const lastPage = Math.max(1, Math.ceil(response.total / pageSize))
      if (page > lastPage) {
        setPage(lastPage)
        return
      }
      setItems(response.items)
      setTotal(response.total)
    } catch (value) {
      if (!signal?.aborted) setError(value instanceof Error ? value.message : 'No fue posible cargar el historial de accesos.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [decision, direction, fromDate, page, search, toDate])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = Boolean(search || fromDate || toDate || decision !== 'ALL' || direction !== 'ALL')

  return <>
    <PageHeader title="Historial de accesos" description="Consulte las decisiones registradas por la garita y supervise el flujo de entradas y salidas." />
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    <section className="mb-6 rounded-xl border bg-card p-4" aria-label="Filtros del historial de accesos">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Filter className="size-4" />Filtrar eventos</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-sm"><span>Buscar</span><span className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="search" maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Residente, unidad o guardia" className="w-full rounded-lg border bg-background py-2 pl-9 pr-3" /></span></label>
        <label className="grid gap-1 text-sm"><span>Fecha inicial</span><input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setPage(1) }} className="rounded-lg border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm"><span>Fecha final</span><input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setPage(1) }} className="rounded-lg border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm"><span>Decisión</span><select value={decision} onChange={(event) => { setDecision(event.target.value); setPage(1) }} className="cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="ALL">Todas</option><option value="ALLOWED">Autorizados</option><option value="DENIED">Denegados</option></select></label>
        <label className="grid gap-1 text-sm"><span>Dirección</span><select value={direction} onChange={(event) => { setDirection(event.target.value); setPage(1) }} className="cursor-pointer rounded-lg border bg-background px-3 py-2"><option value="ALL">Entradas y salidas</option><option value="ENTRY">Entradas</option><option value="EXIT">Salidas</option></select></label>
      </div>
    </section>
    {loading ? <LoadingState /> : items.length === 0 ? <EmptyState>{hasFilters ? 'No hay eventos que coincidan con los filtros seleccionados.' : 'Todavía no hay eventos de acceso registrados.'}</EmptyState> : <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50"><tr><th className="p-3">Resultado</th><th className="p-3">Residente / unidad</th><th className="p-3">Dirección</th><th className="p-3">Motivo</th><th className="p-3">Guardia</th><th className="p-3">Fecha y hora</th><th className="p-3">Solicitud</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0">
            <td className="p-3"><span className={`inline-flex items-center gap-2 font-medium ${item.decision === 'ALLOWED' ? 'text-emerald-700' : 'text-red-700'}`}>{item.decision === 'ALLOWED' ? <CheckCircle2 className="size-4" /> : <ShieldAlert className="size-4" />}{item.decision === 'ALLOWED' ? 'Autorizado' : 'Denegado'}</span></td>
            <td className="p-3"><p className="font-medium">{item.resident?.name ?? 'No identificado'}</p><p className="text-xs text-muted-foreground">{item.resident?.unitCode ?? 'Unidad no disponible'}</p></td>
            <td className="p-3"><span className="inline-flex items-center gap-2">{item.direction === 'ENTRY' ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}{item.direction === 'ENTRY' ? 'Entrada' : 'Salida'}</span></td>
            <td className="p-3">{reasonLabels[item.reason] ?? item.reason}</td>
            <td className="p-3">{item.guard.email}</td>
            <td className="p-3 text-muted-foreground">{new Date(item.occurredAt).toLocaleString('es')}</td>
            <td className="p-3 font-mono text-xs text-muted-foreground" title={item.requestId ?? undefined}>{item.requestId ?? 'No disponible'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
    </>}
  </>
}
