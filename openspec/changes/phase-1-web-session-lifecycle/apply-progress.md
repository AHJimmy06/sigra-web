# Apply Progress: Phase 1 Web Session Lifecycle Reconciliation

## Work Unit 1: Credential Contract and Bounded Replay

**Mode**: Standard (strict TDD disabled)
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #1 targets the feature/tracker branch, never `main`.

### Completed Tasks

- [x] 1.1 Preserve proposal scope and map uncommitted Web diffs before editing.
- [x] 1.2 Add RED API-client tests for the credential contract, malformed responses, excluded `401` endpoints, bounded replay, cleanup, and memory-only bearer storage.
- [x] 2.1 (client-only subset) Reject malformed login/refresh success responses and clear session state. Epoch fencing and shared invalidation remain pending.

### Test-First Evidence

Before production changes, `npx vitest run src/api/client.spec.ts` produced 5 failing tests: malformed refresh success; missing login access token; blank login access token; missing login CSRF token; invalid JSON login success. The existing tests already covered credentialed refresh/logout, excluded endpoints, failed-refresh non-replay, one replay maximum, cleanup, and memory-only bearer storage.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/api/client.spec.ts`: passed — 1 file, 23 tests. |
| Runtime harness command/scenario | N/A — this is a deterministic API-client unit boundary; no browser E2E harness exists, and no browser E2E coverage is claimed. |
| Rollback boundary | Revert `src/api/client.ts` strict session-response validation, `src/api/client.spec.ts` malformed-response coverage, and this work-unit metadata without affecting API, recovery, Mobile, AuthContext, or coordinator behavior. |

### Verification

- `npx vitest run src/api/client.spec.ts`: passed — 1 file, 23 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.

### Remaining Work

- [ ] 1.3–1.5: Auth, routing, and coordinator RED cases.
- [ ] 2.1: Epoch fencing and shared invalidation.
- [ ] 2.2–2.3: Coordinator, AuthContext, and routing corrections.
- [ ] 3.1–3.4: Full verification, provenance, and chain completion.

### Scope and Deviations

None — this unit preserves existing credentialed requests, exclusions, bounded replay, and memory-only bearer behavior. It adds only strict malformed session-response validation required by the RED tests.

## Work Unit 2: IndexedDB Ownership and Degraded Fallback

**Mode**: Standard (strict TDD disabled)
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #2 targets the immediate PR #1 branch, never `main`.

### Completed Tasks

- [x] 1.5 Add RED coordinator cases for IndexedDB leases, retained results, fencing, stale owner release, and fallback takeover.
- [x] 2.2 Correct the coordinator with retained operation-correlated results and atomic owner/operation-checked release while preserving the secret-free fallback.

### Test-First Evidence

Before the coordinator correction, `npx vitest run src/auth/refreshCoordinator.spec.ts` failed three new cases: the real IndexedDB two-tab owner/waiter case timed out because a late waiter could not request an already-produced result; expired broadcast results were accepted; and the stale-owner replacement test could not establish the required fencing behavior. The RED tests exercise an isolated `fake-indexeddb` factory, operation-correlated result messages, matching and expiry fences, stale-owner release protection, and bounded localStorage takeover.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/auth/refreshCoordinator.spec.ts`: passed — 1 file, 8 tests. |
| Runtime harness command/scenario | N/A — deterministic `fake-indexeddb`, BroadcastChannel, and storage-event substitutes exercise browser API boundaries; no real-browser multi-tab E2E harness exists, and no E2E coverage is claimed. |
| Rollback boundary | Revert `src/auth/refreshCoordinator.ts`, `src/auth/refreshCoordinator.spec.ts`, `package.json`, `package-lock.json`, and these Unit 2 metadata entries. This removes coordinator ownership/result retention behavior without changing API, recovery, Mobile, AuthContext, routing, docs, or parent artifacts. |

### Verification

- `npx vitest run src/auth/refreshCoordinator.spec.ts`: passed — 1 file, 8 tests.
- `npx vitest run src/api/client.spec.ts`: passed — 1 file, 23 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.

### Degraded Guarantee

Same-tab single-flight remains guaranteed. Without IndexedDB or BroadcastChannel, cross-tab exactly-once refresh and result delivery are not guaranteed; a duplicate refresh may occur after the bounded lease timeout. The fallback stores only lease/event metadata and never persists bearer, CSRF, or refresh credentials.

### Remaining Work

- [ ] 1.3–1.4: Auth and routing RED cases.
- [ ] 2.1: Epoch fencing and shared invalidation.
- [ ] 2.3: AuthContext and routing corrections.
- [ ] 3.1–3.4: Full verification, provenance, and chain completion.

### Scope and Deviations

None — implementation matches the coordinator design. `fake-indexeddb` is added only as a test dependency to execute the actual IndexedDB path deterministically.

### Focused Correction: Work Unit 2 Lifecycle Defects

**Mode**: Standard (strict TDD disabled); test-first correction
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #2 targets the immediate PR #1 branch, never `main`.

#### Correction Evidence

1. **Bounded retained results**: A fake-timer test first showed that the coordinator exposed no lifecycle cleanup for retained owner-tab results. Retention now schedules one operation-scoped cleanup timer, replaces any prior timer for that operation, and removes both timer and result at expiry even when no waiter requests it. Matching and expiry checks remain unchanged.
2. **Backend-stable release**: A deterministic fallback-to-recovered-IndexedDB test first timed out under the prior release path because it attempted IndexedDB release for a lease acquired in localStorage. Acquisitions now carry their backend identity through release; localStorage leases are released with their original owner/operation fence even after IndexedDB recovers.

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/auth/refreshCoordinator.spec.ts`: passed — 1 file, 10 tests. |
| Runtime harness command/scenario | N/A — deterministic `fake-indexeddb`, BroadcastChannel, storage-event substitutes, and fake timers exercise the relevant browser API boundaries; no real-browser multi-tab E2E harness exists, and no E2E coverage is claimed. |
| Rollback boundary | Revert `src/auth/refreshCoordinator.ts`, `src/auth/refreshCoordinator.spec.ts`, and this correction metadata. This removes only timer-bounded retention and backend-stable lease release without affecting API, recovery, Mobile, AuthContext, routing, docs, or parent artifacts. |

#### Verification

- `npx vitest run src/auth/refreshCoordinator.spec.ts`: passed — 1 file, 10 tests.
- `npx vitest run src/api/client.spec.ts`: passed — 1 file, 23 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.

#### Task State

No task checkboxes changed: this is a focused correction to already-completed task 2.2 and does not claim completion for unrelated pending work.

## Work Unit 3: Auth Races, Cleanup, and Routing

**Mode**: Standard (strict TDD disabled; RED→GREEN followed)
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #3 targets the immediate PR #2 branch, never `main`.

### Completed Tasks

- [x] 1.3 Add RED AuthContext tests for logout/expiry races, stale `/auth/me`, bootstrap cleanup, and session-error visibility.
- [x] 1.4 Add the ADMIN/GUARD/signed-out/unsupported-role routing matrix tests.
- [x] 2.1 (remaining auth/routing subset) Add client epoch fencing and centralized invalidation with safe owned-coordination release.
- [x] 2.3 Add AuthContext identity generations, fail-closed session-error state, supported-role validation, and unsupported-role routing cleanup.

### Test-First Evidence

Before production changes, `npx vitest run src/auth/AuthContext.spec.tsx src/App.spec.tsx` failed the new bootstrap-after-logout, stale `/auth/me`-after-expiry, and bootstrap-error-visibility cases. The new role-matrix cases were added before production routing changes; existing tests already proved ADMIN and GUARD allowed/denied paths.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/auth/AuthContext.spec.tsx src/App.spec.tsx`: passed — 2 files, 13 tests. |
| Runtime harness command/scenario | N/A — Testing Library/jsdom deterministically exercises bootstrap, logout/expiry events, stale promise completion, and React Router role outcomes; no real-browser multi-tab E2E harness exists, and no E2E coverage is claimed. |
| Rollback boundary | Revert `src/api/client.ts`, `src/auth/refreshCoordinator.ts`, `src/auth/AuthContext.tsx`, `src/App.tsx`, their two focused specs, and these Unit 3 metadata entries. This removes race fencing and fail-closed routing without changing API, recovery, Mobile, parent artifacts, or the separate coordinator behavior. |

### Verification

- `npx vitest run src/auth/AuthContext.spec.tsx src/App.spec.tsx`: passed — 2 files, 13 tests.
- `npx vitest run src/api/client.spec.ts`: passed — 1 file, 23 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.

### Scope and Deviations

None — the implementation matches the design. `src/pages/LoginPage.tsx` did not require changes. The client calls an ownership-checked coordinator release on invalidation; the coordinator remains fail-safe because its normal `finally` release repeats the same owner/operation fence.

### Focused Correction: Work Unit 3 Cross-Tab Success Causal Fence

**Mode**: Standard (strict TDD disabled); test-first correction
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #3 targets the immediate PR #2 branch, never `main`.

#### Root Cause and Correction

`acceptSession` evaluated its default `sessionEpoch` when a coordination message was delivered, so a pre-invalidation `refresh-succeeded` or `session-established` message could pass the fence after invalidation. Session publication now carries a generated causal lineage. Invalidation records the active lineage as rejected; delivery accepts a success only when its lineage is not invalidated, then dispatches `sigra:session-updated`. A later establishment with a new lineage remains valid.

#### Test-First Evidence

Before production changes, `npx vitest run src/api/client.spec.ts` failed the new deterministic cross-tab test: two stale success messages each dispatched `sigra:session-updated` after invalidation. The test then proved GREEN by delivering both stale `session-established` and `refresh-succeeded` messages and asserting that bearer, CSRF, and update-event state remained invalidated, followed by a new-lineage establishment that restored the valid session.

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/api/client.spec.ts`: passed — 1 file, 24 tests. |
| Runtime harness command/scenario | N/A — the deterministic controlled `BroadcastChannel` substitute exercises message publication and delayed delivery; no real-browser multi-tab E2E harness exists, and no E2E coverage is claimed. |
| Rollback boundary | Revert `src/api/client.ts`, `src/auth/refreshCoordinator.ts`, `src/api/client.spec.ts`, and this correction metadata. This removes only cross-tab causal lineage fencing without affecting API, recovery, Mobile, parent artifacts, or unrelated documentation. |

#### Verification

- `npx vitest run src/api/client.spec.ts`: passed — 1 file, 24 tests.
- `npx vitest run src/auth/refreshCoordinator.spec.ts`: passed — 1 file, 10 tests.
- `npx vitest run src/auth/AuthContext.spec.tsx src/App.spec.tsx`: passed — 2 files, 13 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.

#### Task State

No task checkboxes changed: this is a focused correction to already-completed Work Unit 3 behavior and does not claim completion for unrelated pending tasks.

### Focused Correction: Retained Refresh-Result Causal Lineage

**Mode**: Standard (strict TDD disabled); test-first correction
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #3 targets the immediate PR #2 branch, never `main`.
**Authorization**: Maintainer-authorized additional correction after the standard gate budget was exhausted.
**Runtime attempt token**: `sha256:1f03ba334cbc04a2d793bf983136afea00d4699a52ffd7a828a7ac1886b83c73`

#### Root Cause and Correction

Retained owner-tab refresh results stored only the refresh result and expiry. A later `refresh-result-request` therefore republished `refresh-succeeded` without its original causal `sessionLineage`; after invalidation, the client treated that replay as a new acceptable lineage and could restore bearer/CSRF state and emit `sigra:session-updated`. Retained result storage now records the original lineage and `publishRetainedResult` republishes the complete stored message data.

#### Test-First Evidence

Before the production change, `npx vitest run src/auth/refreshCoordinator.spec.ts` failed because a retained replay lacked `sessionLineage`. The integrated `npx vitest run src/api/client.spec.ts` regression also failed before replay delivery: its retained pre-invalidation replay did not carry the original lineage. GREEN proves the replay carries that lineage; the client rejects it after invalidation, keeps bearer/CSRF cleared, and emits no `sigra:session-updated` event.

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/auth/refreshCoordinator.spec.ts`: passed — 1 file, 11 tests. `npx vitest run src/api/client.spec.ts`: passed — 1 file, 25 tests. |
| Runtime harness command/scenario | `npx vitest run src/api/client.spec.ts`: deterministic controlled BroadcastChannel integration invalidates a session, requests and delivers a retained pre-invalidation refresh result, and proves bearer/CSRF remain cleared with no `sigra:session-updated`; passed — 1 file, 25 tests. No real-browser multi-tab E2E harness exists or is claimed. |
| Rollback boundary | Revert `src/auth/refreshCoordinator.ts`, `src/auth/refreshCoordinator.spec.ts`, `src/api/client.spec.ts`, and this correction metadata. This removes only retained replay lineage preservation without changing API, recovery, Mobile, AuthContext, routing, docs, or parent artifacts. |

#### Verification

- `npx vitest run src/auth/refreshCoordinator.spec.ts`: passed — 1 file, 11 tests.
- `npx vitest run src/api/client.spec.ts`: passed — 1 file, 25 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.

#### Task State

No task checkboxes changed: this is a focused correction to completed coordinator/client lineage behavior and does not claim completion for unrelated pending tasks.
