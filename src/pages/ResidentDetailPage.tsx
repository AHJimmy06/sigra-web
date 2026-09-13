import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, api } from '@/api/client'
import { residentContract, type ResidentDto } from '@/api/contracts'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'

type State = { kind: 'loading' } | { kind: 'ready'; resident: ResidentDto } | { kind: 'terminal'; message: string; retry: boolean }

export function ResidentDetailPage() {
  const { residentId = '' } = useParams()
  const navigate = useNavigate()
  const owner = useRef(0)
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const generation = ++owner.current
    setState({ kind: 'loading' })
    void (async () => {
      try {
        const resident = await api<ResidentDto>(residentContract.detail(residentId, true).path, { signal: controller.signal })
        if (!controller.signal.aborted && generation === owner.current) setState({ kind: 'ready', resident })
      } catch (error) {
        if (controller.signal.aborted || generation !== owner.current) return
        const terminal = error instanceof ApiError && [401, 403, 404].includes(error.status)
        setState({ kind: 'terminal', message: error instanceof Error ? error.message : 'No fue posible cargar el residente.', retry: !terminal })
      }
    })()
    return () => { controller.abort(); owner.current += 1 }
  }, [residentId, reload])

  async function archive() {
    if (state.kind !== 'ready' || busy) return
    const controller = new AbortController()
    const generation = ++owner.current
    setBusy(true); setActionError('')
    try {
      await api(residentContract.archive(state.resident.id).path, { method: 'POST', signal: controller.signal })
      if (generation === owner.current) { setPending(false); setReload((value) => value + 1) }
    } catch (error) {
      if (generation === owner.current) setActionError(error instanceof Error ? error.message : 'No fue posible archivar el residente.')
    } finally { if (generation === owner.current) setBusy(false) }
  }

  if (state.kind === 'loading') return <LoadingState />
  if (state.kind === 'terminal') return <div role="alert" className="rounded-lg border p-3"><span>{state.message}</span>{state.retry && <button type="button" onClick={() => setReload((value) => value + 1)}>Reintentar</button>}</div>
  const { resident } = state
  return <>
    <PageHeader title={resident.name} description={`${resident.email} · ${resident.unit.code}`} action={<Button variant="outline" onClick={() => navigate('/residents')}>Volver a residentes</Button>} />
    <section aria-label="Detalle del residente" className="rounded-xl border bg-card p-5"><dl className="grid gap-3 text-sm"><div><dt className="text-muted-foreground">Estado</dt><dd>{resident.active ? 'Activo' : 'Revocado'}</dd></div><div><dt className="text-muted-foreground">Unidad</dt><dd>{resident.unit.code}</dd></div></dl><div className="mt-5">{resident.archivedAt ? <span>Residente archivado</span> : <Button variant="outline" onClick={() => { setActionError(''); setPending(true) }}>Archivar residente</Button>}</div></section>
    <ConfirmDialog open={pending} onCancel={() => setPending(false)} onConfirm={() => void archive()} busy={busy} error={actionError} title="Archivar residente" description={`¿Desea archivar a ${resident.name}? El acceso quedará revocado.`} confirmLabel="Archivar residente" destructive />
  </>
}
