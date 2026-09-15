## Exploration: Phase 3 Web Announcement Communication

### Current State
Baseline `567801c7ce611f4ddf33b17d0969dd87eff6a51e` already has an ADMIN-only `/announcements` route and navigation entry. `AnnouncementsPage` uses the canonical session-aware `api()` transport and already requests server-shaped `{ items, total, page, pageSize }` results with `search`, enum `status`, `page`, and `pageSize`; therefore the roadmap statement that server pagination is still missing is stale for this baseline. The page also creates drafts or immediately published announcements, edits title/body, confirms publish/withdraw actions, corrects an out-of-range page after mutations, and renders loading, empty, filtered-empty, retry, modal validation, and focused confirmation-error states.

The current announcement model remains page-local and transitional: `status`, `updatedAt`, and `author` are optional, `author` omits `id`, and no `createdAt` contract is represented. `src/api/contracts.ts` pins only the Phase 2 resident/unit API SHA and has no announcement DTO, query, payload, endpoint builder, response-field matrix, lifecycle matrix, or exact error contract. Current announcement tests mock `api()` and prove enum filtering, page changes, validation bounds, duplicate-create suppression, empty-state distinction, focused publication errors, and page correction, but they do not pin an immutable announcement API contract or prove exact create/edit/publish/withdraw/archive requests, ADMIN/forbidden responses, stale-result fencing, author/date rendering, field-error shapes, or archival behavior.

Confirmed gaps are:

- `ARCHIVED` is neither selectable nor actionable. An archived response would currently be displayed as “Borrador” and could be edited or published.
- List loading uses cancellation but no generation/owner check, does not clear retained rows on terminal `401`/`403`, and treats authorization failures as generic retryable errors. Phase 2 established stricter fail-closed and stale-response behavior.
- Publish/withdraw actions have a busy flag but no per-action abort/ownership fencing. Closing or superseding a dialog cannot prevent a late action from reloading visible state.
- Create/edit failures are copied into both modal and page errors; create has no dirty-form discard guard, and edit/publish/archive action availability is not modeled by lifecycle state.
- Dates show only optional `updatedAt` as a locale date. Created time, publication time, status-specific labels, and timezone/display policy are absent.
- Author fallback is tolerated, but required author identity and safe display fields are not contract-bound.
- The body is safely rendered as React text with `whitespace-pre-wrap`; no rich-text/HTML renderer exists. This safe boundary must be preserved unless a separate sanitized-format contract is approved.

The canonical Phase 2 patterns are the right reference: centralized request builders and DTOs in `src/api/contracts.ts`, exact pinned-contract tests, canonical `api()` usage, server-owned filtering/pagination, explicit unauthorized/forbidden/general states, data clearing on terminal failures, generation plus `AbortController` ownership, separate lifecycle confirmations, focused `role="alert"` failures, field feedback through `applyApiFieldErrors`, dirty-create confirmation, and stale-success/failure suppression. Vitest plus Testing Library component tests mock the API boundary; no browser E2E harness is present.

The roadmap explicitly keeps the resident mobile application outside `sigra-web` and assigns it to a separate future Expo project. This Web change may consume an agreed shared API contract and preserve compatibility, but it must not implement the mobile client, offline synchronization, cursor storage, push notifications, or resident routes.

### Current Handoff
- **Completed:** API phases 3A and 3B are archived, 3C is complete, and 3D implementation is complete at `b71d20dc49b0cca77faeacd6392fc2faeb756776`.
- **Current:** API `develop` stops after that 3D implementation commit, with 12 of 22 tasks complete.
- **Next:** Implement 3E (resident HTTP route), then 3F (ADMIN OpenAPI), 3G (RESIDENT OpenAPI/SHA), verification, and archive.
- **Blocked:** Resume Web implementation only after the API contract is complete and the six existing product decisions below are resolved.

### Affected Areas
- `src/pages/AnnouncementsPage.tsx` — existing list, create/edit forms, publish/withdraw confirmation, filters, pagination, metadata rendering, and all lifecycle gaps.
- `src/pages/AnnouncementsPage.spec.tsx` — existing component proof to extend for exact UX states, actions, accessibility, races, and contract integration.
- `src/api/contracts.ts` — appropriate boundary for pinned announcement DTO/query/payload types, request builders, response fields, error matrix, and lifecycle semantics.
- `src/api/contracts.spec.ts` — appropriate place to pin one immutable Phase 3 API SHA and exact announcement paths, methods, payloads, responses, errors, and sensitive-field exclusions.
- `src/api/client.ts` and `src/api/client.spec.ts` — canonical credentialed transport, bearer/session refresh, retries, cancellation, and normalized `ApiError`; preserve rather than change for this feature.
- `src/App.tsx` and `src/App.spec.tsx` — existing ADMIN-only route; focused route/role proof is incomplete for announcements.
- `src/components/Shell.tsx` and `src/components/Shell.spec.tsx` — existing ADMIN navigation and guard exclusion; preserve responsive accessible naming.
- `src/components/ConfirmDialog.tsx` — established focus-preserving confirmation and failure pattern for publish, withdraw, and archive.
- `src/components/FieldFeedback.tsx` — established mapping from API `details` to named title/body fields with focus and accessible descriptions.
- `src/components/ui/modal.tsx`, `src/components/PageState.tsx`, and `src/components/Pagination.tsx` — established modal, page-state, and server-pagination primitives.
- `docs/backend-phase-3.md` — directional requirements, not immutable implementation evidence; it leaves key lifecycle choices unresolved.
- `docs/implementation-roadmap.md` and `docs/mobile-phase-6.md` — prove that mobile implementation belongs to a separate Expo repository/phase.

### Approaches
1. **Incremental contract-first completion** — pin the real Phase 3 API contract, add announcement builders/types, and harden the existing page with Phase 2 lifecycle, accessibility, and race patterns.
   - Pros: Reuses proven UI and session boundaries; limits regression and review scope; exposes contract drift directly; keeps Web and mobile ownership separate.
   - Cons: `AnnouncementsPage` remains a relatively large page-local component; implementation cannot begin safely until backend semantics and product decisions are fixed.
   - Effort: Medium

2. **Announcement feature-module rewrite** — replace the page with feature hooks, repositories, generalized forms, and lifecycle abstractions before completing behavior.
   - Pros: Could improve long-term separation and reduce page-local state.
   - Cons: High churn around working behavior, duplicates the canonical `api()` boundary, increases race and session regression risk, and is likely to exceed the 400-line review budget without adding Phase 3 value.
   - Effort: High

### Recommendation
Use incremental contract-first completion. Preserve `api()`, the existing ADMIN route, React text rendering, `Pagination`, `Modal`, `ConfirmDialog`, `FieldFeedback`, and `PageState`. Add only the smallest announcement-specific contract boundary and page-state hardening needed to make the current prototype conform to a fixed API.

The required API handoff before proposal is one immutable API commit SHA (and preferably its OpenAPI artifact) that proves:

1. Exact admin list query encoding, enum values, defaults, maximum `pageSize`, stable ordering, and whether `status=ARCHIVED` is the sole way to retrieve archives.
2. Complete DTO fields and nullability for `id`, `title`, `body`, `status`, `publishedAt`, `createdAt`, `updatedAt`, and `author { id, name, email }`, with an explicit sensitive-field exclusion.
3. Exact create and partial-update payloads, response statuses/bodies, title/body normalization, and `details` paths matching form names.
4. Whether publish/withdraw remain `PATCH { published: boolean }` or become explicit transition endpoints; their idempotency, legal source states, response body, and conflict behavior.
5. The meaning of `publishedAt` after withdrawal and republication, including whether it records first publication, latest publication, or current visibility only.
6. The logical archive endpoint (`POST /:id/archive` is preferred over physical `DELETE`), idempotency, legal source states, post-archive visibility, and whether restore exists. Physical deletion is outside the recommended scope.
7. Exact normalized `400/401/403/404/409` envelopes and server-side authorization/audit guarantees. The Web must not infer authorization or claim audit completion from UI notices.

Recommended bounded Web UX:

- **List:** server-owned search across title/body, one status filter with `ALL`, `DRAFT`, `PUBLISHED`, and `ARCHIVED`, page reset on filter changes, stable pagination, metadata for author and relevant dates, and distinct registry-empty versus filtered-empty states.
- **Create:** keep one modal with title/body bounds and explicit “publish immediately” only if product confirms it; otherwise create draft first. Add dirty-form discard protection and exact field errors.
- **Edit:** edit title/body in place, preserving author/created time. Keep publication state unchanged if product accepts the backend document recommendation; do not silently withdraw on edit.
- **Publish/withdraw:** separate explicit confirmation actions, legal-state visibility, idempotent retries, focused errors, and stale-action fencing. A withdrawn item becomes `DRAFT`, not archived.
- **Archive:** separate destructive logical-archive confirmation. Archived rows remain discoverable via the status filter and should be read-only unless restore or another legal transition is explicitly contracted.
- **Security/rendering:** continue rendering title/body as escaped React text; do not add `dangerouslySetInnerHTML`, markdown, links, or rich text in this change. Treat server authorization and validation as authoritative, retain canonical session transport, expose no credentials or sensitive author fields, and avoid logging announcement bodies or error payloads containing content.
- **Out of scope:** mobile UI/client, resident announcement endpoint implementation, cursor/offline synchronization, withdrawal tombstones, push registration/delivery, rich text, scheduling, attachments, announcement detail routing, API/session transport changes, and backend audit implementation.

Product must explicitly decide before proposal:

1. Whether editing a published announcement keeps it published (recommended) or returns it to draft.
2. Whether immediate publication during create remains supported or all announcements start as drafts.
3. `publishedAt` semantics across withdraw and republish.
4. Logical archive endpoint and legal transitions, including whether archive is terminal or reversible.
5. Whether archived announcements are excluded by default and retrieved only with `status=ARCHIVED`, and which actions archived rows expose.
6. Whether the administrative UI may display author email or should display name only; name-only is the safer default.

### Risks
- `docs/backend-phase-3.md` is aspirational and permits alternative status/archive designs; implementing from it without a pinned API SHA can produce silent request and lifecycle mismatches.
- Current optional DTO fields can hide an incomplete backend response and mislabel `ARCHIVED` as `DRAFT`.
- Abort-only list handling and unfenced mutations allow stale completions to overwrite newer filters, dialogs, errors, or pagination state.
- Generic retry treatment can retain stale announcement data after `401`/`403`; Phase 2 fail-closed behavior must be carried forward.
- Treating withdrawal as archival, or archival as deletion, would violate historical visibility and audit expectations.
- Rendering future backend HTML or markdown without an explicit sanitization policy would introduce stored-XSS risk; plain text is currently safe.
- Displaying author email unnecessarily increases personal-data exposure; the API and product contract should minimize it.
- Mobile synchronization and withdrawal propagation are real cross-client concerns, but adding them to this Web change would cross repository ownership and make completion claims unverifiable.
- The full hardening may exceed the 400-line review budget; later task planning should split contract proof from page lifecycle/accessibility work rather than compress tests.

### Ready for Proposal
No. Codebase exploration is complete and the recommended Web scope is bounded, but proposal work should wait for the immutable Phase 3 API contract handoff and the six explicit product decisions above. Once resolved, the proposal should remain Web-only and frame mobile compatibility as an API handoff, not a `sigra-web` implementation responsibility.
