# HUB project information: start here

Reviewed 20 October 2026. This folder explains HUB's intended behavior and the boundaries of what has been implemented. It is shared context for the website, mobile application and backend; it does not assign team responsibilities.

## What HUB is

HUB is a FAST-NUCES Computer Science FYP: an integrated platform for rides, food, shopping, fitness, bills/education payments, shared history/expenses, reviews, notifications and recommendations. Customers and service providers use role-appropriate interfaces. A React website and a React Native Android/iOS app consume the same ASP.NET Core REST backend, which accesses PostgreSQL through its data layer. Neither client connects directly to the database.

## Read in this order

1. [Project context](PROJECT_CONTEXT.md), [requirements](REQUIREMENTS.md) and [current decisions](DECISIONS.md).
2. [Roles](USER_ROLES.md), [services](SERVICES.md) and [architecture](ARCHITECTURE.md).
3. [HUB Drive](HUB_DRIVE.md), our first service module. Identity and database foundations remain dependencies.
4. [Database overview](DATABASE.md), [field dictionary](ER%20Diagrams/Data_Dictionary.md) and [constraints](ER%20Diagrams/Database_Constraints.md). Editable draw.io, PNG and SVG versions are included.
5. [Payments](PAYMENT_WORKFLOW.md), [external integrations](EXTERNAL_APIS.md) and [recommendations](RECOMMENDATION_SYSTEM.md).
6. [Development plan](DEVELOPMENT_PLAN.md), [shared development workflow](TEAM_WORKFLOW.md) and [review results](REVIEW_REPORT.md).

The [module record template](MODULE_HANDOFF_TEMPLATE.md) is optional for recording actual implementation and verification.

## How services connect

| Area | Intended workflow |
|---|---|
| Identity | Registration/login, profile, role-aware interfaces; backend checks role and ownership. |
| Drive | Pickup/destination -> quote -> ride request -> acceptance -> trip -> completion -> separate payment/history/review. |
| Food | Restaurant/menu -> provider cart -> checkout/payment -> provider fulfilment -> history/review. |
| Marketplace | Products -> merchant cart -> stock-checked checkout/payment -> fulfilment -> history/review. |
| Fitness | Activity/schedule -> capacity hold -> payment -> confirmed booking -> completed activity/review. |
| Bills/education | Enter or optionally scan reference -> authoritative inquiry -> confirmation -> collection plus bill fulfilment verification -> history. |
| Shared features | Verified transactions feed expenses; eligible completed services allow reviews; status changes support notifications; interaction data supports recommendations. |

The detailed constraints define lifecycle/concurrency rules. Payment success and service completion are separate facts. JazzCash collection alone does not establish utility/education bill settlement.

## Scope boundaries

Core includes the service modules above, identity/RBAC, admin basics, baseline recommendations and shared platform features. Advanced features include OCR, live tracking, dining reservations and improved recommendation models where practical. Recommendations are a major FYP contribution; begin with an explainable baseline and evaluate ML when data permits.

HUB Credits, independent banking, package delivery, payment reminders and smart billing are outside current scope. Refund implementation is deferred. JazzCash is selected for sandbox work; hosted checkout versus direct integration remains undecided.

## Design versus working code

The inspected mobile checkout contains Expo SDK 57 starter screens. The inspected backend targets .NET 10 and contains weather-forecast starter code, with no EF Core/Npgsql packages or HUB Drive implementation found in that inspected source. No separate React website was inspected. These are dated observations about those checkouts, not claims about every partner's repository.

The ERD/dictionary/constraints describe a proposed schema, not applied migrations. BACKEND_READINESS.md is an older machine-specific report, not current setup authority. Exact API DTOs/routes, authentication policy, fares, cancellation and provider details remain open; see HUB_DRIVE.md. Other service modules have requirements and database rules but still need detailed implementation contracts. The development plan is not a completion log.

## Put this information in each code repository

Copy the pack's `docs/` folder into the code repository root and keep START_HERE.md alongside it if desired. Merge the pack's root AGENTS.md guidance into the existing repository-root AGENTS.md; preserve existing platform rules. Do not overwrite mobile instructions with website instructions or vice versa. Avoid committing both the ZIP and another duplicate copy of the pack inside the same repository.

If you instead keep the pack inside an `information/` subfolder, update the repository-root AGENTS.md to point to `information/docs/PARTNER_START_HERE.md` and use that prefix for the other paths. A nested AGENTS.md alone is not the root guide for application code elsewhere in the repository.

Each clone/pull receives the files committed to that repository. This pack contains documentation and diagrams, not application source, credentials or installed dependencies. Keep approved shared changes synchronized with HUB-Documentation, the master reference. Local machine paths in historical reports are not portable setup instructions.

Use [CODEX_START_PROMPT.md](CODEX_START_PROMPT.md) to start a context review. Once coding is authorized, work in small verified milestones and document actual results.
