export interface RefreshResult {
  accessToken: string
  csrfToken: string
}

interface Lease {
  key: 'refresh'
  owner: string
  operationId: string
  expiresAt: number
}

type SessionMessage =
  | { type: 'refresh-succeeded'; operationId: string; result: RefreshResult; expiresAt: number }
  | { type: 'refresh-failed'; operationId: string }
  | { type: 'refresh-result-request'; operationId: string }
  | { type: 'session-established'; result: RefreshResult }
  | { type: 'session-available' }
  | { type: 'session-ended' }

const CHANNEL_NAME = 'sigra-session'
const LEASE_KEY = 'sigra_refresh_lease'
const EVENT_KEY = 'sigra_session_event'
const LEASE_MS = 20_000
const RESULT_RETENTION_MS = 30_000
const owner = crypto.randomUUID()
let inFlight: Promise<RefreshResult> | null = null
let channel: BroadcastChannel | null = null
const listeners = new Set<(message: SessionMessage) => void>()
const retainedResults = new Map<string, { result: RefreshResult; expiresAt: number }>()

function dispatch(message: SessionMessage) {
  if (message.type === 'refresh-result-request') publishRetainedResult(message.operationId)
  for (const listener of listeners) listener(message)
}

function retainResult(operationId: string, result: RefreshResult) {
  const expiresAt = Date.now() + RESULT_RETENTION_MS
  retainedResults.set(operationId, { result, expiresAt })
  return expiresAt
}

function publishRetainedResult(operationId: string) {
  const retained = retainedResults.get(operationId)
  if (!retained || retained.expiresAt <= Date.now()) {
    retainedResults.delete(operationId)
    return
  }
  getChannel()?.postMessage({ type: 'refresh-succeeded', operationId, ...retained })
}

function getChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.addEventListener('message', (event: MessageEvent<SessionMessage>) => dispatch(event.data))
  return channel
}

function publish(message: SessionMessage) {
  const activeChannel = getChannel()
  if (activeChannel) {
    activeChannel.postMessage(message)
    return
  }
  const fallback = message.type === 'session-ended'
    ? message
    : message.type === 'session-established' || message.type === 'refresh-succeeded'
      ? { type: 'session-available' as const }
      : message
  localStorage.setItem(EVENT_KEY, JSON.stringify({ ...fallback, nonce: crypto.randomUUID() }))
  localStorage.removeItem(EVENT_KEY)
}

window.addEventListener('storage', (event) => {
  if (event.key !== EVENT_KEY || !event.newValue) return
  try {
    const message = JSON.parse(event.newValue) as SessionMessage
    dispatch(message)
  } catch { /* Ignore malformed same-origin coordination messages. */ }
})

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sigra-session-coordination', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('leases', { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function acquireIndexedDbLease(): Promise<{ acquired: boolean; lease: Lease }> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('leases', 'readwrite')
    const store = transaction.objectStore('leases')
    const request = store.get('refresh')
    let result: { acquired: boolean; lease: Lease } | undefined
    request.onsuccess = () => {
      const existing = request.result as Lease | undefined
      const now = Date.now()
      if (existing && existing.expiresAt > now) {
        result = { acquired: false, lease: existing }
        return
      }
      const lease: Lease = {
        key: 'refresh',
        owner,
        operationId: crypto.randomUUID(),
        expiresAt: now + LEASE_MS,
      }
      store.put(lease)
      result = { acquired: true, lease }
    }
    transaction.oncomplete = () => { database.close(); resolve(result!) }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
  })
}

async function releaseIndexedDbLease(lease: Lease): Promise<void> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('leases', 'readwrite')
    const store = transaction.objectStore('leases')
    const request = store.get('refresh')
    request.onsuccess = () => {
      const current = request.result as Lease | undefined
      if (current?.owner === owner && current.operationId === lease.operationId) store.delete('refresh')
    }
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
  })
}

async function acquireFallbackLease(): Promise<{ acquired: boolean; lease: Lease }> {
  const now = Date.now()
  let existing: Lease | undefined
  try { existing = JSON.parse(localStorage.getItem(LEASE_KEY) ?? '') as Lease } catch { existing = undefined }
  if (existing && existing.expiresAt > now) return { acquired: false, lease: existing }
  const lease: Lease = { key: 'refresh', owner, operationId: crypto.randomUUID(), expiresAt: now + LEASE_MS }
  localStorage.setItem(LEASE_KEY, JSON.stringify(lease))
  await new Promise((resolve) => window.setTimeout(resolve, 25))
  const current = JSON.parse(localStorage.getItem(LEASE_KEY) ?? 'null') as Lease | null
  return { acquired: current?.owner === owner, lease: current ?? lease }
}

async function acquireLease() {
  if (typeof indexedDB === 'undefined') return acquireFallbackLease()
  try { return await acquireIndexedDbLease() } catch { return acquireFallbackLease() }
}

async function releaseLease(lease: Lease) {
  if (typeof indexedDB !== 'undefined') {
    try {
      await releaseIndexedDbLease(lease)
      return
    } catch { /* Use the deterministic storage fallback below. */ }
  }
  try {
    const current = JSON.parse(localStorage.getItem(LEASE_KEY) ?? '') as Lease
    if (current.owner === owner && current.operationId === lease.operationId) localStorage.removeItem(LEASE_KEY)
  } catch { /* A malformed degraded lease is safely ignored. */ }
}

function waitForOwner(lease: Lease): Promise<RefreshResult | null> {
  if (!getChannel()) {
    return new Promise((resolve) => window.setTimeout(() => resolve(null), Math.max(0, lease.expiresAt - Date.now()) + 30))
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => { listeners.delete(handle); resolve(null) }, Math.max(0, lease.expiresAt - Date.now()) + 30)
    const handle = (message: SessionMessage) => {
      if (!('operationId' in message) || message.operationId !== lease.operationId) return
      if (message.type === 'refresh-succeeded' && message.expiresAt > Date.now()) {
        window.clearTimeout(timeout)
        listeners.delete(handle)
        resolve(message.result)
      } else if (message.type === 'refresh-failed') {
        window.clearTimeout(timeout)
        listeners.delete(handle)
        reject(new Error('Session refresh failed'))
      }
    }
    listeners.add(handle)
    publish({ type: 'refresh-result-request', operationId: lease.operationId })
  })
}

export function coordinateRefresh(refresh: (operationId: string) => Promise<RefreshResult>): Promise<RefreshResult> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    for (;;) {
      const { acquired, lease } = await acquireLease()
      if (!acquired) {
        const result = await waitForOwner(lease)
        if (result) return result
        continue
      }
      try {
        const result = await refresh(lease.operationId)
        const expiresAt = retainResult(lease.operationId, result)
        publish({ type: 'refresh-succeeded', operationId: lease.operationId, result, expiresAt })
        return result
      } catch (error) {
        publish({ type: 'refresh-failed', operationId: lease.operationId })
        throw error
      } finally {
        await releaseLease(lease)
      }
    }
  })().finally(() => { inFlight = null })
  return inFlight
}

export function subscribeToSessionMessages(listener: (message: SessionMessage) => void) {
  getChannel()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function publishSession(result: RefreshResult) { publish({ type: 'session-established', result }) }
export function publishLogout() { publish({ type: 'session-ended' }) }
