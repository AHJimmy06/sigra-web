export type Role = 'ADMIN' | 'GUARD' | 'RESIDENT'
export interface SessionUser { sub: string; email: string; role: Role; residentId: string | null }

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('sigra_token')
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${baseUrl}/api${path}`, { ...options, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText })) as { message?: string | string[] }
    throw new ApiError(response.status, Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Request failed')
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  return response.json() as Promise<T>
}
