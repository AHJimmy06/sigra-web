export type Role = 'ADMIN' | 'GUARD' | 'RESIDENT'
export interface SessionUser { sub: string; email: string; role: Role; residentId: string | null }

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

function requestErrorMessage(status: number): string {
  if (status === 400) return 'La solicitud contiene datos no válidos.'
  if (status === 401) return 'La sesión no es válida o ha vencido.'
  if (status === 403) return 'No tiene permisos para realizar esta acción.'
  if (status === 404) return 'No se encontró el recurso solicitado.'
  if (status === 409) return 'La solicitud entra en conflicto con los datos existentes.'
  if (status === 429) return 'Se realizaron demasiadas solicitudes. Inténtelo de nuevo más tarde.'
  return 'No fue posible completar la solicitud.'
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('sigra_token')
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${baseUrl}/api${path}`, { ...options, headers })
  if (!response.ok) {
    throw new ApiError(response.status, requestErrorMessage(response.status))
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  return response.json() as Promise<T>
}
