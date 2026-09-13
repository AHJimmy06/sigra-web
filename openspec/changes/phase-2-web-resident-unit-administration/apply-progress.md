# Apply Progress: Phase 2 Web Resident and Unit Administration

## Completed Tasks

- [x] 1.1 RED exact contract matrix.
- [x] 1.2 GREEN pinned contract builders and types.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/api/contracts.spec.ts` | Unit | Parent: `client.spec.ts` 26/26 | 3/3 failed before production code | 3/3 passed after 1.2 | 3 matrix scenarios | None needed |
| 1.2 | `src/api/contracts.spec.ts` | Unit | Parent: `client.spec.ts` 26/26 | Covered by 1.1 | 1 file, 3/3 passed | 3 matrix scenarios | None needed |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- src/api/contracts.spec.ts`: 1 file, 3/3 passed |
| Build | `npm run build`: passed (`tsc -b && vite build`) |
| Runtime harness | N/A: contract builders are pure values; browser E2E is unavailable |
| Rollback boundary | Revert `src/api/contracts.ts`, `src/api/contracts.spec.ts`, and these coherence-only OpenSpec corrections |

Pinned API SHA: `40be73f5aa067f3088da97cc506d2517be085e96`.
Resident archive deactivates the resident and linked user; restore requires an intact identity and active unit, then leaves both inactive. Unit archive/restore preserves `active`.
