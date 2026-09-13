# Resident Administration Specification

## Purpose

Provide ADMIN resident querying and detail management through the fixed API contract while preserving access activation as a separate state from reversible archival.

## Requirements

### Requirement: Fixed-contract resident administration

The Web MUST reconcile resident DTOs, errors, endpoints, and query encoding against one recorded immutable API SHA, use the canonical `api()` client, and prove exact requests and responses with focused contract tests. It MUST NOT alter session transport or expose credentials or password data.

#### Scenario: Filtered paginated query

- GIVEN an authenticated administrator selects search, unit, status, and page filters
- WHEN the resident list loads
- THEN the Web sends the exact pinned endpoint with `status=true`, `status=false`, or no `status` parameter
- AND renders the server `items` and `total` without local re-filtering

#### Scenario: Unauthorized or forbidden query

- GIVEN the API returns `401` or `403`
- WHEN the list request completes
- THEN the Web renders the exact normalized auth/error state and does not show resident data
- AND a retry action remains available where retry is meaningful

### Requirement: Resident detail states

The Web MUST provide resident detail navigation for an administrator with explicit loading, not-found, unauthorized/forbidden, general error, and retry states. A stale or cancelled response MUST NOT replace newer detail or list state.

#### Scenario: Detail lifecycle

- GIVEN an administrator opens a resident
- WHEN the request is pending, returns `404`, returns `401`/`403`, fails otherwise, or succeeds
- THEN the Web renders respectively loading, not-found, exact authorization, retryable error, or complete detail state

#### Scenario: Stale detail response

- GIVEN two detail requests are issued and the older response resolves last
- WHEN responses are received
- THEN only the newest request may update the view

### Requirement: Reversible resident archive lifecycle

The Web MUST offer explicit archive and restore actions only in the applicable resident states, confirm destructive actions accessibly, and preserve focus and announced errors on failure. Archiving MUST be reversible, MUST reserve the resident email, and MUST deactivate the resident and linked user; restore requires an intact identity and active unit, then leaves both inactive. The archive filter MUST be distinct from the `status` filter.

#### Scenario: Archive, restore, and visibility

- GIVEN an administrator archives a resident whose `active` value is `false` and confirms
- WHEN the archive and subsequent restore requests succeed
- THEN while archived, the resident is absent from the default non-archived query and appears only in the explicit archived-only query distinct from `status`
- AND after restore, the resident leaves the archived-only result and reappears in the default non-archived query with `active=false`

#### Scenario: Archive conflict or failure

- GIVEN archive/restore returns a contract error or network failure
- WHEN the action completes
- THEN the confirmation stays open, the exact normalized error is announced and focused, and retry repeats the same action without changing list state

### Requirement: Accessible resident operations and bounded options

The Web MUST retain accessible validation, confirmations, focus management, field errors, retries, and empty/not-found states. Unit options used by resident forms MUST load with bounded requests, cancellation, and stale-response protection; cancellation MUST stop further traversal and MUST NOT surface as an error.

#### Scenario: Cancelled option loading

- GIVEN a resident form is closed or superseded while unit options are loading
- WHEN an outstanding response resolves
- THEN no state is updated, no later page is requested, and no error is shown

#### Scenario: Fixed-API proof

- GIVEN the pinned API SHA contract is available to tests
- WHEN focused resident contract, lifecycle, accessibility, and race tests run
- THEN exact paths, query strings, payloads, error details, and canonical `api()` usage are proven without changing session behavior
