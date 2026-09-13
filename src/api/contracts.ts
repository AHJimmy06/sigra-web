export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR'

export interface ApiErrorPayload {
  code?: string
  message?: string | string[]
  details?: Record<string, string | string[]>
  requestId?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PaginationQuery {
  page?: number
  pageSize?: number
}

export const API_CONTRACT_SHA = '40be73f5aa067f3088da97cc506d2517be085e96'

export interface ResidentUnitDto {
  id: string
  code: string
  address: string
  parkingSpaces: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ResidentDto {
  id: string
  name: string
  email: string
  phone: string | null
  active: boolean
  archivedAt: string | null
  unitId: string
  unit: ResidentUnitDto
  createdAt: string
  updatedAt: string
}

export interface UnitDto {
  id: string
  code: string
  address: string
  parkingSpaces: number
  active: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ResidentListQuery extends PaginationQuery {
  search?: string
  status?: boolean
  unitId?: string
  includeArchived?: boolean
}

export interface UnitListQuery extends PaginationQuery {
  search?: string
  status?: boolean
  includeArchived?: boolean
}

export interface CreateResidentPayload {
  name: string
  phone?: string
  unitId: string
  email: string
  password: string
}

export interface UpdateResidentPayload {
  name?: string
  phone?: string
  unitId?: string
  email?: string
  active?: boolean
}

export interface CreateUnitPayload {
  code: string
  address: string
  parkingSpaces: number
}

export interface UpdateUnitPayload {
  code?: string
  address?: string
  parkingSpaces?: number
  active?: boolean
}

type ContractRequest = { method: 'GET' | 'POST' | 'PATCH'; path: string; body?: object }

function detailRequest(path: string, includeArchived?: boolean): ContractRequest {
  return { method: 'GET', path: `${path}${toQueryString({ includeArchived })}` }
}

export const residentContract = {
  list: (query: ResidentListQuery): ContractRequest => ({ method: 'GET', path: `/residents${toQueryString(query)}` }),
  detail: (id: string, includeArchived?: boolean): ContractRequest => detailRequest(`/residents/${id}`, includeArchived),
  create: (body: CreateResidentPayload): ContractRequest => ({ method: 'POST', path: '/residents', body }),
  update: (id: string, body: UpdateResidentPayload): ContractRequest => ({ method: 'PATCH', path: `/residents/${id}`, body }),
  archive: (id: string): ContractRequest => ({ method: 'POST', path: `/residents/${id}/archive` }),
  restore: (id: string): ContractRequest => ({ method: 'POST', path: `/residents/${id}/restore` }),
}

export const unitContract = {
  list: (query: UnitListQuery): ContractRequest => ({ method: 'GET', path: `/units${toQueryString(query)}` }),
  detail: (id: string, includeArchived?: boolean): ContractRequest => detailRequest(`/units/${id}`, includeArchived),
  create: (body: CreateUnitPayload): ContractRequest => ({ method: 'POST', path: '/units', body }),
  update: (id: string, body: UpdateUnitPayload): ContractRequest => ({ method: 'PATCH', path: `/units/${id}`, body }),
  archive: (id: string): ContractRequest => ({ method: 'POST', path: `/units/${id}/archive` }),
  restore: (id: string): ContractRequest => ({ method: 'POST', path: `/units/${id}/restore` }),
}

export const RESIDENT_RESPONSE_FIELDS = ['id', 'name', 'email', 'phone', 'active', 'archivedAt', 'unitId', 'unit', 'createdAt', 'updatedAt'] as const
export const UNIT_RESPONSE_FIELDS = ['id', 'code', 'address', 'parkingSpaces', 'active', 'archivedAt', 'createdAt', 'updatedAt'] as const

export const API_ERROR_MATRIX = [
  { status: 400, code: 'VALIDATION_ERROR', message: 'Validation failed', details: 'field-to-string-array map' },
  { status: 401, code: 'UNAUTHORIZED', message: 'Bearer token required or Invalid or expired token', details: {} },
  { status: 403, code: 'FORBIDDEN', message: 'Insufficient role', details: {} },
  { status: 404, code: 'NOT_FOUND', message: 'Resident not found or Unit not found', details: {} },
  { status: 409, code: 'CONFLICT', message: 'Email is already registered, Unit code is already registered, Unit must exist and be active, or Conflict', details: {} },
] as const

export const API_LIFECYCLE_MATRIX = {
  resident: 'archive deactivates resident and linked user; restore requires intact identity and active unit, then leaves both inactive',
  unit: 'archive and restore preserve active; archive rejects any retained resident or access-event dependency',
} as const

export function toQueryString(values: object) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}
