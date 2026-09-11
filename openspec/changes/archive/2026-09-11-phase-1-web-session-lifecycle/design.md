# Design: Phase 1 Web Session Lifecycle Reconciliation

## Technical Approach

Preserve centralized one-replay recovery and ADMIN/GUARD routing while adding fail-closed invalidation, race fences, response validation, and deterministic coordinator proof. Only the Web slice of parent tasks 3.1–3.4 changes; API behavior and parent artifacts remain unchanged.

## Architecture Decisions

| Decision | Alternatives considered | Choice and rationale |
|---|---|---|
| Fence identity work | Abort only; React-only guard | Add `sessionEpoch` in `client.ts` and `identityGeneration` in `AuthContext.tsx`. Login, refresh, bootstrap, and `/auth/me` commit only when their captured fence matches. Cleanup and unmount advance fences, covering non-abortable promises. |
| Centralize cleanup | Per-call clearing; redirect only | One invalidation path clears bearer/CSRF, advances fences, atomically releases only this tab's owned coordination operation, clears identity, and records a safe session error. Refresh, bootstrap, `/auth/me`, logout, and routing/session failures use it; logout invalidates before awaiting its credentialed request. |
| Distinguish route outcomes | Treat every denial as expiry | A valid ADMIN or GUARD requesting a forbidden route is redirected to its permitted landing route without session loss. An unsupported/malformed authenticated role or inability to select a safe route is a routing/session failure: invalidate and render signed-out/error UI without protected content. |
| Validate responses | Truthy-field checks | One runtime validator requires non-empty login/refresh `accessToken` and `X-CSRF-Token`. Invalid JSON, shape, or headers trigger cleanup and `ApiError`. |
| Retain results safely | Persist bearer; broadcast once | Keep results in owner-tab memory for `RESULT_RETENTION_MS`; IndexedDB stores only metadata/status. Waiters request matching results and ignore unmatched/expired messages. BroadcastChannel may transiently carry bearer/CSRF, but storage never does. |
| Preserve ownership and degradation | Unconditional deletion; cross-tab exactly-once | IndexedDB completion/release uses one owner-and-operation-checked transaction. Module `inFlight` guarantees same-tab single flight. IndexedDB failure uses best-effort localStorage election; missing BroadcastChannel uses secret-free availability events. Timeout takeover may duplicate refresh. Operation IDs correlate/fence client coordination; correctness does not depend on server idempotency. The documented refresh header remains compatibility, not new API behavior. |

## Data Flow

    action ── fence ── coordinate/request ── validate ── fence match ── commit
       └── failure/logout/routing failure ── invalidate ── signed-out/error UI
                                               └── owned release

    waiter ── operation ID ── owner result; timeout/degradation ── possible takeover

## File Changes

| File | Action | Description |
|---|---|---|
| `src/api/client.ts` | Modify | Add fencing, strict validation, and shared cleanup; preserve credentials, exclusions, and one replay. |
| `src/auth/AuthContext.tsx` | Modify | Fence identity work and expose session-error state plus routing invalidation. |
| `src/auth/refreshCoordinator.ts` | Modify | Add retained results and ownership-safe completion/cancellation/release. |
| `src/App.tsx`, `src/pages/LoginPage.tsx` | Modify | Fail closed for unsupported identities; expose errors; preserve ordinary redirects. |
| `src/api/client.spec.ts`, `src/auth/AuthContext.spec.tsx`, `src/auth/refreshCoordinator.spec.ts`, `src/App.spec.tsx` | Modify | Add contract, race, cleanup, storage, fallback, and role-matrix regressions. |
| `package.json`, `package-lock.json` | Modify | Add test-only `fake-indexeddb`. |

## Interfaces / Contracts

`AuthContextValue` adds nullable session error and routing-failure invalidation. Coordinator messages add `refresh-result-request { operationId }`; results carry that correlation ID. Lease records contain owner, operation ID, expiries, and status, never credentials.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| API unit | Credentialed login/refresh/logout; malformed responses; bounded recovery | Assert `credentials: include` and CSRF; table-test all auth/recovery exclusions; prove failed refresh and replayed `401` never replay and clear state. |
| Auth unit | Bootstrap, `/auth/me`, logout, and races | Deferred promises prove logout and routing/session failure clear bearer/user, fence pending identity, safely release ownership, expose signed-out/error UI, and prevent restoration. |
| Coordinator integration | IndexedDB, retention, stale owners, matching, degradation | Use fresh `fake-indexeddb` factories, isolated module tabs, deterministic clocks, and fake channels; inspect atomic records and unmatched/expired results. |
| Routing | Full role/route matrix | ADMIN→admin allowed/guard denied; GUARD→guard allowed/admin denied; signed-out denied; unsupported role→cleanup/error. Ordinary denial preserves session. |
| E2E | Not available | Do not claim real-browser multi-tab coverage; report deterministic browser-API substitutes separately. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Application role routing | Applicable | Redirect supported-role denials; invalidate unsupported identities. | ADMIN, GUARD, signed-out, unsupported-role matrix. |
| Documentation-like paths | N/A — no classification/execution | None | None |
| Git repository selection | N/A — no Git execution | None | None |
| Commit state | N/A — no commit automation | None | None |
| Push state | N/A — no push automation | None | None |
| PR commands | N/A — no PR automation | None | None |

## Migration / Rollout

No migration or feature flag is required. Roll back only child commits in reverse order, leaving parent/API/recovery artifacts untouched. Run focused lifecycle tests, `npm test`, and `npm run validate` after apply or rollback.

## Open Questions

None.
