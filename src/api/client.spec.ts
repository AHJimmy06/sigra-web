import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

describe('API client', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('dispatches the central session-expired event for 401 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const expired = vi.fn()
    window.addEventListener('sigra:session-expired', expired)

    await expect(api('/auth/me', { retries: 0 })).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(expired).toHaveBeenCalledOnce()
  })

  it('retries safe GET requests after a network failure', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))

    const result = api<{ ok: boolean }>('/health', { retries: 1 })
    await vi.runAllTimersAsync()
    await expect(result).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('honors caller cancellation without retrying', async () => {
    const controller = new AbortController()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
    )
    const result = api('/units', { signal: controller.signal })
    controller.abort()
    await expect(result).rejects.toBeInstanceOf(DOMException)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('rejects an already-aborted request without invoking fetch', async () => {
    const controller = new AbortController()
    const reason = new DOMException('Cancelled before request', 'AbortError')
    controller.abort(reason)
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(api('/units', { signal: controller.signal })).rejects.toBe(reason)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a typed timeout without retrying when retries are disabled', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
    )

    const result = expect(api('/tickets', { timeoutMs: 25, retries: 0 })).rejects.toMatchObject({ status: 0, code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(25)
    await result
  })

  it('returns typed server error details for retry UI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'CONFLICT', message: 'Conflict', details: { email: ['Used'] } }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(api('/residents', { method: 'POST' })).rejects.toEqual(
      expect.objectContaining({ code: 'CONFLICT', details: { email: ['Used'] } }),
    )
  })
})
