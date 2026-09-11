# Tasks: Phase 1 Web Session Lifecycle Reconciliation

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 450–650 authored lines, including tests and metadata |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 → PR #2 → PR #3 → PR #4 |
| Delivery strategy | exception-ok |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Credential contract and bounded replay | PR #1; base = feature/tracker | `npx vitest run src/api/client.spec.ts` | N/A: deterministic unit boundary | `src/api/client.ts`, `src/api/client.spec.ts` |
| 2 | IndexedDB ownership and fallback | PR #2; base = PR #1 branch | `npx vitest run src/auth/refreshCoordinator.spec.ts` | N/A: no browser multi-tab E2E harness | `src/auth/refreshCoordinator.ts`, its spec, metadata |
| 3 | Auth races, cleanup, and routing | PR #3; base = PR #2 branch | `npx vitest run src/auth/AuthContext.spec.tsx src/App.spec.tsx` | N/A: jsdom substitute | `src/auth/AuthContext.tsx`, `src/App.tsx`, related specs |
| 4 | Full proof and provenance | PR #4; base = PR #3 branch | `npm test && npm run validate` | `npm run dev -- --host 127.0.0.1`; no API changes | `docs/backend-phase-1.md`, provenance edits |

## Phase 1: Test-First Contract Gaps

- [x] 1.1 Preserve `openspec/changes/phase-1-web-session-lifecycle/proposal.md` scope and map uncommitted Web diffs before editing.
- [x] 1.2 Add RED tests in `src/api/client.spec.ts` for credentialed operations, malformed responses, excluded 401s, one replay, cleanup, and memory-only bearer storage.
- [x] 1.3 Add RED tests in `src/auth/AuthContext.spec.tsx` for logout/expiry races, stale `/auth/me`, bootstrap cleanup, and session-error visibility.
- [x] 1.4 Add the threat-matrix RED role tests in `src/App.spec.tsx`: ADMIN allowed/guard denied, GUARD allowed/admin denied, signed-out denied, and unsupported role invalidation.
- [x] 1.5 Add RED coordinator cases in `src/auth/refreshCoordinator.spec.ts` for IndexedDB leases, retained results, fencing, and fallback takeover; add `fake-indexeddb` metadata if needed.

## Phase 2: Minimal Production Corrections

- [x] 2.1 Correct demonstrated gaps in `src/api/client.ts`: epoch fencing, strict validation, centralized invalidation, credentials, and bounded replay.
  - [x] Client-only contract subset: reject malformed login and refresh successes with session cleanup while preserving credentialed requests and one-replay behavior.
- [x] Epoch fencing and shared invalidation now clear credentials, fence pending client work, and release owned coordination for the auth/routing slice.
- [x] 2.2 Correct `src/auth/refreshCoordinator.ts` with operation-correlated results and atomic owner/operation-checked release while preserving secret-free fallback semantics.
- [x] 2.3 Correct `src/auth/AuthContext.tsx` and `src/App.tsx` (and `src/pages/LoginPage.tsx` only if required) for identity fencing, fail-closed state, safe redirects, and unsupported-role cleanup.

## Phase 3: Verification and Provenance

- [x] 3.1 Run `npx vitest run src/api/client.spec.ts src/auth/refreshCoordinator.spec.ts src/auth/AuthContext.spec.tsx src/App.spec.tsx` and resolve only failures attributable to this child.
- [x] 3.2 Run `npm test`, `npm run lint`, `npm run build`, and `npm run validate`; separate IndexedDB/fallback evidence from unavailable browser E2E proof.
- [x] 3.3 Update `docs/backend-phase-1.md` only to preserve accurate Web contract provenance and explicitly exclude API implementation ownership; do not edit API files or parent artifacts.
- [x] 3.4 Commit each work unit with a Conventional Commit message; keep tests with the behavior they prove, use feature/tracker → immediate-parent bases, and roll back child commits in reverse order.
