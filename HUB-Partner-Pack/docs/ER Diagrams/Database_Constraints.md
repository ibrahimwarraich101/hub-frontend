# HUB - Relational constraints and workflow rules

Restored and aligned on 19 October 2026 with the consolidated [HUB_UML_ERD.drawio](HUB_UML_ERD.drawio) and [Data_Dictionary.md](Data_Dictionary.md). These rules originate in the reviewed design of 3 October 2026. They describe enforcement to implement in the backend and migrations; this documentation work does not prove runtime enforcement. Current scope decisions remain authoritative in `docs/DECISIONS.md`.

## Keys, nullability and ownership

- UUID identifiers are primary keys, except `roles.id` (smallint). Every shown FK targets its parent's `id`. `user_roles` has composite PK `(user_id, role_id)`; food/product cart items have composite PK `(cart_id, menu_item_id/product_id)`. A member of a composite PK is not individually unique.
- Fields without `?` are NOT NULL. PKs are NOT NULL. UQ on a field means single-column uniqueness; composite and partial uniqueness is listed below. Ordinary text fields must also receive sensible length/format validation.
- Provider-profile `user_id` is unique, so an account has zero or one profile of each kind. Having a profile does not itself grant a role. Multiple profile kinds and role assignments can coexist on the same user.
- `provider_locations` requires `num_nonnulls(restaurant_id, merchant_id, fitness_provider_id) = 1`. Each nullable FK therefore has optional parent participation; the XOR rule makes the total ownership mandatory.
- User/profile/catalog records referenced by history are soft-disabled. Restrict deletion of service and financial facts. Cascading disposal of session/cart/device data requires an explicit retention policy; never cascade away historical orders because a product is removed.
- All access is checked server-side by authenticated role **and ownership**. FKs prove existence, not permission.

## Shared service engagement

`service_engagements` is the persistent supertype. `rides`, `food_orders`, `marketplace_orders`, `fitness_bookings`, `bill_payment_requests`, `education_payment_requests` and Advanced `dining_reservations` each use `id` as both PK and FK to it. One engagement has **exactly one subtype**, with a matching `kind`. Each individual subtype relationship is 1 to 0..1; the collection of subtypes is total and disjoint. Enforce this at commit using deferred constraint triggers across parent and subtype changes. An FK alone cannot enforce the total/disjoint rule.

`UNIQUE(customer_id, request_key)` supports idempotent customer commands. A nullable request key is permitted only for a stored bill/fee request in `Validated` before the user sends `payUtilityBill` / `payEducationFee`. At the first accepted confirmation, lock the engagement, set the command's key and create/return the unique transaction atomically. All other new service commands require a non-empty key. Once assigned, the key is immutable. Same-customer duplicate keys must return the original compatible operation or a conflict; they must never silently repurpose a different service record. Repeated confirmation after an existing transaction returns that transaction without creating a second obligation. Failed requests retain their assigned key; a later payment retry does not create a second engagement.

The customer is derived through the engagement rather than copied into each subtype. `completed_at` records actual service completion, not merely payment authorization. `engagement_status_history` stores each accepted transition; its nullable actor means a trusted system transition. Insert the first status-history row in the same transaction as service creation. Do not fabricate an administrator for automated changes.

## Ride invariants

- Requested/Cancelled-before-assignment rides may have null `driver_profile_id` and `vehicle_id`. Both must be present for Accepted/InProgress/Completed. Require either both null or both nonnull; if nonnull, the vehicle must belong to that driver. Enforce ownership with an appropriate composite FK or a constraint trigger.
- Atomically claim a Requested/unassigned ride. A partial unique index on `driver_profile_id` for Accepted/InProgress prevents concurrent active rides for one driver. To prevent conflicting active rides for a customer, serialize ride creation on the customer row and check existing Requested/Accepted/InProgress rides, or implement a corresponding cross-table constraint trigger.
- Driver availability, active vehicle and capacity are checked before assignment. Driver rejection creates no assignment and leaves Requested. Only the assigned driver can advance the lifecycle.
- Validate coordinate ranges, paired driver coordinates, currency and nonnegative quoted/final fares. `final_fare` is null before completion. Completion fixes it, writes history and creates one Pending transaction atomically.
- A quote is not a stored ride. SSD-03's quoteId/expiry may be an authenticated short-lived quote token or cached server record; verify customer, route, amount/currency and expiry before request creation. This ER model does not require a persistent quote table. `startedAt` is available from the InProgress history transition.

## Food and marketplace

- `UNIQUE(user_id, restaurant_id)` on food carts; `UNIQUE(user_id, merchant_id)` on product carts. The FYP uses one current cart per provider context. Carts allow zero lines; submitted orders require **at least one** line.
- Positive quantities, nonnegative unit prices/totals and one currency per order are mandatory. Cart/order item ownership must match the restaurant/merchant through the catalog. Deferred transaction-time checks enforce line ownership, nonempty submitted orders and totals; basic FKs are insufficient.
- Copy names and prices into order lines at checkout. Preserve these historical snapshots when catalog names/prices change. Restrict deletion of referenced products/menu items.
- Reserve tracked product stock atomically, locking products in stable order. `stock_quantity IS NULL` means untracked; otherwise require nonnegative stock. Roll back the whole checkout on shortage. `inventory_released` starts false and gates a single restoration of reserved tracked quantities on permitted cancellation. Conditional updates/version checks prevent lost updates.
- Orders follow AwaitingPayment -> Placed -> Accepted -> Ready -> Completed. Definitive unpaid failure cancels; unknown payment leaves AwaitingPayment. Only the owning provider advances fulfilment. Completed means confirmed handoff/collection, not a new delivery-fleet service.
- Permitted paid cancellation preserves the Successful financial fact, flags the successful payment's `resolution_required`, and requires external provider resolution. It does not invent an automatic refund or remove historical spending.
- Advanced dining reservations require a supporting restaurant, positive party size and a valid future reservation time. They are not required by the core food-order sequence.

## Fitness

Schedules require `ends_at > starts_at`, positive capacity, `0 <= reserved_seats <= capacity`, nonnegative price and a currency. Booking seats must be positive. Reserve only an open future schedule, under a schedule-row lock. PendingPayment and Confirmed consume seats. Reconcile the cached reserved count with those bookings. `reservation_released` gates a single release when an unpaid attempt definitively fails or an authorized booking cancellation occurs; unknown payment keeps the hold.

The immutable transaction amount/currency is the booked price snapshot; later schedule edits must not alter it. Successful verified payment changes PendingPayment to Confirmed; only the owning provider may mark an occurred Confirmed activity Completed. Paid cancellation flags provider resolution without assuming a refund.

## Utility and education requests

`prepareUtilityBill` / `prepareEducationFee` stores a Validated request after authoritative inquiry. There is no transaction yet. Closing that screen does not start payment. Store the verified amount/currency, provider inquiry reference, validation timestamp, conservative inquiry expiry and the actual invoice/bill-period identifier (`obligation_reference`). This is separate from a recurring consumer or student reference.

At confirmation, revalidate expiry, ownership and unpaid status. Changed details require a new user confirmation. Enforce partial uniqueness on `(biller_id, obligation_reference)` for utility requests, and `(institution_id, obligation_reference)` for education requests, while status is PendingPayment or Paid. This prevents duplicate active/paid invoices across customers/drafts without preventing next month's bill or a different fee invoice. PendingPayment includes unresolved collected funds; do not release this protection while resolution remains uncertain. If a provider lacks a reliable invoice identity, the adapter must derive a stable authoritative obligation key and document it; a raw student/customer reference is not sufficient.

State vocabulary: Validated, PendingPayment, Paid, Failed. Paid requires both successful collection and authoritative fulfilment. Collection success with unknown/failed fulfilment remains pending reconciliation, with `resolution_required` as applicable; it must not invite a second charge. A definitive no-collection failure can become Failed. Before retrying a failed bill request, refresh the inquiry and reconfirm any changes under the same engagement and transaction.

Advanced OCR: `CHECK (num_nonnulls(bill_request_id, education_request_id) <= 1)`. Both may be null during extraction. If linked, the request's customer must equal `ocr_scans.user_id`. Treat extracted JSON as untrusted; `confirmed_at` means user review, not aggregator validation. Manual entry remains available. Do not store raw scans indefinitely without a retention policy.

Advanced family grouping remains utility-bill organization: linked group's user must equal the bill request's customer. It grants no cross-account access or stored value. Education payment support is independent of grouping.

## Transactions and payment verification

`transactions.engagement_id` is unique: a payable engagement has one obligation, with zero or many payment attempts. A draft bill or uncompleted ride may have no transaction. Immutable obligation amount/currency comes from the accepted service price; payment attempt amount/currency must match it.

Required uniqueness:

- `UNIQUE(transaction_id, idempotency_key)` on payments.
- Partial unique `payments(transaction_id)` where status is Pending or Processing, preventing concurrent active attempts.
- Partial unique `payments(transaction_id)` where status is Successful.
- Unique `(provider, provider_reference)` for nonnull references.
- Unique `(provider, event_reference)` on verified payment events. A polled response without an external event ID uses a reproducible adapter verification key in a distinct documented namespace; do not invent a provider-issued ID.

Also lock the transaction for every initiation/result: the two separate partial indexes alone do **not** prevent one Successful attempt coexisting with a new Processing attempt. Reject new charging once success exists. Resolve uncertain initiation against the provider's idempotency/reference before retrying. Definitive retry is allowed only if the linked service remains payable with valid reservations; cancelled order/fitness reservations are not silently resurrected.

Payment statuses: Pending, Processing, Successful, Failed, Cancelled. Transaction statuses: Pending, Successful, Failed. Refund implementation is deferred; no refund status, workflow or schema is introduced here. Pending/Processing leaves the obligation Pending. Definitive no-collection failure makes it Failed, and a permitted retry returns it to Pending. Successful is never downgraded by a stale event.

Additional verification fields:

| Field | Allowed meaning |
|---|---|
| collection_status | Unknown, Pending, Successful, Failed, Cancelled; authenticated collection result |
| fulfilment_status | NotRequired for rides/orders/fitness; Unknown, Pending, Successful or Failed for bill/fee settlement |
| fulfilment_provider / fulfilment_reference | Identifies the authoritative bill/fee fulfilment evidence, when available |
| last_verified_at | Time of last authenticated verification; null before any verification |
| resolution_required | True for collected funds awaiting failed/unknown fulfilment resolution or a paid service cancellation |

A Successful attempt requires collection_status=Successful and fulfilment_status in (NotRequired, Successful), with nonnull verification/completion timestamps and provider reference. Bill/fee success also requires its fulfilment provider/reference. NotRequired is forbidden for bill/fee payments. Unknown/pending collection or collected funds with unresolved fulfilment keeps Processing, blocks another charge and retains holds. A definitively failed fulfilment after collection sets resolution_required; do not treat the collected amount as uncollected.

Authenticate callbacks/status evidence and match attempt, provider, amount/currency and linked service before recording verified events. Reject untrusted evidence without changing financial state. Use immutable verified event identifiers, provider-supported ordering/current-status inquiry and row locking to reject duplicate/stale regressions. `received_at` alone is not proof of provider event order. Keep minimal verification metadata; never persist card numbers/CVV or secrets.

Apply event, attempt status, obligation status, service transition, applicable hold release and persisted notification atomically in PostgreSQL. Provider calls occur outside that local transaction. Push delivery can fail/retry independently. A database transaction cannot atomically commit an external provider operation; reconciliation handles this boundary.

## Reviews, history, expenses, notifications and recommendations

- One review per engagement (`engagement_id UNIQUE`); author must equal the engagement customer; rating 1-5. Eligible kinds are completed rides, food orders, marketplace orders and fitness bookings. Require the subtype's Completed state and engagement completion timestamp. Billing and dining are not silently made reviewable. Preserve author/target on moderation.
- Expenses are a query over `transactions.status = 'Successful'`, joined through engagements to customer. Group by category, customer-selected calendar period/timezone and currency. Never sum currencies together or count failed/retried attempts as extra spending. Successful transactions with paid service cancellation remain recorded until a separately designed provider refund is confirmed. Activity history also includes pending/failed service records.
- Notifications always reference a recipient; engagement is optional for account messages. `read_at` nullable captures read state; nonnegative attempt_count and delivery status support retry. Unique device token prevents simultaneous duplicate ownership; token registration/reassignment must authenticate the device/user association.
- Recommendation interaction targets are typed optional FKs. Exactly one target for view/click/cart/purchase/booking/rating item events; zero for search/context-only events. Validate target accessibility and event_type in application code. `UNIQUE(user_id, category, value)` on preferences. Logs plus existing catalog/history are adequate for the baseline and ML experiments; no mandatory model-training tables are added.
- Audit entries are append-only, require actor/action/reason/time, and preserve optional target-user/review associations. JSON details can describe additional records but are not a substitute for payment/service FKs. Administrative permissions are checked in the backend.

## PostgreSQL implementation notes

Use numeric(12,2) for money, char(3) plus a supported-currency validation for currency and timestamptz for instants. Add checks for positive quantities, permitted enum values and coordinate ranges. Use CHECK for row-local invariants, and FK/UNIQUE/appropriate deferred triggers and application transactions for cross-table rules. Index frequently queried FKs; PostgreSQL does not automatically index all referencing FK columns. In particular index engagement customer/time, notification user/time, interaction user/time, schedule activity/time and transaction status/completion time. Version fields support optimistic concurrency in addition to explicit reservation/assignment locks.

Reference: [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html). Read these rules alongside the shared HUB requirements, architecture and feature specifications. SSD references name the intended use-case operations; they are not established REST endpoint names. Later implementation must translate these documented invariants into migrations and integration tests; diagram validation cannot establish database runtime enforcement.

## Implementation decisions still to resolve

Provider-specific API fields, fare calculations, cancellation permissions/windows, detailed role onboarding, token policy, retention durations and API DTOs must be agreed in the relevant feature specifications. Do not infer them from this ERD. Exact migration SQL, locking strategy and concurrency tests must be validated during backend implementation. No refund workflow, HUB Credits or independent banking functionality is introduced.
