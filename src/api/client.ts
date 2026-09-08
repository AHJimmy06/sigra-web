import type { ApiErrorCode, ApiErrorPayload } from '@/api/contracts'

export type Role = 'ADMIN' | 'GUARD' | 'RESIDENT'
export interface SessionUser { sub: string; email: string; role: Role; residentId: string | null }

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
}

const baseUrl = (import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code: ApiErrorCode
  details?: Record<string, string | string[]>
  requestId?: string
  constructor(status: number, message: string, code: ApiErrorCode = 'UNKNOWN_ERROR', payload?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = payload?.details
    this.requestId = payload?.requestId
  }
}

function errorCode(status: number): ApiErrorCode {
  if (status === 400) return 'BAD_REQUEST'
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'INTERNAL_ERROR'
  return 'UNKNOWN_ERROR'
}

function defaultErrorMessage(code: ApiErrorCode): string {
  const messages: Record<ApiErrorCode, string> = { VALIDATION_ERROR: 'La solicitud contiene datos no válidos.', BAD_REQUEST: 'La solicitud no es válida.', UNAUTHORIZED: 'La sesión no es válida o ha vencido.', FORBIDDEN: 'No tiene permisos para realizar esta acción.', NOT_FOUND: 'No se encontró el recurso solicitado.', CONFLICT: 'La solicitud entra en conflicto con los datos existentes.', RATE_LIMITED: 'Se realizaron demasiadas solicitudes. Inténtelo de nuevo más tarde.', INTERNAL_ERROR: 'No fue posible completar la solicitud.', NETWORK_ERROR: 'No fue posible conectar con el servidor.', TIMEOUT: 'El servidor tardó demasiado en responder.', UNKNOWN_ERROR: 'No fue posible completar la solicitud.' }
  return messages[code]
}

const serverMessageTranslations: Record<string, string> = {
  'Invalid credentials': 'El correo o la contraseña no son válidos.',
  'Email is already registered': 'El correo ya está registrado.',
  'Unit code is already registered': 'El código de unidad ya está registrado.',
  'Unit must exist and be active': 'La unidad debe existir y estar activa.',
  'Unit cannot be deactivated while active residents are linked to it': 'No se puede desactivar la unidad mientras tenga residentes activos.',
  'Invalid ticket status transition': 'El cambio de estado de la incidencia no es válido.',
  'Validation failed': 'La solicitud contiene datos no válidos.',
}

function errorMessage(payload: ApiErrorPayload, code: ApiErrorCode) {
  if (Array.isArray(payload.message)) return defaultErrorMessage(code)
  if (!payload.message) return defaultErrorMessage(code)
  return serverMessageTranslations[payload.message] ?? defaultErrorMessage(code)
}

async function readErrorPayload(response: Response): Promise<ApiErrorPayload> {
  try { return await response.json() as ApiErrorPayload } catch { return {} }
}

const serverErrorCodes = new Set<ApiErrorCode>(['VALIDATION_ERROR', 'BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'RATE_LIMITED', 'INTERNAL_ERROR'])

function normalizedServerCode(payload: ApiErrorPayload, status: number): ApiErrorCode {
  const fallback = errorCode(status)
  if (typeof payload.code !== 'string' || !serverErrorCodes.has(payload.code as ApiErrorCode)) return fallback
  const code = payload.code as ApiErrorCode
  if (status === 400 && (code === 'VALIDATION_ERROR' || code === 'BAD_REQUEST')) return code
  const expectedStatus: Partial<Record<ApiErrorCode, number>> = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 }
  return expectedStatus[code] === status || (code === 'INTERNAL_ERROR' && status >= 500) ? code : fallback
}

function normalizedPayload(payload: ApiErrorPayload): ApiErrorPayload {
  const details = payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
    ? Object.fromEntries(Object.entries(payload.details).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((value) => typeof value === 'string')))
    : {}
  const requestId = typeof payload.requestId === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(payload.requestId) ? payload.requestId : undefined
  return { ...payload, details, requestId }
}

function shouldRetry(method: string, error: unknown) {
  if (method !== 'GET') return false
  return error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500)
}

async function waitForRetry(attempt: number, signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 200 * 2 ** attempt)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

async function request<T>(path: string, options: ApiRequestOptions): Promise<T> {
  if (options.signal?.aborted) {
    throw options.signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
  const { timeoutMs = 15000, retries: _retries, ...requestOptions } = options
  const token = window.localStorage.getItem('sigra_token')
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort('timeout'), timeoutMs)
  const abortExternalRequest = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', abortExternalRequest, { once: true })
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api${path}`, { ...requestOptions, headers, signal: controller.signal })
  } catch (error) {
    if (options.signal?.aborted) throw error
    const code = controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR'
    throw new ApiError(0, defaultErrorMessage(code), code)
  } finally {
    window.clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', abortExternalRequest)
  }
  if (!response.ok) {
    const payload = normalizedPayload(await readErrorPayload(response))
    const code = normalizedServerCode(payload, response.status)
    const message = errorMessage(payload, code)
    if (response.status === 401) window.dispatchEvent(new CustomEvent('sigra:session-expired'))
    throw new ApiError(response.status, message, code, payload)
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  return response.json() as Promise<T>
}

export async function api<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const retries = options.retries ?? (options.method === undefined || options.method === 'GET' ? 2 : 0)
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request<T>(path, options)
    } catch (error) {
      if (attempt >= retries || !shouldRetry(options.method ?? 'GET', error)) throw error
      await waitForRetry(attempt, options.signal ?? undefined)
    }
  }
}
