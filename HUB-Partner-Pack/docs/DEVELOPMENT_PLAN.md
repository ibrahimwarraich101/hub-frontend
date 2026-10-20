# HUB — Development Plan

Target academic development period: September 2026 to May 2027.

The exact university milestones can override this plan. This is a proposed plan, not a completion log. HUB Drive is the first service module; foundation and identity work below are dependencies, not earlier completed service modules.

---

## Phase 1 — Project Foundation

Goals:
- finalize requirements,
- finalize architecture,
- initialize repositories,
- backend solution setup,
- React website and React Native Android/iOS setup,
- PostgreSQL setup,
- environment configuration,
- coding standards,
- Git workflow.

Deliverables:
- running backend,
- running website and mobile app,
- database connection,
- basic health/test endpoint.

---

## Phase 2 — Identity & Roles

Goals:
- user model,
- authentication,
- JWT/session strategy,
- role management,
- authorization policies,
- profile basics.

Deliverables:
- register,
- login,
- protected API,
- role-based access.

---

## Phase 3 — Shared Platform Foundations

Goals:
- locations/addresses,
- shared transaction model,
- notifications foundation,
- reviews foundation,
- common error handling,
- logging.

---

## Phase 4 — HUB Drive

Goals:
- maps integration,
- pickup/destination,
- fare estimation,
- driver availability,
- ride request,
- ride acceptance,
- ride lifecycle,
- ride history,
- reviews.

Keep live tracking optional until the base flow works.

---

## Phase 5 — Food & Dining

Goals:
- restaurants,
- menus,
- cart,
- food orders,
- order status,
- restaurant management,
- order history.

---

## Phase 6 — Grocery & E-Commerce

Goals:
- merchants,
- categories,
- products,
- cart,
- marketplace orders,
- order status,
- product management.

---

## Phase 7 — Fitness & Wellness

Goals:
- providers,
- activities/classes,
- schedules,
- capacity,
- booking,
- booking management.

---

## Phase 8 — Bills & Education Payments

Goals:
- payment categories,
- bill/reference records,
- OCR prototype,
- bill aggregator adapter/mock,
- payment adapter/sandbox,
- payment history.

---

## Phase 9 — Expense Tracking

Goals:
- unified transaction history,
- category summaries,
- monthly summaries,
- service-specific expense views.

---

## Phase 10 — Recommendation System

Goals:
- interaction logging,
- baseline recommendation rules,
- popularity/location/history ranking,
- evaluation dataset,
- advanced ML model if time permits.

Recommendation work can begin earlier in parallel once interaction schemas are defined.

---

## Phase 11 — Integration & Testing

Testing:
- unit tests,
- API integration tests,
- authorization tests,
- database tests,
- external API failure cases,
- end-to-end scenario testing.

Critical end-to-end demonstrations:
1. Register/login.
2. Request and complete a ride.
3. Place a food order.
4. Place a marketplace order.
5. Book a fitness activity.
6. Process a sandbox/mock bill/payment.
7. View unified history and expenses.
8. Display recommendations.

---

## Phase 12 — Optimization & Finalization

Goals:
- bug fixing,
- performance improvements,
- UI consistency,
- security review,
- documentation,
- deployment/demo setup,
- final defense preparation.

---

## Scope Priority

### Core FYP
- authentication/RBAC,
- PostgreSQL,
- HUB Drive,
- food,
- marketplace,
- fitness booking,
- bill/education payment prototype,
- unified history/expenses,
- notifications,
- baseline recommendation,
- admin basics.

### Advanced
- OCR,
- improved recommendation model,
- live ride tracking,
- richer analytics,
- provider dashboards.

### Future Commercial
- large-scale dispatch,
- complex settlements,
- production banking/payment relationships,
- sophisticated fraud detection,
- enterprise-scale microservices,
- full commercial marketplace logistics.
