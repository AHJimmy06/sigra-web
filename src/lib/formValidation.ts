import type { SyntheticEvent } from 'react'

type ValidatedField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function getValidatedField(event: SyntheticEvent<HTMLFormElement>) {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement ? event.target : null
}

export function setSpanishValidationMessage(event: SyntheticEvent<HTMLFormElement>) {
  const field = getValidatedField(event) as ValidatedField | null
  field?.setCustomValidity(field.validity.typeMismatch ? 'Ingrese un correo electrónico válido.' : 'Complete este campo.')
}

export function clearSpanishValidationMessage(event: SyntheticEvent<HTMLFormElement>) {
  getValidatedField(event)?.setCustomValidity('')
}