// oxlint-disable react/set-state-in-effect -- Pass list state is synchronized on mount.
import { useEffect, useState } from 'react'
import { QrCode, Plus, XCircle, KeyRound, Clock } from 'lucide-react'
import { api } from '@/api/client'
import { ErrorState, LoadingState, PageHeader } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { ResidentArrivals } from '@/components/ResidentArrivals'
import { Modal } from '@/components/ui/modal'

interface AccessPass {
  id: string
  validUntil: string
  revokedAt: string | null
  createdAt: string
}

interface QrData {
  payload: string
  expiresInSeconds?: number
  expiresAt?: string
}

export function ResidentDashboardPage() {
  const [passes, setPasses] = useState<AccessPass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [activeQr, setActiveQr] = useState<QrData | null>(null)
  const [creating, setCreating] = useState(false)

  const fetchPasses = () => {
    setLoading(true)
    api<AccessPass[]>('/access/passes')
      .then(setPasses)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPasses()
  }, [])

  const handleCreatePass = async (days: number) => {
    try {
      setCreating(true)
      await api('/access/passes', {
        method: 'POST',
        body: JSON.stringify({ validDays: days }),
      })
      fetchPasses()
    } catch (e: unknown) {
      alert('Error al generar pase: ' + (e instanceof Error ? e.message : 'Error desconocido'))
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Seguro que desea revocar este pase?')) return
    try {
      await api(`/access/passes/${id}/revoke`, { method: 'POST' })
      fetchPasses()
    } catch (e: unknown) {
      alert('Error al revocar: ' + (e instanceof Error ? e.message : 'Error desconocido'))
    }
  }

  const showQr = async (id: string) => {
    try {
      const qrData = await api<QrData>(`/access/passes/${id}/qr`)
      setActiveQr(qrData)
      setQrModalOpen(true)
    } catch (e: unknown) {
      alert('No se pudo generar el código QR: ' + (e instanceof Error ? e.message : 'Error desconocido'))
    }
  }

  return (
    <>
      <PageHeader
        title="Mis Accesos"
        description="Gestione sus pases y genere códigos QR para ingresar o permitir la entrada de visitantes."
      />

      <ResidentArrivals />
      {error && <ErrorState message={error} onRetry={fetchPasses} />}

      {!loading && !error && (
        <div className="space-y-6">
          <section className="flex flex-wrap gap-4">
            <Button onClick={() => void handleCreatePass(1)} disabled={creating}>
              <Plus className="mr-2 size-4" /> Pase de Visitante (1 Día)
            </Button>
            <Button variant="outline" onClick={() => void handleCreatePass(30)} disabled={creating}>
              <KeyRound className="mr-2 size-4" /> Pase Frecuente (30 Días)
            </Button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {passes.length === 0 ? (
              <div className="col-span-full rounded-xl border bg-card p-8 text-center text-muted-foreground">
                <QrCode className="mx-auto mb-3 size-12 opacity-20" />
                No tiene pases activos generados.
              </div>
            ) : (
              passes.map((pass) => {
                const isValid = !pass.revokedAt && new Date(pass.validUntil) > new Date()
                return (
                  <article key={pass.id} className={`rounded-xl border bg-card p-5 shadow-sm transition-opacity ${isValid ? '' : 'opacity-60 grayscale'}`}>
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {isValid ? 'Pase Activo' : (pass.revokedAt ? 'Pase Revocado' : 'Pase Expirado')}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Clock className="mr-1 size-3" /> Válido hasta: {new Date(pass.validUntil).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isValid && (
                        <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {isValid ? (
                        <>
                          <Button size="sm" className="flex-1" onClick={() => void showQr(pass.id)}>
                            <QrCode className="mr-2 size-4" /> Ver QR
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => void handleRevoke(pass.id)}>
                            <XCircle className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" className="w-full" disabled>
                          Inhabilitado
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </section>
        </div>
      )}

      {loading && !passes.length && <LoadingState />}

      <Modal open={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Código de Acceso QR">
        {activeQr ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeQr.payload)}`}
                alt="Código QR de Acceso"
                className="size-64"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Muéstrele este código al guardia de garita</p>
              <p className="text-xs text-muted-foreground mt-2">
                {activeQr.expiresAt
                  ? `Expiración de rotación: ${new Date(activeQr.expiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : `Vigencia del código rotativo: ${activeQr.expiresInSeconds ?? 30} segundos`}
              </p>
            </div>
          </div>
        ) : (
          <LoadingState />
        )}
      </Modal>
    </>
  )
}
