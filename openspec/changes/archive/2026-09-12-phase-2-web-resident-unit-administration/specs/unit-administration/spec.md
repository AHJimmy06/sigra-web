# Unit Administration Specification

## Purpose

Provide ADMIN unit querying and lifecycle management through the fixed API contract, keeping archival, dependency integrity, and access activation independent.

## Requirements

### Requirement: Fixed-contract unit administration

The Web MUST reconcile unit DTOs, errors, endpoints, and query encoding against one recorded immutable API SHA, use canonical `api()`, and prove exact requests, payloads, and normalized errors with focused contract tests. It MUST NOT alter session transport.

#### Scenario: Filtered paginated query

- GIVEN an administrator selects search, status, and page filters
- WHEN the unit list loads
- THEN the Web sends the exact pinned endpoint with `status=true`, `status=false`, or no `status` parameter
- AND renders server items and total with stable empty and filtered-empty states

#### Scenario: Auth and request failure

- GIVEN the API returns `401`, `403`, or a retryable general failure
- WHEN the list request completes
- THEN the Web renders the exact auth/error state, preserves accessible retry behavior, and never fabricates unit data

### Requirement: Independent unit access and archive lifecycle

The Web MUST keep `active` as an independent boolean for activation/deactivation and MUST provide separate reversible archive/restore actions. The archive filter MUST be distinct from the `status` filter, and archived MUST NOT mean inactive. Archiving MUST reserve the unit code; restoring MUST preserve the code and MUST NOT implicitly activate or deactivate the unit.

#### Scenario: Archive and restore visibility

- GIVEN an administrator confirms a valid archive for a unit with a reserved code and known `active` value
- WHEN the archive and subsequent restore requests succeed
- THEN while archived, the unit is absent from the default non-archived query and appears in the explicit `includeArchived=true` query alongside current units, distinct from `status`
- AND after restore, the unit reappears in the default non-archived query while `includeArchived=true` continues to return current and archived units with its prior `active` value and reserved code unchanged

#### Scenario: Activation remains separate

- GIVEN an archived unit is active or inactive
- WHEN an administrator performs archive, restore, activate, or deactivate
- THEN only the selected state changes and no action is substituted for another

### Requirement: Dependency conflict handling

The Web MUST submit archive requests without client-side reassignment. The API MUST reject archive when ANY dependency exists; the Web MUST surface that conflict, identify the action as unavailable or failed, and MUST NOT offer reassignment or silently deactivate related residents.

#### Scenario: Unit archive conflict

- GIVEN a unit has any resident, ticket, access-history, or other API-reported dependency
- WHEN an administrator confirms archive
- THEN the API conflict is shown in the focused confirmation error and the unit remains unchanged
- AND the UI provides no reassignment path

#### Scenario: Successful archive

- GIVEN the API confirms that no dependency blocks archival
- WHEN archive succeeds
- THEN the unit leaves the default result and remains code-reserved for later restore

### Requirement: Accessible lifecycle, race, and proof behavior

The Web MUST provide accessible confirmations, focus-preserving errors, field feedback, retry controls, loading and empty states, and stale-response protection. Cancellation MUST prevent obsolete list or action results from changing visible state.

#### Scenario: Stale or cancelled list response

- GIVEN a filter/page request is superseded or cancelled
- WHEN its response resolves
- THEN it cannot overwrite the newer result, trigger a later request, or show a cancellation error

#### Scenario: Fixed-API integration proof

- GIVEN the pinned API SHA contract is used by focused tests
- WHEN unit request, archive/restore, dependency-conflict, accessibility, and race tests run
- THEN exact paths, boolean status queries (`true`, `false`, or omitted), payloads, error details, confirmations, and canonical `api()` integration are proven
