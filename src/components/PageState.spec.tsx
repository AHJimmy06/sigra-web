import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './PageState'

describe('ErrorState', () => {
  it('offers a usable retry action when recovery is available', () => {
    const retry = vi.fn()
    render(<ErrorState message="No fue posible cargar." onRetry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
