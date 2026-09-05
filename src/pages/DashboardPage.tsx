import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { ErrorState, LoadingState, PageHeader } from '@/components/PageState'

interface Metrics { today: { allowed: number; denied: number }; openIncidents: number; flow: { date: string; total: number }[] }
function formatFlowDate(value: string) {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value.slice(5) : date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
}
export function DashboardPage() {
  const [data, setData] = useState<Metrics>(); const [error, setError] = useState('')
  useEffect(() => { api<Metrics>('/dashboard/metrics').then(setData).catch((e: Error) => setError(e.message)) }, [])
  return <><PageHeader title="Panel de operaciones" description="Actividad de accesos de hoy e incidencias de mantenimiento pendientes." />{error && <ErrorState message={error} />}{!data ? <LoadingState /> : <>
    <section className="grid gap-4 sm:grid-cols-3">{[['Autorizados hoy', data.today.allowed], ['Denegados hoy', data.today.denied], ['Incidencias abiertas', data.openIncidents]].map(([label, value]) => <article key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{Number(value).toLocaleString('es')}</p></article>)}</section>
    <section className="mt-6 rounded-xl border bg-card p-5"><h2 className="font-semibold">Flujo de accesos de los últimos siete días</h2><div className="mt-5 grid grid-cols-7 items-end gap-2" style={{ height: 180 }}>{data.flow.map((item) => { const max = Math.max(...data.flow.map((x) => x.total), 1); return <div key={item.date} className="flex h-full flex-col justify-end text-center"><span className="mb-1 text-xs font-medium">{item.total.toLocaleString('es')}</span><div className="min-h-1 rounded-t bg-primary" style={{ height: `${Math.max((item.total / max) * 100, 3)}%` }} /><span className="mt-2 truncate text-[10px] text-muted-foreground">{formatFlowDate(item.date)}</span></div> })}</div></section>
  </>}</>
}
