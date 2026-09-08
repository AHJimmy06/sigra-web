import { describe, expect, it } from 'vitest'
import { accessReasonLabel } from '@/lib/accessReasons'
import { nextValidationAttempt } from '@/lib/accessValidationAttempt'

describe('guard reason localization', () => {
  it.each([
    ['VALID_PASS', 'Pase válido. Acceso autorizado.'],
    ['INVALID_QR', 'El código QR no tiene un formato válido.'],
    ['PASS_NOT_FOUND', 'No se encontró el pase de acceso.'],
    ['PASS_REVOKED', 'El pase de acceso fue revocado.'],
    ['PASS_EXPIRED', 'El pase de acceso ha vencido.'],
    ['ACCESS_REVOKED', 'El acceso del residente o de su unidad está inactivo.'],
    ['INVALID_OR_EXPIRED_TOKEN', 'El código temporal no es válido o ha vencido.'],
  ])('localizes %s', (reason, expected) => {
    expect(accessReasonLabel(reason, reason === 'VALID_PASS' ? 'ALLOWED' : 'DENIED')).toBe(expected)
  })
})

describe('guard validation idempotency', () => {
  it('reuses the client event ID only for the same failed attempt', () => {
    const first = nextValidationAttempt(undefined, 'qr-one', 'ENTRY')
    const retry = nextValidationAttempt(first, 'qr-one', 'ENTRY')
    const differentPayload = nextValidationAttempt(first, 'qr-two', 'ENTRY')
    const differentDirection = nextValidationAttempt(first, 'qr-one', 'EXIT')

    expect(retry).toBe(first)
    expect(differentPayload.clientEventId).not.toBe(first.clientEventId)
    expect(differentDirection.clientEventId).not.toBe(first.clientEventId)
  })
})
