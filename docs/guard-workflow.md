# Guard access workflow
## Visitor confirmation and retries

The guard scanner first calls `POST /access/preview`. Scanning never records an access event. The server supplies the resident and unit as read-only fields. The guard enters the visitor name and explicitly confirms entry or exit; `POST /access/validate` revalidates the live pass and authorization at confirmation time. A preview is not approval to open the gate.

Only one preview/submission runs at a time. Failed confirmations retain the exact visitor, direction, QR and client event ID. A lost response may mean the server already recorded the event: retry the pending request to reconcile it. The form stays locked while pending. Explicitly choosing a new reading requires a warning before discarding an unresolved request. Canceling an unsubmitted preview creates no event. Each new reading starts a fresh request identity. No offline authorization or secret cache is supported.

Camera access requires HTTPS (or localhost) and browser permission. If unavailable, the guard can paste the QR payload using the manual fallback; both paths use the same authorized server preview.

## Guard administration

Only administrators can open `/guards`. Accounts are created through `POST /access/guards` with an email, a password of at least 12 characters and an optional display name. Email normalization and account validation belong to the server. Creation does not authorize garita access. Authorization is a separate explicit action through `PATCH /access/guards/:id/gate-authorization`; inactive accounts cannot be toggled in this client. Server failures remain visible.

## Resident arrival inbox

The resident home uses `GET /access/arrivals`, an own-account successful-entry projection. Historical first-load records appear in the inbox without a fresh-arrival announcement. Later unseen stable event IDs produce a foreground banner once; duplicate responses do not repeat it. Refresh is manual or every 15 seconds while visible, and on return to the foreground. This is not background push and does not notify when the application is closed.

Arrival state is scoped to the authenticated user/resident and session-update epoch. Logout, account replacement and session changes clear it; aborted/late responses cannot populate another account's inbox. All requests use the existing session/CSRF-aware API client.
