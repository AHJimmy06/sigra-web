import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined} className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id="modal-title" className="text-lg font-semibold">{title}</h2>{description && <p id="modal-description" className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
          <Button ref={closeButtonRef} type="button" variant="ghost" size="icon" aria-label="Cerrar ventana" onClick={onClose}><X className="size-4" /></Button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}