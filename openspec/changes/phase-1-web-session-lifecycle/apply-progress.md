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

## Work Unit 4: Full Proof and Provenance

**Mode**: Standard (strict TDD disabled)
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #4 targets the immediate PR #3 branch, never `main`.
**Runtime attempt token**: retained by the parent orchestrator as `sha256:78e5f2fac53113ff3eb9a28c288ea4972f5a09bac31290f0a7a77014baa7d045`.

### Partial Verification Evidence

| Command | Result |
|---|---|
| `npx vitest run src/api/client.spec.ts src/auth/refreshCoordinator.spec.ts src/auth/AuthContext.spec.tsx src/App.spec.tsx` | Passed — 4 files, 49 tests. |
| `npm test` | Passed — 16 files, 98 tests. |
| `npm run lint` | Passed — exit 0 with no diagnostics. |
| `npm run build` | Failed — TypeScript rejected pre-existing child implementation/test typing: three `sessionLineage` arguments infer `string` where `crypto.randomUUID()` infers a UUID template literal; the coordinator spec uses a non-UUID literal; `Shell.spec.tsx` mock contexts omit `sessionError` and `invalidateSession`. |
| `npm run validate` | Failed — lint passed, then the same `npm run build` TypeScript errors stopped validation. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/api/client.spec.ts src/auth/refreshCoordinator.spec.ts src/auth/AuthContext.spec.tsx src/App.spec.tsx`: passed — 4 files, 49 tests. |
| Runtime harness command/scenario | N/A — no real-browser multi-tab E2E harness exists. Deterministic `fake-indexeddb`, controlled BroadcastChannel, storage-event, and fake-timer tests prove the IndexedDB and fallback coordination boundary separately; they do not claim real-browser multi-tab E2E coverage. |
| Rollback boundary | Revert the uncommitted `docs/backend-phase-1.md` provenance section and this Work Unit 4 progress entry. No API files, API behavior, parent artifacts, or prior child implementation commits are included. |

### Documentation Draft

`docs/backend-phase-1.md` has an uncommitted Web-only provenance update that documents memory-only bearer placement, API-managed `HttpOnly` refresh cookies, readable CSRF placement, credentialed requests, IndexedDB/fallback degradation, and the absent browser multi-tab E2E harness. It explicitly excludes API implementation ownership.

### Task State

Tasks 3.1–3.4 remain unchecked. Required build and validation commands failed, so this work unit is partial and no documentation/metadata commit was created.

### Focused Remediation: TypeScript Build Proof

**Mode**: Standard (strict TDD disabled)
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #4 targets the immediate PR #3 branch, never `main`.
**Runtime attempt token**: retained by the parent orchestrator as `sha256:717d8fb940e2ad9fe525d4a85181ab16de8218a3c105a1d4d8dd4d6457fa061f`.
**Failed evidence revision binding**: `sha256:a5afb23b8c17c416ef431e43468f4482c82dd1a689acb7defec0bc64ec276f43`.

#### Root Cause and Correction

TypeScript inferred `crypto.randomUUID()` as a UUID template literal while client lineage state and coordinator message fields were widened to `string`. The remediation retains the UUID template type through the client and coordinator contracts and uses a real `crypto.randomUUID()` lineage in the coordinator test. It also updates stale Shell AuthContext mocks with the required `sessionError` and `invalidateSession` fields. Runtime UUID generation remains unchanged.

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/api/client.spec.ts src/auth/refreshCoordinator.spec.ts src/auth/AuthContext.spec.tsx src/App.spec.tsx`: passed — 4 files, 49 tests. |
| Runtime harness command/scenario | N/A — no real-browser multi-tab E2E harness exists. Deterministic `fake-indexeddb`, controlled BroadcastChannel, storage-event, and fake-timer tests prove the IndexedDB and fallback coordination boundary separately; they do not claim real-browser multi-tab E2E coverage. |
| Rollback boundary | Revert this remediation's UUID-template propagation in `src/api/client.ts` and `src/auth/refreshCoordinator.ts`, the coordinator and Shell test updates, `docs/backend-phase-1.md`, and the Phase 3 task/progress metadata. This does not alter API files, API behavior, parent artifacts, or previous child implementation commits. |

#### Required Verification

- `npx vitest run src/api/client.spec.ts src/auth/refreshCoordinator.spec.ts src/auth/AuthContext.spec.tsx src/App.spec.tsx`: passed — 4 files, 49 tests.
- `npm test`: passed — 16 files, 98 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.
- `npm run build`: passed — exit 0. Vite reports the pre-existing large-chunk advisory only.
- `npm run validate`: passed — exit 0. Vite reports the same non-blocking large-chunk advisory only.

#### Provenance Boundary

The existing `docs/backend-phase-1.md` Web-only provenance draft is preserved. It documents the deterministic IndexedDB/fallback boundary and the absence of a browser multi-tab E2E harness without claiming browser E2E coverage. It explicitly excludes API implementation ownership. `openspec/changes/phase-1-identity-security/` remains untouched and untracked.

#### Task State

- [x] 3.1 Focused lifecycle verification passed after correcting only the proven TypeScript failures.
- [x] 3.2 Full tests, lint, production build, and validation passed; deterministic coordination proof remains distinct from unavailable browser E2E.
- [x] 3.3 Web-only provenance documentation is preserved with API ownership explicitly excluded.
- [x] 3.4 The remediation, documentation, test mocks, tasks, and progress evidence are committed with a Conventional Commit message.

## Focused Remediation: Non-Bootstrap Identity Failure Cleanup

**Mode**: Standard (strict TDD disabled); RED→GREEN defect correction
**Delivery strategy**: `exception-ok` (maintainer-approved size exception)
**Chain strategy**: `feature-branch-chain`
**Intended PR boundary**: Child PR #4 targets the immediate PR #3 branch, never `main`.
**Runtime attempt token**: retained by the parent orchestrator as `sha256:4194e9700974e76b8f8db9c6f78341f9ab4bc099ed6d26b9d4b5ed62920fda43`.
**Failed evidence revision binding**: `sha256:468d3d3a7df1b50b37b308469e86e32e25e98d4ad959f1b107ea2548c8dc767a`.

### Root Cause and Correction

The event-driven `/auth/me` rejection cleared only React state, and the post-login `/auth/me` rejection had no cleanup. Both now call the existing `invalidateSession` boundary when their captured identity generation is current. That boundary invalidates client bearer/CSRF, fences epoch and lineage state, requests owned coordination release, and clears the React identity with the signed-out error outcome.

### RED→GREEN Evidence

Before the production correction, `npx vitest run src/auth/AuthContext.spec.tsx src/api/client.spec.ts` failed both new AuthContext regressions because the shared client `invalidateSession` mock had zero calls. GREEN passes both rejection paths: each invokes that boundary, removes authenticated UI, and rejects a separately pending stale `/auth/me` completion. The minimal client-level observable regression establishes a session, calls shared invalidation, then proves readable CSRF is absent and a subsequent request has no old bearer authorization header.

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npx vitest run src/auth/AuthContext.spec.tsx src/api/client.spec.ts`: passed — 2 files, 35 tests. |
| Runtime harness command/scenario | `npx vitest run src/auth/AuthContext.spec.tsx src/api/client.spec.ts`: Testing Library/jsdom drives event-driven and post-login `/auth/me` rejections with deferred stale identity completions; the client test observes cleared CSRF and no bearer header after shared invalidation. Passed — 2 files, 35 tests. No real-browser multi-tab E2E harness exists or is claimed. |
| Rollback boundary | Revert `src/auth/AuthContext.tsx`, `src/auth/AuthContext.spec.tsx`, `src/api/client.spec.ts`, and this remediation entry. This removes only non-bootstrap identity rejection cleanup and its proof; it does not alter coordinator algorithms, routing, API, recovery, Mobile, parent artifacts, or `openspec/changes/phase-1-identity-security/`. |

### Required Verification

- `npx vitest run src/auth/AuthContext.spec.tsx src/api/client.spec.ts`: passed — 2 files, 35 tests.
- `npx vitest run src/api/client.spec.ts src/auth/refreshCoordinator.spec.ts src/auth/AuthContext.spec.tsx src/App.spec.tsx`: passed — 4 files, 52 tests.
- `npm test`: passed — 16 files, 101 tests.
- `npm run lint`: passed — exit 0 with no diagnostics.
- `npm run build`: passed — exit 0; Vite emitted only the existing non-blocking large-chunk advisory.
- `npm run validate`: passed — exit 0; Vite emitted the same non-blocking large-chunk advisory.

### Task State

No task checkboxes changed: this remediation corrects failed evidence for already-complete centralized invalidation behavior and preserves the historical failed verify report.
