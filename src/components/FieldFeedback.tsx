import type { FormEvent, InvalidEvent, SyntheticEvent } from 'react'
import { ApiError } from '@/api/client'

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function feedbackId(field: FormField) {
  const formId = field.form?.id || 'form'
  const fieldId = field.id || field.name || 'field'
  return `${formId}-${fieldId}-feedback`
}

function nativeValidationMessage(field: FormField) {
  const value = field.value
  if (field.validity.valueMissing) return field.tagName === 'SELECT' ? 'Seleccione una opción.' : 'Este campo es obligatorio.'
  if (field.validity.typeMismatch && field instanceof HTMLInputElement && field.type === 'email') return 'Ingrese un correo electrónico válido.'
  if (field.validity.badInput) return 'Ingrese un número válido.'
  if (field.validity.stepMismatch) return 'Ingrese un número entero, sin decimales.'
  if (field.validity.rangeUnderflow && field instanceof HTMLInputElement) return `El valor mínimo permitido es ${field.min}.`
  if (field.validity.rangeOverflow && field instanceof HTMLInputElement) return `El valor máximo permitido es ${field.max}.`
  if (field.validity.tooShort && 'minLength' in field) return `Ingrese al menos ${field.minLength} caracteres.`
  if (field.validity.tooLong && 'maxLength' in field) return `No puede superar los ${field.maxLength} caracteres.`
  if (field.validity.patternMismatch) return 'El formato no es válido.'
  if (!value && field.required) return 'Este campo es obligatorio.'
  return ''
}

function confirmationMessage(field: FormField) {
  if (!(field instanceof HTMLInputElement) || field.name !== 'confirmation' || !field.value) return ''
  const password = field.form?.elements.namedItem('password')
  return password instanceof HTMLInputElement && field.value !== password.value ? 'Las contraseñas no coinciden.' : ''
}

function ensureFeedback(field: FormField) {
  const host = field.closest('label') ?? field.parentElement
  if (!host) return null
  const id = feedbackId(field)
  let message = document.getElementById(id)
  if (!message) {
    message = document.createElement('p')
    message.id = id
    message.dataset.validationMessage = 'true'
    message.className = 'mt-1 text-xs text-destructive'
    message.setAttribute('aria-live', 'polite')
    message.setAttribute('aria-atomic', 'true')
    message.hidden = true
    host.append(message)
  }
  const describedBy = new Set((field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean))
  describedBy.add(id)
  field.setAttribute('aria-describedby', [...describedBy].join(' '))
  return message
}

function showFeedback(field: FormField, override?: string) {
  const message = ensureFeedback(field)
  if (!message) return
  const text = override ?? (confirmationMessage(field) || nativeValidationMessage(field))
  message.textContent = text
  message.hidden = !text
  field.setAttribute('aria-invalid', String(Boolean(text)))
}

function fieldFromEvent(event: SyntheticEvent<HTMLFormElement>) {
  const target = event.target
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement ? target : null
}

export function validateFieldOnInput(event: FormEvent<HTMLFormElement>) {
  const field = fieldFromEvent(event)
  if (!field) return
  if (field.dataset.serverError) {
    delete field.dataset.serverError
    field.setCustomValidity('')
  }
  showFeedback(field)
  if (field instanceof HTMLInputElement && field.name === 'password') {
    const confirmation = field.form?.elements.namedItem('confirmation')
    if (confirmation instanceof HTMLInputElement && confirmation.value) showFeedback(confirmation)
  }
}

export function validateFieldOnInvalid(event: InvalidEvent<HTMLFormElement>) {
  event.preventDefault()
  const field = fieldFromEvent(event)
  if (!field) return
  showFeedback(field, field.dataset.serverError)
  const form = field.form
  window.requestAnimationFrame(() => {
    const firstInvalid = form?.querySelector<FormField>(':invalid')
    ;(firstInvalid ?? field).focus()
  })
}

export function validateForm(form: HTMLFormElement) {
  const confirmation = form.elements.namedItem('confirmation')
  if (confirmation instanceof HTMLInputElement) {
    const message = confirmationMessage(confirmation)
    confirmation.setCustomValidity(message)
    if (message) showFeedback(confirmation, message)
  }
  const valid = form.checkValidity()
  if (!valid) {
    const firstInvalid = form.querySelector<FormField>(':invalid')
    firstInvalid?.focus()
  }
  return valid
}

function localizeServerMessage(field: FormField, messages: string | string[]) {
  const value = Array.isArray(messages) ? messages.join(' ') : messages
  const minimum = value.match(/must be longer than or equal to (\d+)/)
  if (minimum) return `Ingrese al menos ${minimum[1]} caracteres.`
  const maximum = value.match(/must be shorter than or equal to (\d+)/)
  if (maximum) return `No puede superar los ${maximum[1]} caracteres.`
  if (value.includes('must be an email')) return 'Ingrese un correo electrónico válido.'
  if (value.includes('must be a UUID')) return 'Seleccione una opción válida.'
  if (value.includes('must be an integer')) return 'Ingrese un número entero, sin decimales.'
  if (value.includes('must not be less than')) return field instanceof HTMLInputElement ? `El valor mínimo permitido es ${field.min}.` : 'El valor es menor que el permitido.'
  if (value.includes('must not be greater than')) return field instanceof HTMLInputElement ? `El valor máximo permitido es ${field.max}.` : 'El valor supera el máximo permitido.'
  return 'Revise este campo.'
}

export function applyApiFieldErrors(form: HTMLFormElement, error: unknown) {
  if (!(error instanceof ApiError) || !error.details) return false
  let firstField: FormField | null = null
  for (const [path, messages] of Object.entries(error.details)) {
    const name = path.split('.').at(-1)
    if (!name) continue
    const field = form.elements.namedItem(name)
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) continue
    const message = localizeServerMessage(field, messages)
    field.dataset.serverError = message
    field.setCustomValidity(message)
    showFeedback(field, message)
    firstField ??= field
  }
  firstField?.focus()
  return firstField !== null
}

export function setSpanishValidationMessage(event: InvalidEvent<HTMLFormElement>) { validateFieldOnInvalid(event) }
export function clearSpanishValidationMessage(event: SyntheticEvent<HTMLFormElement>) { validateFieldOnInput(event as FormEvent<HTMLFormElement>) }
