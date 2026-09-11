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
