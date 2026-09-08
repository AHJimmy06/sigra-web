import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { applyApiFieldErrors, validateFieldOnInput, validateFieldOnInvalid } from './FieldFeedback'

function ValidationHarness() {
  return <form id="validation-form" onInvalid={validateFieldOnInvalid} onInput={validateFieldOnInput}>
    <label>Name<input name="name" required minLength={3} /></label>
    <label>Email<input name="email" required type="email" /></label>
  </form>
}

describe('form field feedback', () => {
  it('does not show required feedback on focus and focuses the first invalid field on validation', async () => {
    render(<ValidationHarness />)
    const name = screen.getByRole('textbox', { name: 'Name' })
    fireEvent.focus(name)
    expect(name).not.toHaveAttribute('aria-invalid')

    fireEvent.invalid(name)
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAttribute('aria-invalid', 'true')
    const feedbackId = name.getAttribute('aria-describedby')!
    expect(document.getElementById(feedbackId)).toHaveTextContent('Este campo es obligatorio.')

    fireEvent.input(name, { target: { value: 'Ana' } })
    expect(name).toHaveAttribute('aria-invalid', 'false')
    expect(document.getElementById(feedbackId)).not.toBeVisible()
  })

  it('maps structured API details to their field and focuses it', () => {
    render(<ValidationHarness />)
    const form = document.getElementById('validation-form') as HTMLFormElement
    const email = screen.getByRole('textbox', { name: 'Email' })
    const error = new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', { details: { email: ['email must be an email'] } })

    expect(applyApiFieldErrors(form, error)).toBe(true)
    expect(email).toHaveFocus()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(email.getAttribute('aria-describedby')!)).toHaveTextContent('Ingrese un correo electrónico válido.')
  })
})
