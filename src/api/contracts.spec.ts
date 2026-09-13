import { describe, expect, it } from 'vitest'
import {
  API_CONTRACT_SHA,
  API_ERROR_MATRIX,
  API_LIFECYCLE_MATRIX,
  RESIDENT_RESPONSE_FIELDS,
  UNIT_RESPONSE_FIELDS,
  residentContract,
  unitContract,
} from './contracts'

const residentId = '11111111-1111-4111-8111-111111111111'
const unitId = '22222222-2222-4222-8222-222222222222'

describe('Phase 2 resident and unit API contract', () => {
  it('pins the independently verified API commit and exact list/detail/action requests', () => {
    expect(API_CONTRACT_SHA).toBe('40be73f5aa067f3088da97cc506d2517be085e96')
    expect(residentContract.list({ page: 2, pageSize: 20, search: 'Ada Lovelace', status: false, unitId, includeArchived: true })).toEqual({ method: 'GET', path: `/residents?page=2&pageSize=20&search=Ada+Lovelace&status=false&unitId=${unitId}&includeArchived=true` })
    expect(unitContract.list({ page: 1, pageSize: 10, status: true, includeArchived: false })).toEqual({ method: 'GET', path: '/units?page=1&pageSize=10&status=true&includeArchived=false' })
    expect(residentContract.detail(residentId, true)).toEqual({ method: 'GET', path: `/residents/${residentId}?includeArchived=true` })
    expect(unitContract.detail(unitId)).toEqual({ method: 'GET', path: `/units/${unitId}` })
    expect([residentContract.archive(residentId), residentContract.restore(residentId), unitContract.archive(unitId), unitContract.restore(unitId)]).toEqual([
      { method: 'POST', path: `/residents/${residentId}/archive` }, { method: 'POST', path: `/residents/${residentId}/restore` },
      { method: 'POST', path: `/units/${unitId}/archive` }, { method: 'POST', path: `/units/${unitId}/restore` },
    ])
  })

  it('pins create and patch payloads without exposing credentials in response DTOs', () => {
    const resident = { name: 'Ada Lovelace', phone: '+1 555 010 1234', unitId, email: 'ada@example.test', password: 'password-123' }
    const unit = { code: 'A-101', address: '1 Analytical Engine Way', parkingSpaces: 3 }
    expect(residentContract.create(resident)).toEqual({ method: 'POST', path: '/residents', body: resident })
    expect(residentContract.update(residentId, { email: 'new@example.test', active: false })).toEqual({ method: 'PATCH', path: `/residents/${residentId}`, body: { email: 'new@example.test', active: false } })
    expect(unitContract.create(unit)).toEqual({ method: 'POST', path: '/units', body: unit })
    expect(unitContract.update(unitId, { code: 'a-102', active: true })).toEqual({ method: 'PATCH', path: `/units/${unitId}`, body: { code: 'a-102', active: true } })
    expect(RESIDENT_RESPONSE_FIELDS).toEqual(['id', 'name', 'email', 'phone', 'active', 'archivedAt', 'unitId', 'unit', 'createdAt', 'updatedAt'])
    expect(UNIT_RESPONSE_FIELDS).toEqual(['id', 'code', 'address', 'parkingSpaces', 'active', 'archivedAt', 'createdAt', 'updatedAt'])
    expect([...RESIDENT_RESPONSE_FIELDS, ...UNIT_RESPONSE_FIELDS]).not.toContain('password')
  })

  it('pins normalized 400, 401, 403, 404, and 409 error envelopes and lifecycle semantics', () => {
    expect(API_ERROR_MATRIX).toEqual([
      { status: 400, code: 'VALIDATION_ERROR', message: 'Validation failed', details: 'field-to-string-array map' },
      { status: 401, code: 'UNAUTHORIZED', message: 'Bearer token required or Invalid or expired token', details: {} },
      { status: 403, code: 'FORBIDDEN', message: 'Insufficient role', details: {} },
      { status: 404, code: 'NOT_FOUND', message: 'Resident not found or Unit not found', details: {} },
      { status: 409, code: 'CONFLICT', message: 'Email is already registered, Unit code is already registered, Unit must exist and be active, or Conflict', details: {} },
    ])
    expect(API_LIFECYCLE_MATRIX).toEqual({
      resident: 'archive deactivates resident and linked user; restore requires intact identity and active unit, then leaves both inactive',
      unit: 'archive and restore preserve active; archive rejects any retained resident or access-event dependency',
    })
  })
})
