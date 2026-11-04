export interface ValidationAttempt {
  qrPayload: string
  direction: 'ENTRY' | 'EXIT'
  clientEventId: string
  visitorName?: string
}

export function nextValidationAttempt(
  previous: ValidationAttempt | undefined,
  qrPayload: string,
  direction: ValidationAttempt['direction'],
  visitorName?: string,
): ValidationAttempt {
  const normalizedName = visitorName?.trim()
  return previous?.qrPayload === qrPayload && previous.direction === direction && previous.visitorName === normalizedName
    ? previous
    : { qrPayload, direction, clientEventId: crypto.randomUUID(), ...(normalizedName === undefined ? {} : { visitorName: normalizedName }) }
}
