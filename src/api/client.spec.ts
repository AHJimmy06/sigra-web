import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, clearSession, logoutSession, restoreSession } from './client'

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

async function establishSession() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(
    { accessToken: 'old-access' },
    200,
    { 'X-CSRF-Token': 'csrf-one' },
  ))
  await api('/auth/login', { method: 'POST', body: '{}' })
  vi.mocked(fetch).mockReset()
}

describe('API client session lifecycle', () => {
  beforeEach(() => {
    clearSession()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('coordinates concurrent 401s through one refresh and replays each request once', async () => {
    await establishSession()
    let protectedCalls = 0
    let refreshCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input)
      if (path.endsWith('/auth/refresh')) {
        refreshCalls += 1
        expect(init?.credentials).toBe('include')
        expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('csrf-one')
        expect(new Headers(init?.headers).get('X-Refresh-Operation-Id')).toMatch(/^[0-9a-f-]{36}$/)
        return json({ accessToken: 'new-access' }, 200, { 'X-CSRF-Token': 'csrf-two' })
      }
      protectedCalls += 1
      const authorization = new Headers(init?.headers).get('Authorization')
      return authorization === 'Bearer new-access' ? json({ ok: true }) : json({ code: 'UNAUTHORIZED' }, 401)
    })

    await expect(Promise.all([api('/units', { retries: 0 }), api('/tickets', { retries: 0 })])).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(refreshCalls).toBe(1)
    expect(protectedCalls).toBe(4)
  })

  it('clears the session when the single refresh fails', async () => {
    await establishSession()
    const expired = vi.fn()
    window.addEventListener('sigra:session-expired', expired, { once: true })
    let refreshCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/auth/refresh')) refreshCalls += 1
      return json({ code: 'UNAUTHORIZED' }, 401)
    })

    await expect(Promise.allSettled([api('/units', { retries: 0 }), api('/tickets', { retries: 0 })])).resolves.toEqual([
      expect.objectContaining({ status: 'rejected' }),
      expect.objectContaining({ status: 'rejected' }),
    ])
    expect(refreshCalls).toBe(1)
    expect(expired).toHaveBeenCalledOnce()
  })

  it('rejects a malformed refresh success, clears credentials, and does not replay', async () => {
    await establishSession()
    let protectedCalls = 0
    let refreshCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshCalls += 1
        return json({ accessToken: '   ' }, 200, { 'X-CSRF-Token': 'csrf-two' })
      }
      protectedCalls += 1
      return json({ code: 'UNAUTHORIZED' }, 401)
    })

    await expect(api('/units', { retries: 0 })).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })
    expect(refreshCalls).toBe(1)
    expect(protectedCalls).toBe(1)
    expect(window.localStorage.getItem('sigra_csrf')).toBeNull()
  })

  it('bootstraps through refresh and then /auth/me', async () => {
    await establishSession()
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ accessToken: 'restored-access' }, 200, { 'X-CSRF-Token': 'csrf-two' }))
      .mockResolvedValueOnce(json({ sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN', residentId: null }))

    await expect(restoreSession()).resolves.toMatchObject({ email: 'admin@example.com', role: 'ADMIN' })
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/refresh$/)
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/me$/)
  })

  it('does not refresh a replay that also returns 401', async () => {
    await establishSession()
    let refreshCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshCalls += 1
        return json({ accessToken: 'new-access' }, 200, { 'X-CSRF-Token': 'csrf-two' })
      }
      return json({ code: 'UNAUTHORIZED' }, 401)
    })
    await expect(api('/units', { retries: 0 })).rejects.toMatchObject({ status: 401 })
    expect(refreshCalls).toBe(1)
  })

  it.each(['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'])(
    'never refreshes excluded endpoint %s',
    async (path) => {
      await establishSession()
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ code: 'UNAUTHORIZED' }, 401))
      await expect(api(path, { method: 'POST', retries: 0 })).rejects.toMatchObject({ status: 401 })
      expect(fetchMock).toHaveBeenCalledOnce()
    },
  )

  it('attempts credentialed remote logout and clears memory after network failure', async () => {
    await establishSession()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    await expect(logoutSession()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe('include')
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('X-CSRF-Token')).toBe('csrf-one')
    expect(window.localStorage.getItem('sigra_csrf')).toBeNull()
  })

  it.each([
    ['missing access token', {}, { 'X-CSRF-Token': 'csrf-one' }],
    ['blank access token', { accessToken: '   ' }, { 'X-CSRF-Token': 'csrf-one' }],
    ['missing CSRF token', { accessToken: 'new-access' }, {}],
  ])('rejects a malformed login success with %s and clears the existing session', async (_caseName, body, headers) => {
    await establishSession()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(body, 200, headers))

    await expect(api('/auth/login', { method: 'POST', body: '{}', retries: 0 })).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe('include')
    expect(window.localStorage.getItem('sigra_csrf')).toBeNull()
  })

  it('rejects invalid JSON from a login success and clears the existing session', async () => {
    await establishSession()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not JSON', {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-one' },
    }))

    await expect(api('/auth/login', { method: 'POST', body: '{}', retries: 0 })).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })
    expect(window.localStorage.getItem('sigra_csrf')).toBeNull()
  })

  it('never persists bearer access tokens', async () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem')
    await establishSession()
    expect(setItem.mock.calls).toEqual([['sigra_csrf', 'csrf-one']])
    expect([...Array(window.localStorage.length)].map((_, index) => window.localStorage.key(index))).not.toContain('sigra_token')
  })

  it('rejects stale cross-tab session successes after invalidation but accepts a newer lineage', async () => {
    class ControlledBroadcastChannel {
      static instances: ControlledBroadcastChannel[] = []
      messages: unknown[] = []
      private listener?: (event: MessageEvent) => void
      constructor(_name: string) { ControlledBroadcastChannel.instances.push(this) }
      addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listener = listener }
      postMessage(message: unknown) { this.messages.push(message) }
      deliver(message: unknown) { this.listener?.(new MessageEvent('message', { data: message })) }
      close() {}
    }
    vi.stubGlobal('BroadcastChannel', ControlledBroadcastChannel)
    vi.resetModules()
    const client = await import('./client')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(json({ accessToken: 'old-access' }, 200, { 'X-CSRF-Token': 'csrf-one' }))
    await client.api('/auth/login', { method: 'POST', body: '{}', retries: 0 })
    client.shareSession()
    const channel = ControlledBroadcastChannel.instances[0]
    const staleLineage = (channel.messages.find((message) => (message as { type?: string }).type === 'session-established') as { sessionLineage: string }).sessionLineage
    const updated = vi.fn()
    window.addEventListener('sigra:session-updated', updated)

    client.invalidateSession()
    channel.deliver({ type: 'session-established', result: { accessToken: 'stale-access', csrfToken: 'stale-csrf' }, sessionLineage: staleLineage })
    channel.deliver({ type: 'refresh-succeeded', operationId: 'stale-operation', result: { accessToken: 'stale-access', csrfToken: 'stale-csrf' }, expiresAt: Date.now() + 1_000, sessionLineage: staleLineage })

    expect(updated).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('sigra_csrf')).toBeNull()
    fetchMock.mockResolvedValueOnce(json({ ok: true }))
    await client.api('/units', { retries: 0 })
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('Authorization')).toBeNull()

    channel.deliver({ type: 'session-established', result: { accessToken: 'current-access', csrfToken: 'current-csrf' }, sessionLineage: 'new-session-lineage' })

    expect(updated).toHaveBeenCalledOnce()
    expect(window.localStorage.getItem('sigra_csrf')).toBe('current-csrf')
    fetchMock.mockResolvedValueOnce(json({ ok: true }))
    await client.api('/units', { retries: 0 })
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('Authorization')).toBe('Bearer current-access')
    window.removeEventListener('sigra:session-updated', updated)
    vi.unstubAllGlobals()
  })

  it('keeps credentials cleared when a retained pre-invalidation refresh result is replayed', async () => {
    class ControlledBroadcastChannel {
      static instances: ControlledBroadcastChannel[] = []
      messages: unknown[] = []
      private listener?: (event: MessageEvent) => void
      constructor(_name: string) { ControlledBroadcastChannel.instances.push(this) }
      addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listener = listener }
      postMessage(message: unknown) { this.messages.push(message) }
      deliver(message: unknown) { this.listener?.(new MessageEvent('message', { data: message })) }
      close() {}
    }
    vi.stubGlobal('BroadcastChannel', ControlledBroadcastChannel)
    vi.stubGlobal('indexedDB', undefined)
    vi.resetModules()
    const client = await import('./client')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(json({ accessToken: 'old-access' }, 200, { 'X-CSRF-Token': 'csrf-one' }))
    await client.api('/auth/login', { method: 'POST', body: '{}', retries: 0 })
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).endsWith('/auth/refresh')) {
        return json({ accessToken: 'refreshed-access' }, 200, { 'X-CSRF-Token': 'refreshed-csrf' })
      }
      return new Headers(init?.headers).get('Authorization') === 'Bearer refreshed-access'
        ? json({ ok: true })
        : json({ code: 'UNAUTHORIZED' }, 401)
    })
    await client.api('/units', { retries: 0 })

    const channel = ControlledBroadcastChannel.instances[0]
    const original = channel.messages.find((message) => (message as { type?: string }).type === 'refresh-succeeded') as {
      operationId: string
      sessionLineage: string
    }
    const updated = vi.fn()
    window.addEventListener('sigra:session-updated', updated)
    client.invalidateSession()
    channel.deliver({ type: 'refresh-result-request', operationId: original.operationId })
    const replay = channel.messages.at(-1) as { type: string; operationId: string; sessionLineage?: string; result: { accessToken: string; csrfToken: string } }

    expect(replay).toMatchObject({ type: 'refresh-succeeded', operationId: original.operationId, sessionLineage: original.sessionLineage })
    channel.deliver(replay)

    expect(updated).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('sigra_csrf')).toBeNull()
    fetchMock.mockResolvedValueOnce(json({ ok: true }))
    await client.api('/tickets', { retries: 0 })
    expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get('Authorization')).toBeNull()
    window.removeEventListener('sigra:session-updated', updated)
    vi.unstubAllGlobals()
  })
})

describe('API client transport behavior', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('retries safe GET requests after a network failure', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(json({ ok: true }))
    const result = api<{ ok: boolean }>('/health', { retries: 1 })
    await vi.runAllTimersAsync()
    await expect(result).resolves.toEqual({ ok: true })
  })

  it('honors caller cancellation without retrying', async () => {
    const controller = new AbortController()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
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

  it('returns a typed timeout when retries are disabled', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const result = expect(api('/tickets', { timeoutMs: 25, retries: 0 })).rejects.toMatchObject({ status: 0, code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(25)
    await result
  })

  it('accepts only status-compatible stable server codes', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ code: 'MADE_UP', message: 'Trust me' }, 403))
      .mockResolvedValueOnce(json({ code: 'CONFLICT', message: 'Conflict' }, 400))
      .mockResolvedValueOnce(json({ code: 'VALIDATION_ERROR', message: 'Validation failed' }, 400))
    await expect(api('/one', { retries: 0 })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(api('/two', { retries: 0 })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(api('/three', { retries: 0 })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('returns typed and sanitized server error metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({
      code: 'CONFLICT',
      message: 'Conflict',
      details: { email: ['Used'], leak: 'raw SQL' },
      requestId: 'request-123',
    }, 409))
    await expect(api('/residents', { retries: 0 })).rejects.toMatchObject({
      code: 'CONFLICT',
      details: { email: ['Used'] },
      requestId: 'request-123',
    })
  })

  it('sanitizes arbitrary server messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ code: 'CONFLICT', message: '<script>unsafe</script>', details: { email: ['Used'], leak: 'raw SQL' } }, 409))
    await expect(api('/residents', { retries: 0 })).rejects.toMatchObject({ message: 'La solicitud entra en conflicto con los datos existentes.', details: { email: ['Used'] } })
  })
})
