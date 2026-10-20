# HUB — Codex Project Instructions

## Project Identity

HUB is a Final Year Project (FYP) being developed at FAST-NUCES.

HUB is an integrated multi-service platform inspired by super-app concepts such as Grab, but its scope must remain realistic for a university-level FYP.

The goal is to provide multiple services inside one application using role-based access instead of building separate applications for each role.

Before making architectural, database, or implementation decisions, read the documentation inside the `/docs` folder.

---

## Core Technology Direction

### Backend
- ASP.NET Core Web API
- C#
- Entity Framework Core where appropriate
- PostgreSQL as the main relational database
- REST APIs
- Authentication and authorization
- Role-Based Access Control (RBAC)

### Frontend
- React website
- React Native mobile application for Android and iOS
- Both consume the same ASP.NET Core REST backend. Keep platform-specific tooling/navigation in the relevant repository.

### External Integrations
- Google Maps Platform
- Firebase Cloud Messaging
- Authorized payment gateway
- Bill-payment aggregator API
- Azure Document Intelligence OCR

### Recommendation System
- Rule-based recommendations may be used for early versions.
- A stronger ML-based recommendation component should be included as a major technical contribution where practical.

Do not introduce unnecessary technologies unless they provide a clear FYP benefit.

---

## Main HUB Modules

1. Authentication & Role Management
2. HUB Drive / Ride Hailing
3. Food & Dining
4. Grocery & E-Commerce Marketplace
5. Fitness & Wellness
6. Utility Bill Payments
7. Education Payments
8. Unified Transaction History
9. Expense Tracking
10. Reviews & Ratings
11. Notifications
12. Recommendation System
13. Admin Management

---

## Main User Roles

- Customer/User
- Rider/Driver
- Restaurant
- Merchant/Grocery Store
- Fitness/Wellness Provider
- Institution/Biller
- Administrator

Use one application with role-based interfaces and permissions.

---

## Important Current Decisions

1. PostgreSQL is the main database.
2. ASP.NET Core Web API is the preferred backend.
3. React Native is the mobile frontend.
4. HUB Credits have been removed from the current scope.
5. HUB must not be described or implemented as an independent digital bank.
6. Real-world payments must rely on licensed/authorized payment providers.
7. Package Delivery is not part of the current compressed service list.
8. Payment Reminders are not part of the current compressed service list.
9. Smart Billing is not part of the current compressed service list.
10. Expense tracking remains an important feature.
11. Recommendation remains a major technical feature.
12. Bills and education payments remain in scope.
13. Restaurants are an explicit actor/service partner.
14. Do not silently remove existing approved HUB features.
15. Keep implementation achievable for a university FYP.
16. Separate Core FYP features, Advanced features, and Future Commercial features when planning.

---

## Required Development Behaviour

Before implementing a major feature:

1. Read `docs/PROJECT_CONTEXT.md`.
2. Read `docs/REQUIREMENTS.md`.
3. Read `docs/ARCHITECTURE.md`.
4. Read the relevant module documentation.
5. Read `docs/DECISIONS.md`.
6. Inspect the existing source code before generating replacements.

When modifying code:
- Preserve the existing architecture unless a change is justified.
- Prefer clean, modular, testable code.
- Avoid unnecessary microservices for the FYP.
- Keep database relationships normalized and practical.
- Use DTOs for API contracts.
- Use validation.
- Use dependency injection.
- Use proper authorization policies/role checks.
- Do not place secrets or API keys in source code.
- Use environment configuration for secrets.
- Add migrations when database models change.
- Keep naming consistent across backend, database, frontend, and documentation.

When suggesting features:
- Explain whether the feature is Core, Advanced, or Future.
- Do not expand scope without a clear reason.
- Prefer something demonstrable during the final defense.

---

## Diagram Deliverables

- Whenever creating or updating a diagram, also create matching `.png`, `.svg`, and fully editable `.drawio` versions.
- Keep all versions beside the diagram source (`.puml` or `.mmd`), using the same base filename.
- Use native editable draw.io shapes, text, and connectors; do not flatten the diagram into an image.
- Do not create an `out` folder for diagram exports.

## Documentation Index

Read these files as needed:

- `docs/PROJECT_CONTEXT.md`
- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/USER_ROLES.md`
- `docs/SERVICES.md`
- `docs/DATABASE.md`
- `docs/EXTERNAL_APIS.md`
- `docs/RECOMMENDATION_SYSTEM.md`
- `docs/PAYMENT_WORKFLOW.md`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/DECISIONS.md`
- `docs/CODEX_START_PROMPT.md`
- `docs/PARTNER_START_HERE.md`
- `docs/HUB_DRIVE.md`
- `docs/REVIEW_REPORT.md`

If a conflict exists between older code/comments and `docs/DECISIONS.md`, treat `docs/DECISIONS.md` as the current project decision record unless the user explicitly changes it.

Shared documents describe intended behavior. Inspect local source before claiming implementation. Preserve repository-root platform instructions. The first service module is HUB Drive.
