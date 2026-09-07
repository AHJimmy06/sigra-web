// oxlint-disable react/only-export-components -- Validation handlers and the feedback component share one form-validation boundary.
import type { FocusEvent, FormEvent, InvalidEvent, SyntheticEvent } from 'react'

interface FieldFeedbackProps {
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  showOptional?: boolean
}

function passwordMessage(value: string, required: boolean, minLength: number, maxLength: number) {
  if (!value && required) return 'Este campo es obligatorio.'
  if (!value) return 'Recomendación: use una combinación de mayúsculas, minúsculas, números y símbolos.'
  if (value.length < minLength) return `La contraseña debe tener al menos ${minLength} caracteres.`
  if (value.length > maxLength) return `La contraseña no puede superar los ${maxLength} caracteres.`
  if (!/[A-ZÁÉÍÓÚÑ]/.test(value)) return 'Agregue al menos una letra mayúscula.'
  if (!/[a-záéíóúñ]/.test(value)) return 'Agregue al menos una letra minúscula.'
  if (!/\d/.test(value)) return 'Agregue al menos un número.'
  if (!/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/.test(value)) return 'Agregue al menos un símbolo, por ejemplo: !, @ o #.'
  return ''
}

function emailMessage(value: string, required: boolean) {
  if (!value && required) return 'Este campo es obligatorio.'
  if (!value) return ''
  if (/[ñÑ]/.test(value)) return 'El correo no puede contener la letra ñ.'
  if (!value.includes('@')) return 'El correo debe incluir el símbolo @.'
  if ((value.match(/@/g) ?? []).length !== 1) return 'El correo debe contener un solo símbolo @.'
  const [local, domain] = value.split('@')
  if (!local) return 'Ingrese la parte del correo anterior al símbolo @.'
  if (!domain) return 'Ingrese el dominio después del símbolo @.'
  if (!domain.includes('.')) return 'El dominio debe incluir un punto, por ejemplo: correo.com.'
  if (domain.startsWith('.') || domain.endsWith('.')) return 'El dominio no puede comenzar ni terminar con un punto.'
  if (domain.includes('..') || local.includes('..')) return 'El correo no puede contener puntos consecutivos.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Revise el formato: ejemplo@correo.com.'
  return ''
}

export function validationMessage(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const value = field.value.trim()
  const required = field.required
  const minLength = 'minLength' in field && field.minLength > 0 ? field.minLength : 8
  const maxLength = 'maxLength' in field && field.maxLength > 0 ? field.maxLength : 72
  if (field.name === 'parkingSpaces' && 'min' in field) field.min = '1'
  if (field.type === 'email') return emailMessage(value, required)
  if (field.type === 'password') return field.autocomplete === 'current-password' ? (!field.value && required ? 'Este campo es obligatorio.' : '') : passwordMessage(field.value, required, minLength, maxLength)
  if (field.type === 'number') {
    if (!value && required) return 'Este campo es obligatorio.'
    if (!value) return ''
    if (field.validity.badInput) return 'Ingrese un número válido.'
    if (field.name === 'parkingSpaces' && Number(value) < 1) return 'Debe registrar al menos 1 plaza de estacionamiento.'
    if (field.validity.stepMismatch) return 'Ingrese un número entero, sin decimales.'
    if (field.validity.rangeUnderflow && 'min' in field) return `El valor mínimo permitido es ${field.min}.`
    if (field.validity.rangeOverflow && 'max' in field) return `El valor máximo permitido es ${field.max}.`
  }
  if (field.tagName === 'SELECT' && required && !value) return 'Seleccione una opción.'
  if (!value && required) return 'Este campo es obligatorio.'
  if (!value) return ''
  if ('minLength' in field && field.minLength > 0 && value.length < field.minLength) return `Ingrese al menos ${field.minLength} caracteres.`
  if ('maxLength' in field && field.maxLength > 0 && value.length > field.maxLength) return `No puede superar los ${field.maxLength} caracteres.`
  if (field.validity.patternMismatch) return 'El formato no es válido. Siga el ejemplo mostrado.'
  return ''
}

function updateFeedback(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const host = field.parentElement
  if (!host) return
  let message = host.querySelector<HTMLElement>('[data-validation-message]')
  if (!message) {
    message = document.createElement('p')
    message.dataset.validationMessage = 'true'
    message.className = 'mt-1 text-xs text-destructive'
    message.setAttribute('aria-live', 'polite')
    host.append(message)
  }
  const confirmation = field instanceof HTMLInputElement && field.name === 'confirmation' ? field.form?.querySelector<HTMLInputElement>('input[name="password"]') : null
  const text = confirmation && field.value && field.value !== confirmation.value ? 'Las contraseñas no coinciden.' : validationMessage(field)
  message.textContent = text
  message.hidden = !text
  field.setAttribute('aria-invalid', String(Boolean(text)))
  field.setCustomValidity(text)
}

function fieldFromEvent(event: SyntheticEvent<HTMLFormElement>) {
  const target = event.target
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement ? target : null
}

export function validateFieldOnInput(event: FormEvent<HTMLFormElement>) { const field = fieldFromEvent(event); if (field) { updateFeedback(field); if (field instanceof HTMLInputElement && field.name === 'password') { const confirmation = field.form?.querySelector<HTMLInputElement>('input[name="confirmation"]'); if (confirmation) updateFeedback(confirmation) } } }
export function validateFieldOnFocus(event: FocusEvent<HTMLFormElement>) { const field = fieldFromEvent(event); if (field) updateFeedback(field) }
export function validateFieldOnInvalid(event: InvalidEvent<HTMLFormElement>) { event.preventDefault(); const field = fieldFromEvent(event); if (field) updateFeedback(field) }

export function setSpanishValidationMessage(event: InvalidEvent<HTMLFormElement>) { validateFieldOnInvalid(event) }
export function clearSpanishValidationMessage(event: SyntheticEvent<HTMLFormElement>) {
  const field = event.target
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) updateFeedback(field)
}

export function FieldFeedback({ field, showOptional = false }: FieldFeedbackProps) {
  const message = validationMessage(field)
  if (!message && !showOptional) return null
  return <p className={`mt-1 text-xs ${message ? 'text-destructive' : 'text-muted-foreground'}`} aria-live="polite">{message || 'Campo opcional.'}</p>
}

