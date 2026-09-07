import type { PaginatedResponse } from '@/api/contracts'

export function isPaginatedResponse<T>(value: PaginatedResponse<T> | T[]): value is PaginatedResponse<T> {
  return !Array.isArray(value) && typeof value === 'object' && value !== null && Array.isArray(value.items) && typeof value.total === 'number' && typeof value.page === 'number' && typeof value.pageSize === 'number'
}

export function normalizeListResponse<T>(value: PaginatedResponse<T> | T[]): PaginatedResponse<T> {
  if (isPaginatedResponse(value)) return value
  return { items: value, total: value.length, page: 1, pageSize: Math.max(value.length, 1) }
}
