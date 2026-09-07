import { AlertTriangle, Check, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}

export function ConfirmDialog({ open, title, description, confirmLabel, destructive = false, onCancel, onConfirm, busy = false }: ConfirmDialogProps) {
  return <Modal open={open} onClose={busy ? () => undefined : onCancel} title={title} description={description}><div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /><p>Esta acción quedará registrada en el historial del sistema.</p></div><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}><X className="size-4" />Cancelar</Button><Button type="button" variant={destructive ? 'destructive' : 'default'} disabled={busy} onClick={onConfirm}><Check className="size-4" />{busy ? 'Procesando…' : confirmLabel}</Button></div></Modal>
}
