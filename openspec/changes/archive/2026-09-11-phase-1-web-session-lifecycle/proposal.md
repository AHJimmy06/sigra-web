# Proposal: Phase 1 Web Session Lifecycle Reconciliation

## Intent

Reconcile the existing Web session client against the Phase 1 contract. This child supersedes only the Web execution slice in parent tasks 3.1–3.4; the umbrella remains unchanged as provenance, and implementation remains evidence rather than completion proof.

## Scope

### In Scope
- Keep bearer access tokens only in module memory and refresh credentials only in the API-managed `HttpOnly` cookie. Persisted readable CSRF is allowed but is not an authentication credential.
- Reconcile credentialed login, refresh, and logout; centralized single-replay `401` recovery; safe bootstrap; and ADMIN/GUARD routing.
- Verify cross-tab refresh coordination, malformed login responses, stale async identity completion after logout/expiry, actual IndexedDB execution, and explicit degraded fallback semantics.

### Out of Scope
- API behavior, persistence, rotation/reuse policy, CSRF/Origin enforcement, OpenAPI, migrations, and audits.
- Password recovery, Mobile, sibling-repository runtime work, or modifying/closing the parent umbrella.
- Claiming browser multi-tab E2E coverage without a harness or bounded deterministic substitute.

## Capabilities

### New Capabilities
- `web-session-lifecycle`: Browser credential placement, session operations, bounded `401` replay, identity bootstrap, role-safe routing, and cross-tab coordination.

### Modified Capabilities
None; no archived main specifications exist, and the active parent remains provenance only.

## Approach

Use a repository-local child specification and design mapped to parent tasks 3.1–3.4. Preserve implementation where tests prove compliance; add deterministic contract, race, IndexedDB, and fallback coverage before changing demonstrated gaps. Document browser multi-tab verification as a limitation unless a bounded substitute is designed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/api/client.ts`, `src/api/client.spec.ts` | Modified | Session contracts, replay, malformed responses |
| `src/auth/AuthContext.tsx`, `src/auth/AuthContext.spec.tsx` | Modified | Bootstrap and stale-completion safety |
| `src/auth/refreshCoordinator.ts`, `src/auth/refreshCoordinator.spec.ts` | Modified | IndexedDB, cross-tab, degraded fallback |
| `src/App.spec.tsx` | Modified | ADMIN/GUARD route regressions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| jsdom overstates browser coordination | High | Separate deterministic proof from documented E2E limitation |
| Late async work restores expired identity | Medium | Add generation/abort fencing and race tests |
| Fallback permits duplicate refresh | Medium | Specify degraded guarantees and test takeover boundaries |

## Rollback Plan

Revert this child’s Web-only commits in reverse chain order, restore the prior auth client/coordinator behavior, rerun focused and full validation, and leave parent/API/recovery artifacts untouched.

## Dependencies

- Existing local API session contract and unchanged parent provenance artifacts.

## Success Criteria

- [ ] Focused lifecycle tests prove all identified contract, race, IndexedDB, and fallback cases.
- [ ] Full tests and `npm run validate` pass while bearer/refresh credentials remain non-persistent.
- [ ] ADMIN/GUARD behavior remains safe, and browser multi-tab limitations are explicit.
