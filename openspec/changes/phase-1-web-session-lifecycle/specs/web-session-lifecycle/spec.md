# Web Session Lifecycle Specification

## Purpose

Define the Web-only session client for the Phase 1 contract. This child supersedes only the parent Web execution slice (tasks 3.1–3.4) and preserves the parent umbrella as provenance. It does not specify API, password recovery, Mobile, or sibling-repository behavior.

## Requirements

### Requirement: Credential placement and session operations

The Web MUST keep bearer access tokens only in module memory. Refresh credentials MUST be managed only by the API in an HttpOnly cookie. A readable persisted CSRF value MAY exist for the documented API contract, but MUST NOT be treated or described as an authentication credential; its use is limited to the CSRF contract. Login, refresh, and logout MUST be credentialed requests, and malformed success responses MUST be rejected.

#### Scenario: Valid and malformed login
- GIVEN valid login credentials and a response containing the required access token and CSRF contract
- WHEN login completes
- THEN the Web stores only the bearer in memory and establishes the authenticated state
- AND a missing or unusable required field rejects the response and leaves the Web signed out

#### Scenario: Credentialed refresh and logout
- GIVEN an API-managed refresh cookie and a readable CSRF value when required
- WHEN refresh or logout is requested
- THEN the request includes browser credentials and the required CSRF contract
- AND no refresh credential is exposed to Web-readable storage or application state

### Requirement: Bounded unauthorized recovery

The Web MUST centrally handle protected-request `401` responses with at most one refresh-and-replay per original request. Authentication, recovery, and other explicitly excluded auth endpoints MUST NOT trigger this recovery. Failed refresh MUST reject the original request rather than replaying indefinitely.

#### Scenario: Concurrent unauthorized requests
- GIVEN multiple protected requests receive `401` responses concurrently
- WHEN recovery is initiated
- THEN one in-tab refresh result is shared and each eligible original request is replayed at most once

#### Scenario: Excluded or failed request
- GIVEN a request targets an excluded auth/recovery endpoint or refresh fails
- WHEN the request receives `401`
- THEN no recovery replay occurs and the request remains rejected

### Requirement: Safe bootstrap and role routing

The Web MUST bootstrap without briefly exposing protected content, validate restored identity through `/auth/me`, and clear authentication when restoration or identity validation fails. Only supported authenticated roles, including ADMIN and GUARD, MAY enter their permitted routes; signed-out and forbidden navigation MUST remain denied.

#### Scenario: Reload restoration
- GIVEN a reload with an API-managed session cookie
- WHEN bootstrap performs refresh followed by `/auth/me`
- THEN protected content remains in a loading state until validation completes
- AND only a validated supported identity is routed to permitted content

#### Scenario: Logout or expiry races bootstrap
- GIVEN bootstrap or `/auth/me` is still pending
- WHEN logout or expiry invalidates the session
- THEN late completion MUST NOT restore the prior identity or protected route

### Requirement: Cross-tab refresh ownership

Cross-tab coordination MUST use an actual IndexedDB execution path when available. A lease owner MUST retain an operation ID with the refresh result for the bounded retention period, and lease release MUST be atomic and ownership-checked so a stale owner cannot release a newer lease. BroadcastChannel MAY deliver in-memory refresh results to same-origin tabs, including bearer and readable CSRF values, but MUST NOT carry or persist the refresh credential.

#### Scenario: IndexedDB owner and waiter
- GIVEN two tabs concurrently require refresh and IndexedDB is available
- WHEN one tab acquires the lease
- THEN the other waits for the retained operation result or lease boundary instead of independently taking ownership
- AND the owner atomically releases only its own operation

#### Scenario: Broadcast result fencing
- GIVEN a waiter receives a BroadcastChannel result
- WHEN the result operation ID matches its retained request
- THEN it may use the in-memory result; unmatched or expired results MUST be ignored

### Requirement: Explicit degraded coordination and cleanup

If IndexedDB or BroadcastChannel is unavailable, the Web MUST use the documented degraded fallback: same-tab single-flight remains guaranteed, but cross-tab exactly-once refresh and result delivery are not guaranteed; a refresh MAY repeat after lease timeout. Every refresh, logout, bootstrap, and routing failure MUST clear bearer state, invalidate pending identity work, release owned coordination state safely, and expose a signed-out/error outcome without stale authenticated UI.

#### Scenario: Degraded fallback takeover
- GIVEN cross-tab messaging or IndexedDB is unavailable
- WHEN a waiting tab reaches the bounded lease timeout
- THEN it MAY take over and refresh, and the resulting duplicate-refresh limitation is observable and documented

#### Scenario: Failure cleanup
- GIVEN refresh, logout, or `/auth/me` fails
- WHEN failure handling completes
- THEN memory credentials and authenticated identity are cleared, pending work is fenced, and protected navigation is denied

### Requirement: Verification boundary

The change MUST distinguish deterministic unit proof from browser behavior. Tests MUST exercise the IndexedDB path and fallback boundaries, but the project MUST NOT claim real browser multi-tab end-to-end coverage while no browser E2E harness exists.

#### Scenario: Reported verification scope
- GIVEN the focused and full test suites pass
- WHEN verification is reported
- THEN IndexedDB and fallback evidence is identified separately and the real multi-tab E2E limitation remains explicit
