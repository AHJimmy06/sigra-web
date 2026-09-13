# Proposal: Phase 2 Web Resident and Unit Administration

## Intent

Complete ADMIN resident and unit administration from baseline `9f07a3a`. Align with an immutable API SHA, add resident detail, and keep archive lifecycles distinct from activation.

## Scope

### In Scope
- Reconcile DTOs, errors, endpoints, and status-query encoding with the pinned API contract.
- Add resident detail with loading, not-found, authorization, stale-response, error, and retry states.
- Add reversible resident archive/restore; archived residents reserve email, are hidden by default, and appear through an archive filter while `active` independently represents access activation/revocation.
- Add reversible unit archive/restore; archived units reserve code, and any dependency conflict is surfaced without client-side reassignment. `active=false` remains non-archival.
- Bound and cancel unit-option loading; retain accessible confirmations, errors, retries, and focused tests.

### Out of Scope
- API implementation, Mobile, password recovery, SMTP/outbox, and session transport changes.
- Announcements, tickets, and access workflows.

## Capabilities

### New Capabilities
- `resident-administration`: Resident querying, detail, editing, activation, revocation, and reversible archival.
- `unit-administration`: Unit querying, editing, activation, deactivation, reversible archival, and dependency conflicts.

### Modified Capabilities
None. `web-session-lifecycle` remains unchanged.

## Approach

Use incremental contract-first completion through canonical `api()` and existing components. Pin the API SHA, centralize stable contract/query knowledge, and preserve server semantics.

Chain cohesive slices for contract reconciliation, resident behavior, unit behavior, and integration proof. Keep tests and rollback boundaries with each unit, target under 400 authored changed lines, and record the approved exception when an honest split cannot fit.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/api/contracts.ts` | Modified | Stable resident/unit contract boundary |
| `src/pages/ResidentsPage.tsx` | Modified | Detail, queries, archive lifecycle, bounded options |
| `src/pages/UnitsPage.tsx` | Modified | Queries, archive lifecycle, dependency conflicts |
| `src/pages/*.spec.tsx` | Modified | Request, lifecycle, accessibility, and race proof |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Web/API contract drift | Med | Pin one API SHA and assert exact requests/errors |
| Archive conflated with activation | Med | Specify and test orthogonal states and filters |
| Oversized review slices | Med | One honest work-unit split; use approved exception only when necessary |

## Rollback Plan

Revert child branches in reverse order. Contract reconciliation remains independently revertible; no API or session-client migration is introduced.

## Dependencies

- Immutable API SHA exposing the confirmed archive, restore, detail, status-query, identity-reservation, and dependency-conflict contracts.

## Success Criteria

- [ ] ADMIN flows match the pinned API contract and preserve canonical session behavior.
- [ ] Resident and unit archive states remain reversible, identity-reserving, filterable, and independent from `active`.
- [ ] Focused tests prove detail, bounded cancellation, conflicts, confirmations, errors, retries, and exact queries.
