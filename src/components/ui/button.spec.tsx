import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

describe('Button action contract', () => {
  it('uses a solid compatibility surface and a minimum touch target', () => {
    render(<Button variant="outline">Confirmar</Button>)
    expect(screen.getByRole('button')).toHaveClass('sigra-button', 'min-h-11', 'min-w-11')
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline')
  })
  it('preserves disabled and enabled action behavior', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button disabled onClick={onClick}>Confirmar</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
    rerender(<Button onClick={onClick}>Confirmar</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('preserves link composition and accessible names', () => {
    render(<Button asChild><a href="/guard">Escanear</a></Button>)
    expect(screen.getByRole('link', { name: 'Escanear' })).toHaveAttribute('href', '/guard')
  })
})
