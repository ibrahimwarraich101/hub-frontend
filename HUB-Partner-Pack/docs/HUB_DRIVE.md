# HUB Drive: first service module

Design summary consolidated on 20 October 2026 from REQUIREMENTS.md, SERVICES.md and the reviewed ERD constraints. This does not introduce approved REST contracts or claim working ride functionality.

## Purpose and actors

A customer requests a ride from a pickup point to a destination. An eligible driver accepts and performs it. Both clients use the same backend service and records. Customer access is limited to their own rides; only the assigned authorized driver may progress an assigned trip. Administration does not imply unrestricted ride mutations without an agreed policy.

Core scope: pickup/destination, maps, route distance, fare estimate, eligible nearby drivers, ride request, acceptance/rejection, lifecycle, trip details, history and eligible completed-ride reviews. Continuous live tracking and smarter matching are Advanced; commercial dispatch/dynamic pricing are Future.

## Intended flow

1. Authenticate and establish the permitted customer/driver role and profile.
2. Customer chooses pickup/destination. Backend validates coordinates and obtains/verifies the route and quote under the agreed pricing policy.
3. Customer confirms a valid quote. Backend creates the engagement, Requested ride and first history row atomically, using the idempotent customer request key.
4. Eligible drivers can accept/reject. Acceptance atomically claims an unassigned Requested ride; rejection does not assign it or cancel it for everyone.
5. The assigned driver advances Accepted -> InProgress -> Completed. Cancellation permissions/windows must be agreed before exposing cancellation.
6. Completion fixes final fare and records completion/history, creating one Pending transaction atomically. Payment is a separate shared workflow; completing a ride does not prove payment success.
7. Customer/driver see their permitted history. The engagement customer may submit one review for a completed eligible ride. Successful verified transactions feed spending summaries.

## Persistent design

Read the exact types/nullability in [Data_Dictionary.md](ER%20Diagrams/Data_Dictionary.md) and the ride/payment rules in [Database_Constraints.md](ER%20Diagrams/Database_Constraints.md).

- users, roles, user_roles and sessions support identity; driver_profiles links to the driver account.
- vehicles belongs to driver_profiles; active vehicle and capacity are checked before assignment.
- service_engagements owns customer_id, kind, request_key and completion metadata.
- rides.id is PK/FK to the engagement. Route endpoints, quote/final fare, currency, assignment, status and version live in rides.
- engagement_status_history records accepted transitions. Driver/vehicle may be absent before assignment; both are required for Accepted/InProgress/Completed and must match ownership.
- transactions, payments and verified payment events support charging and reconciliation. Reviews/notifications reference the engagement where relevant. No separate RideFare/RideRating table or ExpenseEntry ledger is required by this model.

## Rules both clients must respect

- A quote is not a stored ride. Validate its customer, route, amount/currency and expiry on request. The design allows a secure short-lived quote token or server-side quote record; storage method is undecided.
- Protect acceptance from two drivers claiming the same ride. Prevent a driver having concurrent Accepted/InProgress rides and a customer creating conflicting active rides using the documented locking/uniqueness design.
- Idempotency means duplicate compatible requests return the original operation, not a second ride/obligation. Conflicting reuse must be rejected.
- Backend role/ownership checks remain authoritative even if the client hides buttons. Reject invalid/stale transitions and handle concurrent updates.
- Route/fare information from clients is untrusted. Coordinate bounds, currency and nonnegative fares require validation.
- Payment Pending/Processing/Successful is distinct from Requested/Accepted/InProgress/Completed/Cancelled ride state.

## Website and Android/iOS behavior to implement

Provide pickup/destination selection, quote display, request confirmation, waiting/no-driver feedback, trip details and status, driver availability/request actions, history and eligible reviews. These are required behaviors, not implemented route filenames or screen designs.

Handle loading, empty results, network/provider errors, expired/changed quotes, duplicate taps and rejected/stale operations. For location denial, explain the limitation and provide usable location selection where the chosen UI supports it. Reconcile displayed ride/payment state with the server after reconnecting. Exact navigation, update transport and permission APIs belong to each client's implementation.

## Contract and business decisions still open

- Exact REST methods/routes, DTO fields, error/status-code contract and API serialization of money, coordinates, timestamps and units.
- Authentication/session strategy, driver onboarding/approval and role grants.
- Fare formula, distance/time units, supported currencies, quote expiry and final-fare calculation.
- Nearby-driver radius/filtering, capacity request behavior, location freshness and no-driver timeout/assignment policy.
- Cancellation/no-show permissions, windows and financial outcomes. Do not introduce fees/refunds by assumption.
- Update transport (polling/realtime), notification delivery and cross-platform maps integration.
- First history-row from_status convention, complete allowed transition table, version initialization and update policy.
- JazzCash integration method and provider-specific verification/retry behavior.

Resolve these for each chosen milestone before implementation depends on them. Neither SSD operation names nor table fields establish API endpoints.

## Acceptance scenarios to verify during implementation

Valid quote/request; expired/altered quote rejection; duplicate request handling; driver acceptance race; driver/vehicle ownership; unauthorized history/transition denial; valid progression and invalid transition rejection; one completion obligation; uncertain payment without duplicate charge; completed-ride review eligibility; browser/Android/iOS error and reconnect states.

These are verification targets, not passed tests. Current source inspection found mobile starter screens and a backend weather-forecast starter, with no implemented HUB Drive endpoints or persistence.
