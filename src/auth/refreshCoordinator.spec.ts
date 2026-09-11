import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

const DATABASE_NAME = 'sigra-session-coordination'

async function readLease(factory: IDBFactory) {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
    const transaction = database.transaction('leases', 'readonly')
    const request = transaction.objectStore('leases').get('refresh')
    request.onsuccess = () => resolve(request.result as Record<string, unknown> | undefined)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error)
  })
}

describe('cross-tab refresh coordination', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('recovers stale ownership with a new fenced operation ID', async () => {
    const operationId = '223e4567-e89b-42d3-a456-426614174000'
    window.localStorage.setItem('sigra_refresh_lease', JSON.stringify({ key: 'refresh', owner: 'closed-tab', operationId, expiresAt: Date.now() - 1 }))
    const { coordinateRefresh } = await import('./refreshCoordinator')
    const refresh = vi.fn().mockResolvedValue({ accessToken: 'memory-only', csrfToken: 'csrf' })

    await expect(coordinateRefresh(refresh)).resolves.toEqual({ accessToken: 'memory-only', csrfToken: 'csrf' })
    expect(refresh).toHaveBeenCalledWith(expect.any(String))
    expect(refresh).not.toHaveBeenCalledWith(operationId)
  })

  it('elects one refresh owner while another tab consumes the result', async () => {
    class SharedBroadcastChannel {
      static instances: SharedBroadcastChannel[] = []
      private listener?: (event: MessageEvent) => void
      constructor(_name: string) { SharedBroadcastChannel.instances.push(this) }
      addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listener = listener }
      postMessage(message: unknown) {
        for (const instance of SharedBroadcastChannel.instances) {
          if (instance !== this) instance.listener?.(new MessageEvent('message', { data: message }))
        }
      }
      close() {}
    }
    vi.stubGlobal('BroadcastChannel', SharedBroadcastChannel)
    const firstTab = await import('./refreshCoordinator')
    vi.resetModules()
    const secondTab = await import('./refreshCoordinator')
    const firstRefresh = vi.fn().mockResolvedValue({ accessToken: 'shared-result', csrfToken: 'csrf' })
    const secondRefresh = vi.fn().mockResolvedValue({ accessToken: 'unexpected', csrfToken: 'csrf' })

    const results = await Promise.all([
      firstTab.coordinateRefresh(firstRefresh),
      secondTab.coordinateRefresh(secondRefresh),
    ])

    expect(results).toEqual([
      { accessToken: 'shared-result', csrfToken: 'csrf' },
      { accessToken: 'shared-result', csrfToken: 'csrf' },
    ])
    expect(firstRefresh).toHaveBeenCalledOnce()
    expect(secondRefresh).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('propagates session and logout messages without browser storage tokens', async () => {
    class FakeBroadcastChannel {
      static instances: FakeBroadcastChannel[] = []
      private listener?: (event: MessageEvent) => void
      constructor(_name: string) { FakeBroadcastChannel.instances.push(this) }
      addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listener = listener }
      postMessage(message: unknown) { this.listener?.(new MessageEvent('message', { data: message })) }
      close() {}
    }
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
    const { publishLogout, publishSession, subscribeToSessionMessages } = await import('./refreshCoordinator')
    const listener = vi.fn()
    subscribeToSessionMessages(listener)
    publishSession({ accessToken: 'memory-only', csrfToken: 'csrf' })
    publishLogout()

    expect(listener).toHaveBeenCalledTimes(2)
    expect(window.localStorage.getItem('sigra_token')).toBeNull()
    vi.unstubAllGlobals()
  })

  it('uses a secret-free storage event fallback when BroadcastChannel is unavailable', async () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    const setItem = vi.spyOn(window.localStorage, 'setItem')
    const { publishSession } = await import('./refreshCoordinator')
    publishSession({ accessToken: 'must-not-be-persisted', csrfToken: 'must-not-be-persisted' })

    expect(setItem).toHaveBeenCalledWith('sigra_session_event', expect.stringContaining('session-available'))
    expect(setItem.mock.calls.flat().join(' ')).not.toContain('must-not-be-persisted')
    vi.unstubAllGlobals()
  })

  it('executes IndexedDB ownership and retains an operation-correlated result for a waiter', async () => {
    const indexedDb = new IDBFactory()
    vi.stubGlobal('indexedDB', indexedDb)

    class SharedBroadcastChannel {
      static instances: SharedBroadcastChannel[] = []
      private listener?: (event: MessageEvent) => void
      constructor(_name: string) { SharedBroadcastChannel.instances.push(this) }
      addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listener = listener }
      postMessage(message: unknown) {
        for (const instance of SharedBroadcastChannel.instances) {
          if (instance !== this) instance.listener?.(new MessageEvent('message', { data: message }))
        }
      }
      close() {}
    }
    vi.stubGlobal('BroadcastChannel', SharedBroadcastChannel)
    const firstTab = await import('./refreshCoordinator')
    vi.resetModules()
    const secondTab = await import('./refreshCoordinator')
    const firstRefresh = vi.fn().mockResolvedValue({ accessToken: 'indexeddb-result', csrfToken: 'csrf' })
    const secondRefresh = vi.fn().mockResolvedValue({ accessToken: 'unexpected', csrfToken: 'csrf' })

    await expect(Promise.all([
      firstTab.coordinateRefresh(firstRefresh),
      secondTab.coordinateRefresh(secondRefresh),
    ])).resolves.toEqual([
      { accessToken: 'indexeddb-result', csrfToken: 'csrf' },
      { accessToken: 'indexeddb-result', csrfToken: 'csrf' },
    ])

    expect(firstRefresh).toHaveBeenCalledOnce()
    expect(secondRefresh).not.toHaveBeenCalled()
    expect(await readLease(indexedDb)).toBeUndefined()
  })

  it('ignores expired and operation-mismatched broadcast results while waiting for its lease', async () => {
    const indexedDb = new IDBFactory()
    vi.stubGlobal('indexedDB', indexedDb)
    let now = 10_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    class ControlledBroadcastChannel {
      static instances: ControlledBroadcastChannel[] = []
      private listener?: (event: MessageEvent) => void
      constructor(_name: string) { ControlledBroadcastChannel.instances.push(this) }
      addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listener = listener }
      postMessage(_message: unknown) {}
      deliver(message: unknown) { this.listener?.(new MessageEvent('message', { data: message })) }
      close() {}
    }
    vi.stubGlobal('BroadcastChannel', ControlledBroadcastChannel)
    const database = indexedDb.open(DATABASE_NAME, 1)
    await new Promise<void>((resolve, reject) => {
      database.onupgradeneeded = () => database.result.createObjectStore('leases', { keyPath: 'key' })
      database.onsuccess = () => {
        const transaction = database.result.transaction('leases', 'readwrite')
        transaction.objectStore('leases').put({ key: 'refresh', owner: 'other-tab', operationId: 'current-operation', expiresAt: now + 1_000 })
        transaction.oncomplete = () => { database.result.close(); resolve() }
      }
      database.onerror = () => reject(database.error)
    })
    const { coordinateRefresh } = await import('./refreshCoordinator')
    const refresh = vi.fn().mockResolvedValue({ accessToken: 'unexpected', csrfToken: 'csrf' })
    const waiting = coordinateRefresh(refresh)
    await new Promise((resolve) => window.setTimeout(resolve, 10))

    const channel = ControlledBroadcastChannel.instances[0]
    channel.deliver({ type: 'refresh-succeeded', operationId: 'wrong-operation', result: { accessToken: 'wrong', csrfToken: 'csrf' }, expiresAt: now + 500 })
    channel.deliver({ type: 'refresh-succeeded', operationId: 'current-operation', result: { accessToken: 'expired', csrfToken: 'csrf' }, expiresAt: now - 1 })
    channel.deliver({ type: 'refresh-succeeded', operationId: 'current-operation', result: { accessToken: 'retained', csrfToken: 'csrf' }, expiresAt: now + 500 })

    await expect(waiting).resolves.toEqual({ accessToken: 'retained', csrfToken: 'csrf' })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('does not let a stale IndexedDB owner release a replacement operation', async () => {
    const indexedDb = new IDBFactory()
    vi.stubGlobal('indexedDB', indexedDb)
    vi.stubGlobal('BroadcastChannel', undefined)
    let now = 10_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    let resolveFirst!: (result: { accessToken: string; csrfToken: string }) => void
    let resolveSecond!: (result: { accessToken: string; csrfToken: string }) => void
    const firstTab = await import('./refreshCoordinator')
    const first = firstTab.coordinateRefresh(() => new Promise((resolve) => { resolveFirst = resolve }))
    await new Promise((resolve) => window.setTimeout(resolve, 10))
    const staleOperation = await readLease(indexedDb)
    now += 20_001
    vi.resetModules()
    const secondTab = await import('./refreshCoordinator')
    const second = secondTab.coordinateRefresh(() => new Promise((resolve) => { resolveSecond = resolve }))
    await new Promise((resolve) => window.setTimeout(resolve, 10))

    resolveFirst({ accessToken: 'stale-owner', csrfToken: 'csrf' })
    await expect(first).resolves.toEqual({ accessToken: 'stale-owner', csrfToken: 'csrf' })
    const replacement = await readLease(indexedDb)
    expect(replacement).toMatchObject({ operationId: expect.any(String) })
    expect(replacement?.operationId).not.toEqual(staleOperation?.operationId)

    resolveSecond({ accessToken: 'replacement-owner', csrfToken: 'csrf' })
    await expect(second).resolves.toEqual({ accessToken: 'replacement-owner', csrfToken: 'csrf' })
  })

  it('allows bounded fallback takeover after the lease expiry without promising cross-tab exactly-once', async () => {
    vi.stubGlobal('indexedDB', undefined)
    vi.stubGlobal('BroadcastChannel', undefined)
    vi.useFakeTimers()
    window.localStorage.setItem('sigra_refresh_lease', JSON.stringify({
      key: 'refresh',
      owner: 'closed-tab',
      operationId: 'expired-operation',
      expiresAt: Date.now() + 20,
    }))
    const { coordinateRefresh } = await import('./refreshCoordinator')
    const refresh = vi.fn().mockResolvedValue({ accessToken: 'fallback-result', csrfToken: 'csrf' })
    const result = coordinateRefresh(refresh)

    await vi.advanceTimersByTimeAsync(20_055)
    await expect(result).resolves.toEqual({ accessToken: 'fallback-result', csrfToken: 'csrf' })
    expect(refresh).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('removes expired retained results with a bounded timer even without another request', async () => {
    vi.stubGlobal('indexedDB', undefined)
    vi.stubGlobal('BroadcastChannel', undefined)
    vi.useFakeTimers()
    const { __refreshCoordinatorTesting, coordinateRefresh } = await import('./refreshCoordinator')
    const refresh = vi.fn().mockResolvedValue({ accessToken: 'retained-result', csrfToken: 'csrf' })
    const result = coordinateRefresh(refresh)

    await vi.advanceTimersByTimeAsync(25)
    await vi.advanceTimersByTimeAsync(25)
    await expect(result).resolves.toEqual({ accessToken: 'retained-result', csrfToken: 'csrf' })
    expect(__refreshCoordinatorTesting.retainedResultCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(30_000)

    expect(__refreshCoordinatorTesting.retainedResultCount()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })

  it('releases a fallback lease through localStorage after IndexedDB recovers', async () => {
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('IndexedDB unavailable') } })
    vi.stubGlobal('BroadcastChannel', undefined)
    vi.useFakeTimers()
    let resolveRefresh!: (result: { accessToken: string; csrfToken: string }) => void
    const { coordinateRefresh } = await import('./refreshCoordinator')
    const result = coordinateRefresh(() => new Promise((resolve) => { resolveRefresh = resolve }))

    await vi.advanceTimersByTimeAsync(25)
    await vi.advanceTimersByTimeAsync(25)
    expect(window.localStorage.getItem('sigra_refresh_lease')).not.toBeNull()
    vi.stubGlobal('indexedDB', new IDBFactory())
    resolveRefresh({ accessToken: 'fallback-result', csrfToken: 'csrf' })

    await expect(result).resolves.toEqual({ accessToken: 'fallback-result', csrfToken: 'csrf' })
    expect(window.localStorage.getItem('sigra_refresh_lease')).toBeNull()
    vi.useRealTimers()
  })

  it('replays a retained refresh result with its original session lineage', async () => {
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
    vi.stubGlobal('indexedDB', undefined)
    vi.stubGlobal('BroadcastChannel', ControlledBroadcastChannel)
    const { coordinateRefresh } = await import('./refreshCoordinator')
    const sessionLineage = crypto.randomUUID()

    await coordinateRefresh(
      vi.fn().mockResolvedValue({ accessToken: 'retained-access', csrfToken: 'retained-csrf' }),
      sessionLineage,
    )

    const channel = ControlledBroadcastChannel.instances[0]
    const original = channel.messages.find((message) => (message as { type?: string }).type === 'refresh-succeeded') as {
      operationId: string
      sessionLineage: string
    }
    channel.deliver({ type: 'refresh-result-request', operationId: original.operationId })
    const replay = channel.messages.at(-1) as { type: string; operationId: string; sessionLineage?: string }

    expect(replay).toMatchObject({
      type: 'refresh-succeeded',
      operationId: original.operationId,
      sessionLineage,
    })
    vi.unstubAllGlobals()
  })
})
