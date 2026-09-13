## Exploration: Phase 2 Web Resident and Unit Administration

### Current State
Baseline `develop` commit `9f07a3a` already provides ADMIN-only `/residents` and `/units` routes through the canonical session-aware `api()` client. Both pages use server-backed search, status filters, pagination, create/edit modals, field-level API validation, retryable page errors, and confirmation dialogs whose action failures remain focused and announced. Residents also support unit filtering and access activation/revocation; units support activation/deactivation.

The remaining confirmed Web scope is narrower than the roadmap implies: reconcile the fixed API contract, add resident detail, and complete archival/lifecycle UX after product policy is decided. No resident detail request or archive operation exists today. The resident page also reloads every unit page whenever its list query changes, and page-local DTOs duplicate contract knowledge.

Local contract documents disagree with the current query encoding: `backend-phase-2.md` specifies `status=ACTIVE|INACTIVE`, while both pages currently send `status=true|false` and tests assert that Boolean form. This must be reconciled against one immutable API commit before implementation. The canonical client already supplies `/api` prefixing, bearer/session recovery, credentials, cancellation, GET retries, normalized errors, and field details; Phase 2 must not replace or bypass it.

### Affected Areas
- `src/pages/ResidentsPage.tsx` — existing resident list, filters, all-unit option loading, create/edit forms, and access lifecycle; needs contract reconciliation, detail UX, and policy-dependent archive UX.
- `src/pages/ResidentsPage.spec.tsx` — existing coverage for pagination, DTO limits, unit traversal, field errors, accessible confirmations, stale requests, and page correction; extend by work unit.
- `src/pages/UnitsPage.tsx` — existing unit list, filters, forms, and activation/deactivation; needs contract reconciliation and policy-dependent archive/dependency UX.
- `src/pages/UnitsPage.spec.tsx` — existing server-query, stale-response, empty-state, confirmation-error, and page-correction proof; extend for fixed lifecycle behavior.
- `src/api/contracts.ts` — shared pagination/error primitives; likely home for stable resident/unit contract types or query adapters without changing session protocol.
- `src/api/client.ts` — canonical session client to preserve; only existing normalized `ApiError` behavior should be consumed.
- `src/components/FieldFeedback.tsx` — maps API `details` paths to accessible field feedback; contract reconciliation must verify duplicate email/code paths match form names.
- `src/components/ConfirmDialog.tsx` — established destructive-action confirmation and focused `role="alert"` failure pattern.
- `src/components/PageState.tsx` — established retryable list failure state; detail loading/not-found failures must follow this pattern.
- `docs/backend-phase-2.md` and `docs/backend-contracts.md` — local fixed-contract evidence, including the unresolved archival rules and status-query mismatch.
- `openspec/changes/phase-2-web-resident-unit-administration/` — subsequent proposal, delta spec, design, tasks, and verification artifacts.

### Approaches
1. **Incremental contract-first completion** — isolate resident/unit DTOs and fixed endpoint/query semantics, then add detail and policy-approved lifecycle UX using existing pages and shared components.
   - Pros: Preserves the canonical client and proven interaction patterns; minimizes regression risk; maps naturally to reviewable feature-branch-chain slices; keeps tests with each behavior.
   - Cons: Large page components remain; unit-option loading may need a focused extraction to avoid repeated full traversal; archival UI cannot be finalized until policy decisions are made.
   - Effort: Medium

2. **Resident/unit feature-module rewrite** — replace both pages with new feature folders, hooks, repositories, schemas, and generalized CRUD components before adding missing behavior.
   - Pros: Stronger long-term separation and less page-local contract duplication.
   - Cons: High churn around already-tested behavior, likely exceeds review budgets, obscures contract corrections inside refactoring, and increases session-client integration risk without delivering additional Phase 2 value.
   - Effort: High

### Recommendation
Use incremental contract-first completion. First pin and reconcile all Web assumptions against one fixed API SHA without executing against or reading a mutable sibling worktree. Preserve `api()`, `FieldFeedback`, `ConfirmDialog`, `PageState`, `Modal`, and `Pagination`; introduce only the smallest feature-local contract/query boundary needed to remove ambiguity.

Plan the implementation as a feature branch chain with cohesive slices, targeting fewer than 400 authored changed lines where practical:

1. Contract reconciliation and focused request/response/error tests.
2. Resident detail plus the archival UX selected by product policy.
3. Unit lifecycle plus the dependency/archive UX selected by product policy.
4. Fixed-API-SHA integration proof and final accessibility/regression evidence.

If a cohesive slice cannot fit the review target after one honest split, record the approved `exception-ok` size exception rather than compressing tests or documentation.

### Blocking Product Decisions Before Proposal
1. **Resident archival** — choose between a distinct reversible archive, a distinct terminal archive, or revoke-only with no separate archive. Do not infer archival from the existing `active` flag.
2. **Unit archival dependencies** — choose between rejecting archive when any dependency exists, controlled active-resident reassignment followed by archive, or deactivate-only with no archive. Do not infer this from the existing active-resident deactivation conflict.

These decisions determine available actions, confirmation language, list visibility/filter semantics, detail states, retry behavior, and endpoint usage. Exploration intentionally does not choose either policy.

### Risks
- Implementing against the Boolean status query while the fixed API expects enum values would silently break filtering; the immutable API SHA and exact query contract must be recorded before coding.
- Archive and active/revoked states may be distinct. Reusing `active` as an archive surrogate could hide records incorrectly or offer invalid restoration actions.
- Unit archival may affect residents, tickets, and access history; the Web cannot safely invent dependency resolution or reassignment behavior absent a fixed contract and product decision.
- Resident detail needs explicit loading, `404`, authorization, stale-response, and retry handling; list-row data must not be assumed to equal the detail contract.
- Loading all units for every resident query can amplify requests and depends on the API accepting `pageSize=100`; reconciliation should define a bounded, cancellable option-loading strategy.
- Current tests mock the API boundary. The final slice needs proof against the explicitly pinned API SHA without using a mutable sibling worktree or claiming unsupported browser E2E coverage.

### Ready for Proposal
No. Local exploration is sufficient and no external research lane is needed, but proposal work is blocked until the two product decisions above are explicitly resolved. The proposal should then record the immutable API SHA, exact archive/dependency contracts, and the feature-branch-chain slices.
