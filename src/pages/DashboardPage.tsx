import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { ErrorState, LoadingState, PageHeader } from '@/components/PageState'

interface Metrics { today: { allowed: number; denied: number }; openIncidents: number; flow: { date: string; total: number }[] }
export function DashboardPage() {
  const [data, setData] = useState<Metrics>(); const [error, setError] = useState('')
  useEffect(() => { api<Metrics>('/dashboard/metrics').then(setData).catch((e: Error) => setError(e.message)) }, [])
  return <><PageHeader title="Operations dashboard" description="Today's access activity and unresolved maintenance incidents." />{error && <ErrorState message={error} />}{!data ? <LoadingState /> : <>
    <section className="grid gap-4 sm:grid-cols-3">{[['Allowed today', data.today.allowed], ['Denied today', data.today.denied], ['Open incidents', data.openIncidents]].map(([label, value]) => <article key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></article>)}</section>
    <section className="mt-6 rounded-xl border bg-card p-5"><h2 className="font-semibold">Seven-day access flow</h2><div className="mt-5 grid grid-cols-7 items-end gap-2" style={{ height: 180 }}>{data.flow.map((item) => { const max = Math.max(...data.flow.map((x) => x.total), 1); return <div key={item.date} className="flex h-full flex-col justify-end text-center"><span className="mb-1 text-xs font-medium">{item.total}</span><div className="min-h-1 rounded-t bg-primary" style={{ height: `${Math.max((item.total / max) * 100, 3)}%` }} /><span className="mt-2 truncate text-[10px] text-muted-foreground">{item.date.slice(5)}</span></div> })}</div></section>
  </>}</>
}
