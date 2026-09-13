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
