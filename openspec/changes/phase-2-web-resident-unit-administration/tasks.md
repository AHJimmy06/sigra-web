# Tasks: Phase 2 Web Resident and Unit Administration

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 120–180 per slice; 520–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | exception-ok |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Pin and prove the API contract | PR 1, base feature/tracker | `npm test -- src/api/contracts.spec.ts` | N/A: browser E2E unavailable; mocked client | Revert `src/api/contracts.ts` and `src/api/contracts.spec.ts` |
| 2 | Resident detail and archive UX | PR 2, base PR 1 | `npm test -- src/App.spec.tsx src/pages/ResidentDetailPage.spec.tsx src/pages/ResidentsPage.spec.tsx` | `npm run dev`; ADMIN detail, archive, retry, stale-response scenarios | Revert resident route/detail/page changes only |
| 3 | Unit archive and dependency UX | PR 3, base PR 2 | `npm test -- src/pages/UnitsPage.spec.tsx` | `npm run dev`; filter, archive conflict, restore, activation scenarios | Revert `src/pages/UnitsPage.tsx` and its tests |
| 4 | Integration and regression proof | PR 4, base PR 3 | `npm test && npm run validate` | `npm run dev`; ADMIN navigation and accessibility smoke path | Revert only final proof/test refinements |

## Phase 1: Contract Gate (PR 1)

- [x] 1.1 **RED:** In `src/api/contracts.spec.ts`, add failing exact-matrix tests for the real immutable Phase 2 API commit SHA: DTOs, paths, methods, queries, payloads, error status/code/message/details, lifecycle semantics, and credential absence. Obtain and record the actual SHA from the API owner; never invent it, and stop if unavailable.
- [x] 1.2 **GREEN:** Update `src/api/contracts.ts` and `src/api/contracts.spec.ts` with only the verified SHA and exact contract builders/types; preserve canonical `api()` and session transport. Verify 1.1 passes.

## Phase 2: Resident Slice (PR 2)

- [ ] 2.1 **RED:** Extend `src/App.spec.tsx`, create `src/pages/ResidentDetailPage.spec.tsx`, and extend `src/pages/ResidentsPage.spec.tsx` for ADMIN route/role safety, detail loading/404/401/403/error/retry, stale ownership, archive visibility, reserved email, independent `active`, focus, and field feedback.
- [ ] 2.2 **GREEN:** Modify `src/App.tsx`, create `src/pages/ResidentDetailPage.tsx`, and modify `src/pages/ResidentsPage.tsx` to pass 2.1 using verified builders, bounded cancellable options, owned generations, and accessible confirmations; no guessed paths.

## Phase 3: Unit Slice (PR 3)

- [ ] 3.1 **RED:** Extend `src/pages/UnitsPage.spec.tsx` for exact filters, archive/restore visibility and code reservation, independent activation, any API dependency conflict, no reassignment, cancellation, stale actions, focus, and retry.
- [ ] 3.2 **GREEN:** Modify `src/pages/UnitsPage.tsx` to pass 3.1 with server-confirmed archive lifecycle, canonical `api()`, ownership guards, and normalized conflict errors; preserve existing behavior.

## Phase 4: Integration Proof (PR 4)

- [ ] 4.1 **RED/GREEN:** Run and fix focused suites, then `npm test && npm run validate`; record exact results and confirm no session transport, password DTO, or unrelated route changes.
- [ ] 4.2 Record SHA, contract evidence, smoke scenario, accessibility/race coverage, changed-line counts, and rollback boundaries in the PR chain; mark tasks complete after evidence exists.
