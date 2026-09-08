export interface ValidationAttempt {
  qrPayload: string
  direction: 'ENTRY' | 'EXIT'
  clientEventId: string
}

export function nextValidationAttempt(
  previous: ValidationAttempt | undefined,
  qrPayload: string,
  direction: ValidationAttempt['direction'],
): ValidationAttempt {
  return previous?.qrPayload === qrPayload && previous.direction === direction
    ? previous
    : { qrPayload, direction, clientEventId: crypto.randomUUID() }
}
