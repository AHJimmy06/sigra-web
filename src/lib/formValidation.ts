import type { SyntheticEvent } from 'react'

type ValidatedField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function getValidatedField(event: SyntheticEvent<HTMLFormElement>) {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement ? event.target : null
}

export function setSpanishValidationMessage(event: SyntheticEvent<HTMLFormElement>) {
  const field = getValidatedField(event) as ValidatedField | null
  if (!field) return
  const { validity } = field
  const minLength = 'minLength' in field ? field.minLength : 0
  const min = 'min' in field ? field.min : ''
  const max = 'max' in field ? field.max : ''
  const message = validity.valueMissing ? 'Este campo es obligatorio.'
    : validity.typeMismatch ? 'Ingrese un correo electrónico válido.'
      : validity.tooShort ? `Ingrese al menos ${minLength} caracteres.`
        : validity.patternMismatch ? 'Use el formato indicado en el ejemplo.'
          : validity.rangeUnderflow ? `El valor mínimo permitido es ${min}.`
            : validity.rangeOverflow ? `El valor máximo permitido es ${max}.`
              : 'Revise el valor ingresado.'
  field.setCustomValidity(message)
}

export function clearSpanishValidationMessage(event: SyntheticEvent<HTMLFormElement>) {
  getValidatedField(event)?.setCustomValidity('')
}