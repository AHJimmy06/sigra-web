## Exploration: Phase 1 Web session lifecycle reconciliation

### Current State
The uncommitted Web implementation substantially delivers the intended session client, but it is not yet fully verified against the parent contract. `src/api/client.ts` keeps the bearer access token in module memory, persists only the readable CSRF value required by the local API contract, sends credentials on login/refresh/logout, attaches bearer authorization centrally, performs one in-tab refresh for concurrent `401` responses, replays each request at most once, excludes authentication and recovery endpoints from refresh, restores through refresh followed by `/auth/me`, and clears local state after refresh or logout failure. `AuthContext` keeps protected content loading during bootstrap, verifies identity through `/auth/me`, rejects unsupported resident access, and responds to session events. `refreshCoordinator.ts` implements an IndexedDB lease with operation-ID retention, an ownership-checked release, BroadcastChannel coordination, and localStorage fallbacks.

The focused session tests pass (3 files, 26 tests), the full suite passes (16 files, 79 tests), and `npm run validate` passes lint and production build; Vite reports only the existing bundle-size warning. The claims need qualification: the tests do not execute the IndexedDB path or a real browser multi-tab flow; without BroadcastChannel, waiters cannot consume the owner's refresh result and may refresh again after the lease timeout; BroadcastChannel transfers bearer and CSRF values between same-origin tabs; and `AuthContext` has no generation/abort guard preventing a late bootstrap or `/auth/me` result from restoring user state after logout. Login response handling also lacks a negative contract test for a missing access token or CSRF header.

This child is Web-only. It maps to the parent design's planned `phase-1-web-session-client` slice and parent tasks 3.1–3.4, despite the child name `phase-1-web-session-lifecycle`. It does not own API endpoints, cookie issuance, rotation/reuse semantics, Origin/CSRF validation, persistence, audits, OpenAPI, migrations, recovery delivery, recovery UI, Mobile, or sibling-repository verification.

### Affected Areas
- `src/api/client.ts` — reconcile memory bearer handling, credentialed session calls, refresh/replay behavior, contract validation, restoration, and logout.
- `src/api/client.spec.ts` — retain current lifecycle coverage and add missing malformed-login and failure-boundary cases.
- `src/auth/AuthContext.tsx` — protect bootstrap and session-update state from stale asynchronous completion after logout or expiry.
- `src/auth/AuthContext.spec.tsx` — add deterministic logout/expiry versus in-flight bootstrap and identity-request race coverage.
- `src/auth/refreshCoordinator.ts` — reconcile cross-tab result transport and degraded fallback behavior with the parent coordination requirement.
- `src/auth/refreshCoordinator.spec.ts` — add actual IndexedDB-path coverage and stronger fallback/takeover assertions; current jsdom tests primarily exercise localStorage and mocked BroadcastChannel paths.
- `src/App.spec.tsx` — preserve ADMIN/GUARD routing and signed-out protection as regression evidence.
- `docs/backend-phase-1.md` — local API contract evidence only; documentation changes are outside this reconciliation unless a later proposal explicitly includes them.
- `openspec/changes/phase-1-identity-security/{proposal.md,design.md,tasks.md,specs/identity-session-security/spec.md,state.yaml}` — retained parent audit trail and provenance for the Web slice; no API work is inherited.

### Approaches
1. **Reconcile the existing implementation through a repository-local child** — restate only the Web clauses and scenarios, treat existing uncommitted code as implementation evidence, close the identified test and race gaps, and verify from the `sigra-web` root.
   - Pros: Preserves completed work, gives the Web implementation an auditable native SDD path, avoids cross-repository dispatch, and keeps API ownership explicit.
   - Cons: Requires careful provenance mapping and may expose implementation changes after the missing tests are added.
   - Effort: Medium

2. **Accept the implementation from current green tests without reconciliation** — record the existing unit results as completion and defer browser-specific behavior.
   - Pros: Minimal immediate work and no production-code changes.
   - Cons: Overstates IndexedDB and fallback guarantees, leaves stale-state races unaddressed, and loses requirement-level auditability from the blocked parent.
   - Effort: Low

### Recommendation
Use the repository-local reconciliation child. Its proposal and delta spec should explicitly supersede only the parent Web execution slice (`phase-1-web-session-client`, tasks 3.1–3.4), while referencing—not copying or closing—the umbrella's API and recovery obligations. Keep the parent artifacts intact. After child verification/archive, add a provenance pointer from the parent Web tasks to the archived child and its verification receipt; do not mark API tasks complete or reinterpret them from this repository.

Verification should run from `/home/jimmy/UTA/PFWYM/sigra-web`: `npm test -- src/api/client.spec.ts src/auth/AuthContext.spec.tsx src/auth/refreshCoordinator.spec.ts`, `npm test`, and `npm run validate`. Browser-level multi-tab verification is not currently available because the repository has no browser E2E harness; this limitation must remain explicit rather than being inferred from jsdom tests. The maintainer-approved `exception-ok` delivery strategy permits size exceptions, and `feature-branch-chain` remains the delivery strategy, but neither changes the Web-only scope.

### Risks
- Real IndexedDB transaction behavior and multi-tab timing are not exercised by the current jsdom suite.
- The no-BroadcastChannel fallback does not currently prove one refresh serves concurrent cross-tab demand.
- Late bootstrap or session-update promises can repopulate authenticated state after logout or expiry.
- Cross-tab bearer/CSRF transfer is transient rather than persisted, but it broadens secret exposure and must be an explicit child design decision.
- The parent specification says Web MUST NOT persist “tokens,” while the verified local API contract requires retaining readable CSRF across reload; the child spec must distinguish bearer/refresh credentials from the persisted CSRF value.
- The parent remains a cross-repository umbrella; changing or closing its API tasks from this child would destroy scope integrity and auditability.

### Ready for Proposal
Yes. The proposal should define this change as a Web-only reconciliation that supersedes only the parent Web session-client execution slice, preserves parent provenance, excludes all API/runtime and recovery work, and carries the four identified verification gaps into specification, design, and tasks.
