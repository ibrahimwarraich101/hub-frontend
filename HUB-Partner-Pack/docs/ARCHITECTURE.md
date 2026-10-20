# HUB — System Architecture

## Recommended FYP Architecture

HUB should use a modular monolithic backend for the FYP.

This provides separation of concerns without the operational complexity of a full microservices architecture.

```text
       React Website / React Native Mobile App
                         |
                         | HTTPS / REST
                         v
                ASP.NET Core Web API
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
 Authentication     Business Modules    Recommendation
 & Authorization       / Services          Logic
        |                |                |
        +----------------+----------------+
                         |
                         v
              Data Access / EF Core
                         |
                         v
                     PostgreSQL


External Integrations:
- Google Maps Platform
- Firebase Cloud Messaging
- Authorized Payment Gateway
- Bill-Payment Aggregator
- Azure Document Intelligence OCR
```

---

## Suggested Backend Layers

### API Layer
Responsibilities:
- controllers/endpoints,
- request/response DTOs,
- authentication,
- authorization,
- input validation,
- status codes.

### Application Layer
Responsibilities:
- use cases,
- orchestration,
- service interfaces,
- business workflows.

### Domain Layer
Responsibilities:
- entities,
- value objects where needed,
- business rules,
- domain enums.

### Infrastructure Layer
Responsibilities:
- EF Core,
- PostgreSQL,
- external APIs,
- notification provider,
- maps integration,
- OCR integration,
- payment integration.

---

## Suggested Backend Modules

- Identity
- Users
- Drive
- Food
- Marketplace
- Fitness
- Bills
- Payments
- Transactions
- Expenses
- Reviews
- Notifications
- Recommendations
- Administration

Each module should remain logically separated even if deployed as one API application.

---

## Frontend Architecture

In the Expo mobile repository, routes and layouts live in `src/app/` and navigation uses Expo Router, as required by the root `AGENTS.md`. Keep reusable components, API clients, hooks, state, and feature logic outside `src/app/`. The structure below is conceptual; its `navigation/` and `screens/` entries do not replace the actual Expo Router route structure.

React Native should use:
- screen/navigation layer,
- reusable UI components,
- API service layer,
- authentication state,
- role-aware navigation,
- module-specific feature folders.

Suggested high-level structure:

```text
frontend/
├── src/
│   ├── api/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── drive/
│   │   ├── food/
│   │   ├── marketplace/
│   │   ├── fitness/
│   │   ├── bills/
│   │   ├── expenses/
│   │   └── recommendations/
│   ├── navigation/
│   ├── screens/
│   ├── state/
│   ├── types/
│   └── utils/
```

---

## Data Flow Example

```text
User Action
   |
   v
React / React Native Screen
   |
   v
API Client
   |
   v
ASP.NET Controller
   |
   v
Application Service
   |
   v
Repository / EF Core
   |
   v
PostgreSQL
```

External API calls should normally happen through infrastructure services, not directly inside controllers.

---

## Why Not Full Microservices?

For this FYP, full microservices would add:
- deployment complexity,
- service discovery,
- distributed transactions,
- observability requirements,
- message broker management,
- more DevOps overhead.

A modular monolith is more suitable while still demonstrating good architecture.

## React website client (20 October 2026)

A separate React website joins the React Native Android/iOS application. Both consume the same ASP.NET Core REST APIs and share identities, backend business rules and PostgreSQL data. Browser navigation and responsive UI are owned by the website repository; Expo Router instructions apply to the mobile repository. Website framework, build tooling, deployment and repository location remain undecided. See [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md).
