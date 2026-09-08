import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './modal'

function ModalHarness({ busy = false, onClose = vi.fn() }: { busy?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return <div data-testid="background">
    <button onClick={() => setOpen(true)}>Open modal</button>
    <Modal open={open} busy={busy} onClose={() => { onClose(); setOpen(false) }} title="Example modal">
      <button>First action</button><button>Last action</button>
    </Modal>
  </div>
}

describe('Modal focus and interaction boundary', () => {
  it('traps focus and restores it to the opener when closed', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    const opener = screen.getByRole('button', { name: 'Open modal' })
    await user.click(opener)
    const close = screen.getByRole('button', { name: 'Cerrar ventana' })
    expect(close).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus()
    await user.keyboard('{Tab}')
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })

  it('blocks Escape and backdrop closing while busy', async () => {
    const close = vi.fn()
    const user = userEvent.setup()
    render(<ModalHarness busy onClose={close} />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    await user.keyboard('{Escape}')
    fireEvent.mouseDown(screen.getByRole('presentation'))
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('background').parentElement).toHaveAttribute('aria-hidden', 'true')
  })
})
