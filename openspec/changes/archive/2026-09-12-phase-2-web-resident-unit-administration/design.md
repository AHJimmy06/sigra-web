# Design: Phase 2 Web Resident and Unit Administration

## Technical Approach

Extend the page-local React design, centralize fixed contracts in `src/api/contracts.ts`, and keep requests on `api()`. Apply remains **fail-closed**: baseline `cd5394380b9b7bd8063da3e5c76bdbf93cbbaf70` lacks Phase 2 contracts. Endpoint work and fixed-contract tests require a real immutable API SHA recorded here and as `API_CONTRACT_SHA` in `src/api/contracts.spec.ts`; infer nothing.

## Architecture Decisions

| Decision | Alternatives considered | Choice and rationale |
|---|---|---|
| Contract ownership | Page-local types; guessed endpoints | Export pinned DTOs, errors, filters, and builders from `contracts.ts`; test drift without bypassing `api()`. |
| Authorization states | One generic error | Lists and detail use distinct `unauthorized` and `forbidden` states because authentication loss and denied permission have different recovery rules. |
| Async ownership | Abort only; shared busy flags | Every list, detail, and lifecycle request has `{generation, owner, controller}`; identity plus generation prevents obsolete continuations from committing. |
| Archive lifecycle | Alias inactive; optimistic updates | Keep both lifecycles orthogonal and server-confirmed; reload only after owned success. |

## Data Flow and State

```text
filter/route/dialog -> pinned builder -> api(signal) -> normalized result
       ^                    |              |
       +---- owned generation check -------+----> visible state/reload
```

List state is `loading | ready(items,total) | unauthorized(message) | forbidden(message) | error(message)`; detail adds ID-keyed `notFound`. `UNAUTHORIZED` renders normalized `ApiError.message` verbatim in `role="alert"`, has no retry, and leaves login navigation to canonical session expiry. `FORBIDDEN` renders its normalized message verbatim without retry. `NOT_FOUND` has no retry. Only general/network failures retry the same route ID or list query. Auth/error states retain no prior data.

Each lifecycle confirmation owns `{entityId, kind, generation, controller}`. Retry invalidates/aborts the prior attempt and repeats it. Cancel, close, supersession, and unmount abort and invalidate ownership. Current success closes/reloads; current failure keeps the dialog open, focuses/announces error, and preserves data. Stale success/failure changes no dialog, reload, alert, busy, list, detail, or pagination state.

## Archive Invariants

- Non-archived rows show archive; archived rows show restore. Activate is shown only when `active=false`; deactivate only when `active=true`, independently of archive state.
- Default queries exclude archives; only the explicit archive filter reveals them, separately from `status=true|false|omitted`.
- Resident archive deactivates the resident and linked user; restore requires an intact identity and active unit, then leaves both inactive. Unit archive/restore preserves code, prior `active`, and code reservation.
- Any API-reported dependency blocks unit archive. The focused normalized conflict is shown; no reassignment or related-resident deactivation is offered.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/api/contracts.ts`, `src/api/contracts.spec.ts` | Modify/Create | Pinned DTO/query/endpoint/payload/error matrix and exact tests. |
| `src/App.tsx`, `src/App.spec.tsx` | Modify | Protected `/residents/:residentId` route and role/navigation proof. |
| `src/pages/ResidentDetailPage.tsx`, `src/pages/ResidentDetailPage.spec.tsx` | Create | Detail/auth/lifecycle state machine and race proof. |
| `src/pages/ResidentsPage.tsx`, `src/pages/ResidentsPage.spec.tsx` | Modify | Archive filter/actions, bounded options, ownership and accessibility. |
| `src/pages/UnitsPage.tsx`, `src/pages/UnitsPage.spec.tsx` | Modify | Archive lifecycle, dependencies, ownership and accessibility. |

## Interfaces / Contracts and Proof

After the SHA gate opens, a fixture records exact list/detail/action paths, methods, create/edit/lifecycle payloads, archive/status/search/unit/page queries, DTO fields, and normalized status/code/message/details. Tests assert exact calls, server `items`/`total` without local filtering, list/detail 401 versus 403 and retry rules, identity conflicts, all archive invariants, stale actions, and canonical `api()`. Password is write-only at creation and MUST NOT appear in response DTOs, detail, errors, logs, or snapshots.

Forms reuse `FieldFeedback`: normalized `details` map to the field, create `aria-describedby`, set `aria-invalid`, render localized feedback, and focus the first invalid field. Test association, focus, and every pinned field-error shape.

## Testing Strategy

| Layer | Proof |
|---|---|
| Contract | Exact pinned matrix, DTOs, queries, payloads, errors, credentials absent. |
| Component | Auth states, archive invariants, action visibility, focus, conflicts, cancellation, stale success/failure. |
| Integration | ADMIN detail route, list navigation, canonical client; browser E2E unavailable. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and RED test |
|---|---|---|
| Application route | Applicable | ADMIN detail renders; unauthenticated/other roles follow existing redirects. RED route/role tests. |
| Documentation-like paths | N/A: no executable classification | None. |
| Git repository selection | N/A: no Git execution | None. |
| Commit state | N/A: no commit automation | None. |
| Push state | N/A: no push automation | None. |
| PR commands | N/A: no PR automation | None. |

## Migration / Rollout

No data migration. Preserve four cohesive chained slices, tests with behavior, the 400-line budget, one honest split, and unavoidable `size:exception` only. Roll back in reverse order.

## Open Questions

- [ ] **Apply blocker:** provide the real immutable Phase 2 API SHA and its contracts; until then, apply remains closed.
