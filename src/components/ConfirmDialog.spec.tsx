import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('requires an explicit confirmation before a critical action runs', () => {
    const confirm = vi.fn()
    const cancel = vi.fn()
    render(<ConfirmDialog open title="Revoke access" description="Confirm revoke" confirmLabel="Revoke" destructive onCancel={cancel} onConfirm={confirm} />)

    expect(screen.getByText(/registrada en el historial del sistema/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(cancel).toHaveBeenCalledOnce()
    expect(confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(confirm).toHaveBeenCalledOnce()
  })

  it('announces and focuses an operation error inside the open dialog', () => {
    const { rerender } = render(<ConfirmDialog open title="Revoke access" description="Confirm revoke" confirmLabel="Revoke" onCancel={vi.fn()} onConfirm={vi.fn()} />)
    rerender(<ConfirmDialog open title="Revoke access" description="Confirm revoke" confirmLabel="Revoke" error="Access could not be revoked" onCancel={vi.fn()} onConfirm={vi.fn()} />)

    const alert = screen.getByRole('alert')
    expect(screen.getByRole('dialog')).toContainElement(alert)
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(alert).toHaveFocus()
  })
})
