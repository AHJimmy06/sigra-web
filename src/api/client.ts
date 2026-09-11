import type { ApiErrorCode, ApiErrorPayload } from '@/api/contracts'
import { coordinateRefresh, publishLogout, publishSession, releaseOwnedRefresh, subscribeToSessionMessages, type RefreshResult } from '@/auth/refreshCoordinator'

export type Role = 'ADMIN' | 'GUARD' | 'RESIDENT'
export interface SessionUser { sub: string; email: string; role: Role; residentId: string | null }

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
}

interface InternalRequestOptions extends ApiRequestOptions { replayed?: boolean; skipRefresh?: boolean }

const CSRF_STORAGE_KEY = 'sigra_csrf'
let accessToken: string | null = null
let csrfToken = window.localStorage.getItem(CSRF_STORAGE_KEY)
let sessionEpoch = 0
let sessionLineage: string | null = null
const invalidatedLineages = new Set<string>()

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

function newSessionLineage() { return crypto.randomUUID() }

function acceptSession(result: RefreshResult, broadcast = false, epoch = sessionEpoch, lineage = sessionLineage ?? newSessionLineage()) {
  if (epoch !== sessionEpoch || invalidatedLineages.has(lineage)) return false
  accessToken = result.accessToken
  csrfToken = result.csrfToken
  sessionLineage = lineage
  window.localStorage.setItem(CSRF_STORAGE_KEY, result.csrfToken)
  if (broadcast) publishSession(result, lineage)
  return true
}

function invalidSessionResponse(): ApiError {
  return new ApiError(0, defaultErrorMessage('UNKNOWN_ERROR'), 'UNKNOWN_ERROR')
}

function sessionResult(body: unknown, response: Response): RefreshResult {
  const access = typeof body === 'object' && body !== null ? (body as { accessToken?: unknown }).accessToken : undefined
  const csrf = response.headers.get('X-CSRF-Token')
  if (typeof access !== 'string' || !access.trim() || !csrf?.trim()) throw invalidSessionResponse()
  return { accessToken: access, csrfToken: csrf }
}

async function readSessionResult(response: Response): Promise<RefreshResult> {
  try {
    return sessionResult(await response.json(), response)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw invalidSessionResponse()
  }
}

export function clearSession(broadcast = false) {
  accessToken = null
  csrfToken = null
  window.localStorage.removeItem(CSRF_STORAGE_KEY)
  if (broadcast) publishLogout()
}

export function invalidateSession(broadcast = true) {
  const hadSession = Boolean(accessToken || csrfToken)
  if (sessionLineage) invalidatedLineages.add(sessionLineage)
  sessionEpoch += 1
  sessionLineage = null
  clearSession(broadcast)
  void releaseOwnedRefresh()
  if (hadSession) window.dispatchEvent(new CustomEvent('sigra:session-expired'))
}

export function shareSession() {
  if (accessToken && csrfToken) {
    sessionLineage ??= newSessionLineage()
    publishSession({ accessToken, csrfToken }, sessionLineage)
  }
}

function expireSession(broadcast = true) {
  invalidateSession(broadcast)
}

subscribeToSessionMessages((message) => {
  if (message.type === 'session-established' || message.type === 'refresh-succeeded') {
    if (acceptSession(message.result, false, sessionEpoch, message.sessionLineage)) {
      window.dispatchEvent(new CustomEvent('sigra:session-updated'))
    }
  } else if (message.type === 'session-ended') {
    expireSession(false)
  } else if (message.type === 'session-available') {
    window.dispatchEvent(new CustomEvent('sigra:session-available'))
  }
})

async function fetchResponse(path: string, options: InternalRequestOptions): Promise<Response> {
  if (options.signal?.aborted) {
    throw options.signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
  const { timeoutMs = 15000, retries: _retries, replayed: _replayed, skipRefresh: _skipRefresh, ...requestOptions } = options
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort('timeout'), timeoutMs)
  const abortExternalRequest = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', abortExternalRequest, { once: true })
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api${path}`, { ...requestOptions, credentials: 'include', headers, signal: controller.signal })
  } catch (error) {
    if (options.signal?.aborted) throw error
    const code = controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR'
    throw new ApiError(0, defaultErrorMessage(code), code)
  } finally {
    window.clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', abortExternalRequest)
  }
  return response
}

const refreshExcludedPaths = new Set(['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'])
function isRefreshExcluded(path: string) { return refreshExcludedPaths.has(path.split('?')[0]) }

async function refreshAccessToken(): Promise<RefreshResult> {
  const epoch = sessionEpoch
  const lineage = sessionLineage ?? newSessionLineage()
  if (!csrfToken) throw new ApiError(401, defaultErrorMessage('UNAUTHORIZED'), 'UNAUTHORIZED')
  const result = await coordinateRefresh(async (operationId) => {
    const response = await fetchResponse('/auth/refresh', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken!, 'X-Refresh-Operation-Id': operationId },
      skipRefresh: true,
    })
    if (!response.ok) throw await responseError(response)
    const result = await readSessionResult(response)
    if (!acceptSession(result, false, epoch, lineage)) throw invalidSessionResponse()
    return result
  }, lineage)
  if (epoch !== sessionEpoch) throw invalidSessionResponse()
  return result
}

async function responseError(response: Response) {
  const payload = normalizedPayload(await readErrorPayload(response))
  const code = normalizedServerCode(payload, response.status)
  const message = errorMessage(payload, code)
  return new ApiError(response.status, message, code, payload)
}

async function request<T>(path: string, options: InternalRequestOptions): Promise<T> {
  let response = await fetchResponse(path, options)
  if (response.status === 401 && accessToken && !options.replayed && !options.skipRefresh && !isRefreshExcluded(path)) {
    try {
      await refreshAccessToken()
      response = await fetchResponse(path, { ...options, replayed: true })
    } catch (error) {
      expireSession()
      throw error
    }
  }
  if (!response.ok) {
    const error = await responseError(response)
    if (response.status === 401 && (options.replayed || (!isRefreshExcluded(path) && accessToken))) expireSession()
    throw error
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  let body: T
  try {
    body = await response.json() as T
  } catch (error) {
    if (path === '/auth/login') {
      expireSession()
      throw invalidSessionResponse()
    }
    throw error
  }
  if (path === '/auth/login') {
    try {
      acceptSession(sessionResult(body, response))
    } catch (error) {
      expireSession()
      throw error
    }
  }
  return body
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

export async function restoreSession(): Promise<SessionUser> {
  const epoch = sessionEpoch
  try {
    await refreshAccessToken()
    const user = await api<SessionUser>('/auth/me', { retries: 0 })
    if (epoch !== sessionEpoch) throw invalidSessionResponse()
    return user
  } catch (error) {
    expireSession()
    throw error
  }
}

export async function logoutSession(): Promise<void> {
  const logoutCsrf = csrfToken
  invalidateSession()
  await request('/auth/logout', { method: 'POST', headers: logoutCsrf ? { 'X-CSRF-Token': logoutCsrf } : {}, skipRefresh: true })
}
