# HUB — External APIs

## 1. Google Maps Platform

Use cases:
- pickup selection,
- destination selection,
- geocoding,
- reverse geocoding,
- route/distance calculation,
- maps display,
- location-based recommendations,
- nearby services.

Only enable the APIs/SKUs actually required by the prototype.

---

## 2. Firebase Cloud Messaging

Use cases:
- ride status notifications,
- order status notifications,
- booking notifications,
- payment status notifications,
- important account notifications.

---

## 3. Authorized Payment Gateway

Use cases:
- initiate user payment,
- redirect/host secure payment flow where required,
- receive payment result,
- verify transaction status,
- store gateway reference.

For the FYP:
- sandbox/test mode should be clearly separated from production.
- test payments are not real money.

For production:
- provider agreement,
- KYC,
- AML/compliance,
- settlement,
- regulatory requirements

must be considered.

Do not design HUB as the holder of customer money.

---

## 4. Bill-Payment Aggregator API

Use cases:
- bill/reference validation,
- bill inquiry where supported,
- payment initiation,
- transaction status,
- supported biller/institution access.

Availability depends on the provider and commercial agreement.

For an academic prototype, a sandbox/mock adapter may be required if live access is unavailable.

---

## 5. Azure Document Intelligence OCR

Use cases:
- scan bill images,
- extract printed fields,
- identify reference numbers,
- identify amount,
- identify biller,
- identify due date where available.

OCR output must be treated as extracted data, not automatically trusted.

The user should confirm important payment fields before payment.

---

## API Integration Pattern

Use service interfaces in the backend.

Example:

```text
Application Layer
      |
      v
IMapsService
IPaymentGateway
IBillAggregator
IOcrService
INotificationService
      |
      v
Infrastructure Implementations
```

This makes it possible to use mock implementations during development/testing.
