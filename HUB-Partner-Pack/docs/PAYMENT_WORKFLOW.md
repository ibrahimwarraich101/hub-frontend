# HUB — Payment Workflow

## Current Implementation Status (19 October 2026)

- JazzCash is selected for sandbox payments. The integration method remains undecided.
- The frontend and sibling backend currently contain starter application code; no HUB payment integration has been implemented.
- Refunds are deferred; no refund status/workflow is introduced in the current schema.
- Payments are a shared backend capability for service modules, with records feeding unified history and expense tracking. The order, ride, booking, or bill retains its own business lifecycle.
- JazzCash payment collection does not by itself establish utility/education bill validation or settlement. Those workflows depend on the separately documented bill-aggregator/provider integration.
- Provider reference material is maintained separately from this portable pack. Obtain the approved JazzCash merchant onboarding/integration material before implementing an adapter; the pack contains no provider credentials and does not prove enabled merchant capabilities.
- Work is incremental: explain the next step, implement that step, verify it, then document the actual outcome. No payment endpoint, database migration, or sandbox transaction is claimed complete by this review.

## Important Principle

HUB should not act as an independent bank or unlicensed stored-value institution.

Real payment processing should use an authorized payment provider.

---

## FYP / Sandbox Flow

```text
Customer
   |
   v
HUB Website / Mobile App
   |
   v
HUB Backend
   |
   v
Payment Provider Sandbox
   |
   v
Payment Result / Verification
   |
   v
HUB Backend updates Transaction
   |
   v
Order / Booking / Bill marked accordingly
```

Sandbox transactions are test transactions and must not be represented as real money movement.

---

## Production Conceptual Flow

```text
Customer
   |
   | payment
   v
Licensed Payment Provider
   |
   +------> required settlement / merchant flow
   |
   v
HUB receives verified transaction status/reference
   |
   v
HUB updates service record
```

HUB should store:
- transaction reference,
- amount,
- service reference,
- provider reference,
- status,
- timestamps.

HUB should not store:
- raw card number,
- CVV,
- payment provider credentials in source code.

---

## Payment Statuses

Current schema payment-attempt statuses: Pending, Processing, Successful, Failed, Cancelled.

Transaction-obligation statuses: Pending, Successful, Failed. Service statuses are separate. Provider response codes must be mapped through the adapter; do not add Refunded or use one enum for every lifecycle. See [Database_Constraints.md](ER%20Diagrams/Database_Constraints.md).

---

## Payment Verification

Never trust only a website or mobile client success screen.

The backend should verify payment status through:
- provider API,
- secure callback/webhook,
- or another provider-supported verification mechanism.

---

## Bill Payment Flow

```text
User enters/scans bill
        |
        v
OCR extracts fields (optional)
        |
        v
User confirms important fields
        |
        v
Bill aggregator validates reference; backend stores Validated request
        |
        v
User confirms payment; backend revalidates invoice/expiry/ownership
        |
        v
Backend atomically creates/returns the single transaction
        |
        v
Payment provider / bill provider flow
        |
        v
Backend verifies collection AND bill/fee fulfilment
        |
        v
History and derived spending reflect verified transaction state
```

---

## Production Considerations

Actual commercial deployment may require:
- KYC,
- AML controls,
- merchant/provider agreements,
- settlement agreements,
- regulatory approval,
- reconciliation,
- refunds/disputes,
- secure webhook validation,
- audit logs.

For FYP defense, explicitly separate prototype/sandbox behavior from production requirements.
