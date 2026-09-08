import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  busy?: boolean
}

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, description, children, busy = false }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)

  useEffect(() => { onCloseRef.current = onClose; busyRef.current = busy }, [onClose, busy])

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overlay = overlayRef.current
    const background = [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
    const previous = background.map((element) => ({ element, inert: element.inert, hidden: element.getAttribute('aria-hidden') }))
    background.forEach((element) => {
      element.inert = true
      element.setAttribute('aria-hidden', 'true')
    })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !overlay) return
      const focusable = [...overlay.querySelectorAll<HTMLElement>(focusableSelector)]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previous.forEach(({ element, inert, hidden }) => {
        element.inert = inert
        if (hidden === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', hidden)
      })
      openerRef.current?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="presentation" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id={titleId} className="text-lg font-semibold">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
          <Button ref={closeButtonRef} type="button" variant="ghost" size="icon" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}><X className="size-4" /></Button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}
