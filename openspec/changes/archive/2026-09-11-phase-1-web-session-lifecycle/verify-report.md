```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:45266f78b0461dd422cc634d2c863e74e9f86fee0224e0668b532e9603753f66
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 11/11
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:ac287d7358da0c2778623af249504cba66943862f7336c134a0e712077be18b4
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:f3e1ac4c5abccd0877c8222cb49727f1a6a65ea5ea1d98c7a16251b57ce9fbac
```

## Verification Report

**Change**: phase-1-web-session-lifecycle
**Version**: N/A
**Mode**: Standard (strict TDD disabled)
**Artifact store**: OpenSpec
**Branch / HEAD**: `phase-1-web-session-lifecycle/proof-provenance` / `787cf0886947f443018a2615b4fcf294043015f5`
**Runtime attempt token**: `sha256:d5d3f39eb50d37a0999b879023498e3b8ca4d33b860382262e4451e37552362c`
**Supersedes failed evidence revision**: `sha256:468d3d3a7df1b50b37b308469e86e32e25e98d4ad959f1b107ea2548c8dc767a`

The evidence revision is the SHA-256 digest of an ordered manifest containing the retrieved proposal, specification, design, tasks, apply progress, historical failed verify report, inspected implementation and test files, provenance/package files, all five current command outputs, the retained runtime attempt token, and remediation HEAD `787cf0886947f443018a2615b4fcf294043015f5`.

### Completeness

| Metric | Value |
|---|---:|
| Requirements total | 6 |
| Requirements fully compliant | 6 |
| Scenarios total | 11 |
| Scenarios compliant | 11 |
| Task checkboxes complete | 14/14 |
| Task claims independently substantiated | 14/14 |
| Incomplete tasks | 0 |

All 14 task checkboxes were complete before command execution, so full verification proceeded. Current runtime and source evidence independently substantiate the remediation and the complete Web-only task set.

### Build and Test Execution

| Command | Exit | Current result | Output hash |
|---|---:|---|---|
| `npx vitest run src/api/client.spec.ts src/auth/refreshCoordinator.spec.ts src/auth/AuthContext.spec.tsx src/App.spec.tsx` | 0 | 4 files passed; 52 tests passed | `sha256:c19f5c44d7ebc1da69fdd6a88133c10905bbb0c1c8d8d0202fdca19f150fc3f3` |
| `npm test` | 0 | 16 files passed; 101 tests passed | `sha256:ac287d7358da0c2778623af249504cba66943862f7336c134a0e712077be18b4` |
| `npm run lint` | 0 | Oxlint completed with no diagnostics | `sha256:874288b6208b63f06c7b680804bf7c4c3c5edd18e8b49b7c245c4fd2fdfc56fc` |
| `npm run build` | 0 | TypeScript and Vite build passed; Vite emitted a non-blocking large-chunk advisory | `sha256:f3e1ac4c5abccd0877c8222cb49727f1a6a65ea5ea1d98c7a16251b57ce9fbac` |
| `npm run validate` | 0 | Lint and build passed; Vite emitted the same advisory | `sha256:1499684f61ab34a9e638c690c4f1548dcb756afa0639ec51efab2c2e1cad85f7` |

**Coverage**: Not collected. No coverage command was included in the authoritative command set.

### Behavioral Evidence Boundary

Deterministic browser-API proof passed in Vitest/jsdom: `fake-indexeddb` executes the actual IndexedDB ownership path; controlled BroadcastChannel substitutes exercise operation matching, expiry, retained-result lineage, and stale-result rejection; storage-event/localStorage substitutes exercise secret-free degraded signaling and bounded lease takeover; fake timers prove lease and retained-result boundaries.

No real-browser multi-tab E2E harness exists. This report does not claim proof of real-browser scheduling, process isolation, or multi-tab end-to-end behavior.

### Spec Compliance Matrix

| Requirement | Scenario | Runtime test evidence | Static evidence | Result |
|---|---|---|---|---|
| Credential placement and session operations | Valid and malformed login | `client.spec.ts`: malformed field, invalid JSON, and memory-only bearer tests passed | `client.ts:14-19,124-137,262-269` keeps bearer in module state and validates nonblank access/CSRF | ✅ COMPLIANT |
| Credential placement and session operations | Credentialed refresh and logout | Credentialed concurrent refresh and failed remote logout tests passed | `client.ts:180-225,298-302` uses `credentials: 'include'`, CSRF, and no Web-readable refresh credential | ✅ COMPLIANT |
| Bounded unauthorized recovery | Concurrent unauthorized requests | `coordinates concurrent 401s through one refresh and replays each request once` passed | `client.ts:235-245` gates replay with `replayed`; coordinator preserves same-tab single flight | ✅ COMPLIANT |
| Bounded unauthorized recovery | Excluded or failed request | Excluded-endpoint table, refresh-failure, malformed-refresh, and replayed-401 tests passed | `client.ts:206-207,237-249` excludes auth/recovery paths and fails closed without a replay loop | ✅ COMPLIANT |
| Safe bootstrap and role routing | Reload restoration | Bootstrap ordering and protected-loading tests passed | `client.ts:285-295`, `AuthContext.tsx:33-42`, and `App.tsx:14-19` validate before protected rendering | ✅ COMPLIANT |
| Safe bootstrap and role routing | Logout or expiry races bootstrap | Bootstrap-after-logout and stale `/auth/me`-after-expiry tests passed | `AuthContext.tsx:12-32,44-65,94-97` advances identity generations and rejects stale commits | ✅ COMPLIANT |
| Cross-tab refresh ownership | IndexedDB owner and waiter | Actual `fake-indexeddb` owner/waiter and stale-owner replacement tests passed | `refreshCoordinator.ts:106-156,209-241` correlates operation ownership and checks owner/operation during atomic release | ✅ COMPLIANT |
| Cross-tab refresh ownership | Broadcast result fencing | Mismatched/expired result, retained-lineage replay, and pre-invalidation replay tests passed | `client.ts:108-117,147-178` and `refreshCoordinator.ts:41-74,186-207` fence lineage, operation ID, and expiry | ✅ COMPLIANT |
| Explicit degraded coordination and cleanup | Degraded fallback takeover | Bounded fallback takeover, secret-free event, and recovered-IndexedDB release tests passed | `refreshCoordinator.ts:89-103,158-184,186-235` preserves metadata-only degradation and backend-stable release | ✅ COMPLIANT |
| Explicit degraded coordination and cleanup | Failure cleanup | Refresh/logout/bootstrap/routing regressions plus both remediated non-bootstrap `/auth/me` rejection tests and shared client credential-removal test passed | `AuthContext.tsx:20-23,43-55,76-93` routes current event-driven and post-login identity failures through shared invalidation; `client.ts:147-155` clears bearer/CSRF, fences epoch/lineage, and requests ownership-safe release | ✅ COMPLIANT |
| Verification boundary | Reported verification scope | Focused and full suites passed; deterministic browser-API proof is reported separately from absent browser E2E | Proposal, specification, design, and this report explicitly preserve the limitation | ✅ COMPLIANT |

**Compliance summary**: 11/11 scenarios compliant and 6/6 requirements fully compliant.

### Independent Remediation Proof

1. `AuthContext.tsx:48-54` catches a current event-driven `/auth/me` rejection and calls the shared `invalidateSession(...)` boundary. The passing regression creates two pending identity generations, rejects the current request, observes exactly one shared client invalidation, then resolves the older request and proves identity remains signed out.
2. `AuthContext.tsx:76-93` catches a current post-login `/auth/me` rejection, calls the same shared boundary, rethrows, and does not publish the failed session. Its passing regression also resolves an older identity request afterward and proves no stale authenticated identity returns.
3. `AuthContext.tsx:20-23` combines client invalidation with local identity invalidation. `client.ts:147-155` rejects active lineage, advances the epoch, clears module bearer and persisted readable CSRF, requests `releaseOwnedRefresh()`, and emits expiry only when a session existed.
4. The passing client regression establishes a session, invokes shared invalidation, proves `sigra_csrf` is absent, and proves a subsequent request carries no old `Authorization` bearer header.
5. Ownership cleanup is safe rather than unconditional: `refreshCoordinator.ts:143-155,175-184,238-241` releases only the active lease through its acquisition backend and checks owner plus operation ID. Passing IndexedDB stale-owner and fallback-backend recovery tests prove a stale owner cannot delete replacement work and a fallback-owned lease remains releasable after IndexedDB recovers.

Together, current runtime evidence and source inspection close the historical defect: both direct non-bootstrap identity failure paths now remove authenticated UI, fence stale identity work, invoke client credential cleanup, and reach ownership-safe coordination release.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Credential placement and session operations | ✅ Implemented | Bearer remains module-only; readable persisted CSRF is limited to the CSRF contract; refresh credentials remain API-managed. |
| Bounded unauthorized recovery | ✅ Implemented | Recovery is centralized, excludes auth/recovery endpoints, shares refresh in-tab, and permits at most one replay. |
| Safe bootstrap and role routing | ✅ Implemented | Loading gates protected UI; identity generations fence stale work; ADMIN/GUARD denials redirect safely; unsupported roles invalidate. |
| Cross-tab refresh ownership | ✅ Implemented | IndexedDB execution, operation correlation, retained lineage, expiry checks, and ownership-safe release have passing deterministic proof. |
| Explicit degraded coordination and cleanup | ✅ Implemented | Both remediated `/auth/me` failures use shared invalidation; fallback semantics remain bounded and secret-free. |
| Verification boundary | ✅ Implemented | Deterministic substitutes and absent real-browser multi-tab E2E are explicitly separated. |

### Coherence (Design)

| Design decision | Followed? | Evidence |
|---|---|---|
| Fence identity work | ✅ Yes | Client epoch/lineage fences and AuthContext identity generations prevent stale completion. |
| Centralize cleanup | ✅ Yes | Refresh, bootstrap, logout, unsupported routing, and both non-bootstrap identity rejection paths reach shared invalidation. |
| Distinguish route outcomes | ✅ Yes | Supported-role denials redirect without session loss; unsupported identities invalidate and expose no protected UI. |
| Validate responses | ✅ Yes | Login/refresh require nonblank access token and CSRF response header. |
| Retain results safely | ✅ Yes | Credentials remain memory/transient-message data; persisted coordination records contain metadata only. |
| Preserve ownership and degradation | ✅ Yes | Same-tab single flight, owner/operation checks, backend-stable release, secret-free fallback, and bounded takeover remain intact. |

### Scope and Regression Boundaries

- Routing: ADMIN, GUARD, signed-out, and unsupported-role cases pass without changing the supported-role redirect contract.
- Replay: concurrent `401` requests share one refresh; excluded endpoints, failed refresh, and replayed `401` remain non-recursive.
- IndexedDB/fallback: actual deterministic IndexedDB execution, retained results, lineage, stale-owner protection, secret-free fallback, and timeout takeover pass.
- Credential placement: bearer remains module memory only; readable CSRF is cleared by invalidation; refresh credentials are not exposed to application state or storage.
- Lineage: stale direct broadcasts and retained pre-invalidation refresh results remain rejected, while a new lineage can establish a later valid session.
- Scope: no API, password-recovery, Mobile, or sibling-repository implementation claim is made.

### Issues Found

**CRITICAL**: None.

**WARNING**

1. No real-browser multi-tab E2E harness exists. The passing browser-API tests are deterministic substitutes, not real-browser E2E proof.
2. Vite reports a non-blocking JavaScript chunk larger than 500 kB after minification.
3. Coverage was not collected because it was outside the exact required command set.

**SUGGESTION**: None.

### Verdict

**PASS WITH WARNINGS**

All 6 requirements, 11 scenarios, and 14 tasks are substantiated by current source inspection and passing runtime evidence at remediation HEAD `787cf0886947f443018a2615b4fcf294043015f5`. The historical centralized-invalidation defect is closed without regression in routing, bounded replay, IndexedDB/fallback coordination, lineage fencing, or credential placement; only the explicit browser-E2E, chunk-size, and coverage limitations remain.
