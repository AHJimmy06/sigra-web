const reasonLabels: Record<string, string> = {
  VALID_PASS: 'Pase válido. Acceso autorizado.',
  INVALID_QR: 'El código QR no tiene un formato válido.',
  PASS_NOT_FOUND: 'No se encontró el pase de acceso.',
  PASS_REVOKED: 'El pase de acceso fue revocado.',
  PASS_EXPIRED: 'El pase de acceso ha vencido.',
  ACCESS_REVOKED: 'El acceso del residente o de su unidad está inactivo.',
  INVALID_OR_EXPIRED_TOKEN: 'El código temporal no es válido o ha vencido.',
}

export function accessReasonLabel(reason: string, decision: 'ALLOWED' | 'DENIED') {
  return reasonLabels[reason] ?? (decision === 'ALLOWED' ? 'Acceso autorizado.' : 'Acceso denegado.')
}
