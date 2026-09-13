# Apply Progress: Phase 2 Web Resident and Unit Administration

## Completed Tasks

- [x] 1.1 RED exact contract matrix.
- [x] 1.2 GREEN pinned contract builders and types.
- [x] 2.1 RED resident route, detail, archive, and field-feedback coverage.
- [x] 2.2 GREEN resident route/detail/list implementation.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/api/contracts.spec.ts` | Unit | Parent: `client.spec.ts` 26/26 | 3/3 failed before production code | 3/3 passed after 1.2 | 3 matrix scenarios | None needed |
| 1.2 | `src/api/contracts.spec.ts` | Unit | Parent: `client.spec.ts` 26/26 | Covered by 1.1 | 1 file, 3/3 passed | 3 matrix scenarios | None needed |
| 2.1 | `src/App.spec.tsx`, `src/pages/ResidentDetailPage.spec.tsx`, `src/pages/ResidentsPage.spec.tsx` | Component integration | `App` + residents: 16/16 | 3 files failed before production code: unresolved detail module, missing detail route/archive filter | 23/23 passed after 2.2 | Route role, 404/401/403/generic retry, stale detail, archive and reserved-email cases | No further refactor needed |
| 2.2 | Same three files | Component integration | 16/16 | Covered by 2.1 | 3 files, 23/23 passed | Pinned route, lifecycle, field error, and cancellation paths | Removed unused import; tests stayed green |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/api/contracts.spec.ts`: 1 file, 3/3 passed |
| Build | `npm run build`: passed (`tsc -b && vite build`) |
| Runtime harness | N/A: contract builders are pure values; browser E2E is unavailable |
| Rollback boundary | Revert `src/api/contracts.ts`, `src/api/contracts.spec.ts`, and these coherence-only OpenSpec corrections |

## PR 2 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/App.spec.tsx src/pages/ResidentDetailPage.spec.tsx src/pages/ResidentsPage.spec.tsx`: 3 files, 23/23 passed. RED before GREEN: 3 files failed; 2 assertion failures plus one unresolved new module. |
| Runtime harness | N/A: browser E2E is unavailable; the requested role/navigation, confirmation accessibility, retry, cancellation, stale-owner, and field-focus paths run in the jsdom component integration harness. |
| Build | `npm run build`: passed (`tsc -b && vite build`); Vite reported its pre-existing >500 kB chunk-size advisory. |
| Lint | `npm run lint`: exit 0 with one pre-existing-style `react(set-state-in-effect)` advisory for detail loading state. |
| Diff integrity | `git diff --check`: passed. |
| Rollback boundary | Revert only `src/App.tsx`, `src/App.spec.tsx`, `src/pages/ResidentDetailPage.tsx`, `src/pages/ResidentDetailPage.spec.tsx`, `src/pages/ResidentsPage.tsx`, and `src/pages/ResidentsPage.spec.tsx`; this removes resident route/detail/archive UX without touching unit or session work. |

PR 2 is the feature-branch-chain child based on Web parent `532ea72` / API contract pin `40be73f`; delivery is maintainer-approved `exception-ok` and this slice remains resident-only.

Pinned API SHA: `40be73f5aa067f3088da97cc506d2517be085e96`.
Resident archive deactivates the resident and linked user; restore requires an intact identity and active unit, then leaves both inactive. Unit archive/restore preserves `active`.

## PR 3 Unit Slice

### Completed Tasks

- [x] 3.1 RED unit lifecycle, dependency, accessibility, retry, and ownership coverage.
- [x] 3.2 GREEN server-confirmed unit archive/restore implementation.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `src/pages/UnitsPage.spec.tsx` | Component integration | 5/5 passed | 4 new lifecycle assertions failed before production code; 5 inherited assertions passed | 9/9 passed after 3.2 | Active/archive query combinations; archive/restore; dependency conflict/retry; unmount stale success | Updated inherited status selector to retain its semantic label after archive filter introduction; 9/9 stayed green |
| 3.2 | `src/pages/UnitsPage.spec.tsx` | Component integration | 5/5 passed | Covered by 3.1 | 9/9 passed after canonical builders, independent archive controls, and owned actions | Same 4 lifecycle/race scenarios plus existing activation pagination coverage | No further production refactor needed |

### PR 3 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/pages/UnitsPage.spec.tsx`: 1 file, 9/9 passed. RED: 4 new tests failed before production code; 5 inherited tests passed. |
| Runtime harness | N/A: browser E2E is unavailable. The jsdom component integration harness exercised active/archive query encoding, lifecycle confirmation/focus/retry, conflict visibility, and stale unmount ownership. |
| Build | `npm run build`: passed (`tsc -b && vite build`); Vite emitted the pre-existing >500 kB chunk-size advisory. |
| Lint | `npm run lint`: exit 0 with the pre-existing `react(set-state-in-effect)` advisory in `src/pages/ResidentDetailPage.tsx`. |
| Diff integrity | `git diff --check`: passed. |
| Rollback boundary | Revert only `src/pages/UnitsPage.tsx` and `src/pages/UnitsPage.spec.tsx`; this removes unit archive/filter/action behavior without changing resident, contract, session, or integration work. |

PR 3 is the `feature-branch-chain` child based on resident PR 2. Delivery is maintainer-approved `exception-ok`; this autonomous slice is unit-only and has 132 authored changed lines (114 additions, 18 deletions).

## PR 4 Integration and Regression Proof

### Completed Tasks

- [x] 4.1 Regression and validation evidence recorded without product changes.
- [x] 4.2 Pinned-contract, smoke, accessibility/race, line-count, and rollback evidence recorded.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | Existing focused and full suites | Component integration / regression | Focused chain suite: 5 files, 35/35 passed | N/A: proof-only task; no production behavior or test refinement was needed because the inherited safety net was green | Full `npm test`: 18 files, 115/115 passed; `npm run validate`: lint exit 0 and build passed | Existing suite covers ADMIN navigation, resident/unit flows, accessibility, and stale response/ownership paths | None needed; no product code changed |
| 4.2 | `src/api/contracts.spec.ts`, route/page suites | Contract / component integration | 5 files, 35/35 passed | N/A: evidence-recording task; no executable behavior changed | Pinned SHA and scope assertions remain green in the full 115-test run | Contract credential exclusion plus route, lifecycle, focus, and stale-response scenarios are covered by inherited tests | None needed; documentation evidence only |

### PR 4 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/App.spec.tsx src/api/contracts.spec.ts src/pages/ResidentDetailPage.spec.tsx src/pages/ResidentsPage.spec.tsx src/pages/UnitsPage.spec.tsx`: 5 files, 35/35 passed. No RED/GREEN fix was needed because all inherited regression tests passed before any edit. |
| Full regression | `npm test`: 18 files, 115/115 passed. |
| Validation | `npm run validate`: lint exited 0 with the pre-existing `react(set-state-in-effect)` advisory in `src/pages/ResidentDetailPage.tsx`; `tsc -b && vite build` passed. Vite emitted the pre-existing >500 kB chunk-size advisory (727.69 kB uncompressed entry chunk). |
| Diff integrity | `git diff --check`: passed. |
| Runtime smoke scenario | jsdom component-integration smoke: ADMIN routes to resident detail while GUARD redirects to scanner; resident/unit pages issue canonical pinned requests, render lifecycle confirmations with focused errors, and stale list/detail/action responses cannot commit. Browser E2E remains unavailable. |
| Accessibility and race coverage | Accessible confirmation dialogs and focused `role="alert"` failures are covered in resident/unit suites; stale detail, stale unit list, cancelled unit-option traversal, and stale unit lifecycle ownership are covered by their respective focused suites. |
| Contract and scope guard | Exact pinned API SHA is `40be73f5aa067f3088da97cc506d2517be085e96`; `contracts.spec.ts` proves password is excluded from response DTO fields. No session transport, API client, or unrelated route file changed in PR 4. |
| Authored changed lines | 32 additions, 2 deletions (34 total): OpenSpec evidence and task checkboxes only; 0 product-code lines. |
| Rollback boundary | Revert only the two Phase 4 checkbox updates in `tasks.md` and the `PR 4 Integration and Regression Proof` section in this file; resident, unit, contract, session, and route behavior remain untouched. |

PR 4 is the final `feature-branch-chain` child based on PR 3. Delivery remains maintainer-approved `exception-ok`; this proof-only child is within the 250-line budget and introduces no product scope.

## Bounded Strict-TDD Remediation

**Failed verification revision**: `sha256:95b3a18cc58d1a840bb23d0fca5ccdb160d005a9a41195eb7e30ad6dfd154360`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Remediation | `src/pages/AdministrationRemediation.spec.tsx` | Component integration | 5 focused files, 35/35 passed | 4 assertions failed: stale list data, missing detail link, and invalid archive-only response semantics | 5 files, 35/35 passed; full suite 19 files, 118/118 passed | Resident and unit server-sequence paths cover archive → default empty → archived-only → restore plus `status=false` | Kept state local; no client/session changes |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/pages/AdministrationRemediation.spec.tsx src/pages/ResidentDetailPage.spec.tsx src/pages/ResidentsPage.spec.tsx src/pages/UnitsPage.spec.tsx src/App.spec.tsx`: 5 files, 35/35 passed. |
| Runtime harness | jsdom component-integration mock HTTP/client boundary: exact archive/restore POST paths, list query transitions, `status=false`, rendered empty/archive/current DOM states, preserved inactive resident state, reserved-code conflict field feedback, and independent unit action controls. Browser E2E is unavailable. |
| Full regression | `npm test`: 19 files, 118/118 passed. |
| Validation | `npm run validate`: passed. Existing resident-detail `react(set-state-in-effect)` advisory and Vite >500 kB chunk advisory remain. |
| Diff integrity | `git diff --check`: passed. |
| Rollback boundary | Revert `src/pages/ResidentsPage.tsx`, `src/pages/UnitsPage.tsx`, and `src/pages/AdministrationRemediation.spec.tsx`; this removes authorization clearing, row detail linking, resident action cancellation, and lifecycle proof without touching API SHA or session transport. |

Production fixes: list failures now clear resident/unit rows and totals, distinguish authorization failures from retryable errors, resident rows expose their detail URL, and resident archive/restore owns an abort controller through cancellation/unmount. API SHA remains `40be73f5aa067f3088da97cc506d2517be085e96`; `src/api/client.ts` was not changed.

## Final Strict-TDD Proof Remediation

**Failed verification revision**: `sha256:9c8864867075a06193c2297676e19c63a70debe6ed904983afe79b7de4face3d`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Final proof gaps | `src/pages/AdministrationRemediation.spec.tsx` | Component integration | 3/3 passed before additions | 5 failures: route ownership plus resident/unit stale-action leakage | 8/8 passed after owned-action cancellation | 401/403 for both lists; first/second/third detail routes; resident/unit archive-to-activation supersession | Replaced conditional expressions to clear lint warnings; focused tests stayed green |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/pages/AdministrationRemediation.spec.tsx`: 1 file, 8/8 passed. |
| Runtime harness | jsdom component-integration API boundary: exact `/residents` and `/units` search requests clear rendered rows on 401/403 with no retry; newest `/residents/:id?includeArchived=true` response owns DOM and unmount aborts; stale archive rejection cannot overwrite the newer resident/unit activation dialog. |
| Full regression | `npm test`: 19 files, 123/123 passed. |
| Validation | `npm run validate`: passed. Existing resident-detail effect advisory and Vite >500 kB chunk advisory remain. |
| Diff integrity | `git diff --check`: passed. |
| Rollback boundary | Revert only `src/pages/AdministrationRemediation.spec.tsx`, `src/pages/ResidentsPage.tsx`, and `src/pages/UnitsPage.tsx`; this removes final proof and action supersession isolation without changing API SHA, contracts, session transport, or verify report. |

Resident access and lifecycle confirmations now invalidate and abort the prior action before opening a newer one; unit confirmations apply the same isolation. API SHA, canonical `api()` transport, and session scope remain unchanged.

## Focused Strict-TDD Remediation: Archive Inclusion and Lifecycle Proof

**Failed evidence revision**: `sha256:993e67a294d81174c2671d675149c5ee5ff1552f036161666033812bc066faf3`.
**Active native attempt token**: `sha256:2e1e5563020a027f1d90b8b01c74cc9c21f0257596b262309fdbfc681a25edfe` (parent owns settlement).
**Pinned API SHA**: `40be73f5aa067f3088da97cc506d2517be085e96`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Subplan 1: archive inclusion | `src/pages/AdministrationRemediation.spec.tsx` | Component integration | 8/8 passed | 2 failures: archive control still implied archived-only results | 10/10 passed after control wording aligned with `includeArchived=true` | Exact resident and unit responses contain both current and archived rows with independent actions | No further refactor needed |
| Subplan 2: resident lifecycle | `src/pages/ResidentDetailPage.spec.tsx` | Component integration | 3/3 passed | Restore action missing after server-confirmed archive | 4/4 passed after owned restore lifecycle | Archive and restore failure→retry, terminal states, generic retry, and stale detail coverage | Unified archive/restore ownership and cancellation |
| Subplan 3: unit remaining paths | `src/pages/UnitsPage.spec.tsx` | Component integration | 9/9 passed | New retry/coexistence proof exposed a modal accessibility test setup error; no production behavior was missing | 10/10 passed after correcting the proof to close its modal before inspecting background controls | General retry, current+archived coexistence, reserved-code conflict, active-toggle isolation, and stale outcomes | No production refactor needed; prior isolation remains correct |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Subplan 1 focused test | `npm test -- src/pages/AdministrationRemediation.spec.tsx`: 1 file, 10/10 passed; RED 2 failed assertions. Exact DOM evidence: `Current Ana`/`Archived Ana` and `CURRENT-1`/`ARCHIVED-1` remain visible after `?includeArchived=true`, with archive and restore controls both present. |
| Subplan 2 focused test | `npm test -- src/pages/ResidentDetailPage.spec.tsx`: 1 file, 4/4 passed; RED lacked `Restaurar residente`. Exact request evidence: `POST /residents/resident-1/archive` and `POST /residents/resident-1/restore`; failures retain focused alerts and retry the same action. |
| Subplan 3 focused test | `npm test -- src/pages/UnitsPage.spec.tsx`: 1 file, 10/10 passed. Exact DOM/request evidence: retry clears `Unit list unavailable`; `?includeArchived=true` returns `CURRENT-1` and `RESERVED-1`; archived row exposes restore while current row exposes archive. Existing focused proof retains `409` reserved-code conflict, active-toggle, cancellation, and stale-action isolation. |
| Runtime harness | jsdom component-integration API boundary executed by all focused suites. Browser E2E is unavailable. |
| Full regression | `npm test`: 19 files, 127/127 passed. One earlier full-suite attempt timed out in unrelated `FieldFeedback.spec.tsx`; its focused rerun passed 2/2 and the final full run passed. |
| Validation | `npm run validate`: passed. Existing `react(set-state-in-effect)` advisory and Vite >500 kB chunk advisory remain. |
| Diff integrity | `git diff --check`: passed. |
| Rollback boundary | Revert `src/pages/AdministrationRemediation.spec.tsx`, `src/pages/ResidentDetailPage.spec.tsx`, `src/pages/ResidentDetailPage.tsx`, `src/pages/ResidentsPage.tsx`, and `src/pages/UnitsPage.spec.tsx`/`src/pages/UnitsPage.tsx`; prior remediation, API contracts, session transport, and verify report remain untouched. |

Production fixes: archive filters now accurately say they include archived records while rendering the complete server response, and resident detail now owns cancellable archive/restore actions with server-confirmed reloads. The API SHA and canonical session transport are unchanged. Delivery remains maintainer-approved `exception-ok` on the `feature-branch-chain`; no commit was created.

## Focused Strict-TDD Remediation: Inclusive Archive and Retry Proof

**Failed evidence revision**: `sha256:b6180267159b4378bd7ab4c3dadb6a4e2cb558f528964ce8c9f6f4161792c1b8`.
**Active native attempt token**: Parent-owned `sha256:f4b006fb670f47db88b79a439a9c43b9684942848ee2f463f7ddf2932fb6720d`; not acquired or settled here.
**Pinned API SHA**: `40be73f5aa067f3088da97cc506d2517be085e96`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Resident inclusive restore fixture | `src/pages/AdministrationRemediation.spec.tsx` | Component integration | 3 files, 24/24 passed | Focused run failed because the prior fixture asserted archived-only rows after restore | Focused run: 3 files, 24/24 passed | Proves restored Ana, current peer, and archived peer coexist under `includeArchived=true` | None needed; test-only fixture correction |
| Unit inclusive restore fixture | `src/pages/AdministrationRemediation.spec.tsx` | Component integration | 3 files, 24/24 passed | Focused run failed because the prior fixture omitted current peers after restore | Focused run: 3 files, 24/24 passed | Proves restored unit, current peer, and archived peer coexist under `includeArchived=true` | None needed; test-only fixture correction |
| Resident same-route generic retry | `src/pages/ResidentDetailPage.spec.tsx` | Component integration | 3 files, 24/24 passed | Focused run failed when retry had no successful second response fixture | Focused run: 3 files, 24/24 passed | Asserts two exact detail requests, successful DOM render, and cleared error | None needed; test-only proof correction |
| Archived unit code reservation | `src/pages/AdministrationRemediation.spec.tsx` | Component integration | 3 files, 24/24 passed | Focused run failed until the fixture retained inclusive rows through the conflict path | Focused run: 3 files, 24/24 passed | Asserts archived target/current/archived peers remain after exact `409` create feedback and after restore | None needed; test-only fixture correction |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/pages/AdministrationRemediation.spec.tsx src/pages/ResidentDetailPage.spec.tsx src/pages/UnitsPage.spec.tsx`: 3 files, 24/24 passed. RED: 3 files, 3 failures. |
| Runtime harness | jsdom component-integration API boundary: exact `POST` archive/restore and `POST /units` conflict requests; inclusive resident/unit DOM peers; two same-route detail requests; retry clears `Network down`; field feedback exposes `aria-invalid=true`. Browser E2E is unavailable. |
| Full regression | `npm test`: 19 files, 127/127 passed. |
| Validation | `npm run validate`: passed with the pre-existing `react(set-state-in-effect)` advisory and Vite >500 kB chunk advisory. |
| Diff integrity | `git diff --check`: passed. |
| Production changes | None in this remediation; API SHA, session transport, unrelated routes, and the existing FAIL verify-report were not modified. |
| Rollback boundary | Revert only the inclusive/retry/reservation proof refinements in `src/pages/AdministrationRemediation.spec.tsx`, `src/pages/ResidentDetailPage.spec.tsx`, and this section; prior remediation remains intact. |

This focused exception proves all four failed-evidence contradictions without changing production code or settling the parent-owned attempt token.

## Focused Strict-TDD Remediation: Resident Detail Loading Proof

**Parent-owned attempt token**: `sha256:043cd2c7572a835c33720f0e5ba3582f8d705bf306ae6cdfc549b2771bd19b4c`; not acquired or settled here.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Pending detail loading proof | `src/pages/ResidentDetailPage.spec.tsx` | Component integration | 4/4 passed | Test added first; existing loading behavior passed, so no production change was needed | 5/5 passed | Pending loading and resolved detail DOM states | None needed |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/pages/ResidentDetailPage.spec.tsx`: 1 file, 5/5 passed. The unresolved detail promise keeps `Cargando…` visible; resolving it renders `Ana García`. |
| Runtime harness | jsdom component-integration API boundary with a manually controlled pending detail promise, then its resolved resident response. Browser E2E is unavailable. |
| Full regression | `npm test`: 19 files, 128/128 passed. |
| Validation | `npm run validate`: passed; existing resident-detail effect advisory and Vite >500 kB chunk advisory remain. |
| Diff integrity | `git diff --check`: passed. |
| Production changes | None. |
| Rollback boundary | Revert the nine added proof lines in `src/pages/ResidentDetailPage.spec.tsx` and this section only. |
