# HUB — Current Decisions

This file records important current project decisions.

Codex should check this file before suggesting architecture or scope changes.

---

## Technology

- Backend: ASP.NET Core Web API
- Main language: C#
- Mobile frontend: React Native (Android/iOS)
- Website frontend: React
- Database: PostgreSQL
- API style: REST
- Main architecture: modular monolith
- ORM/data access: Entity Framework Core where appropriate

---

## Current Service Scope

Included:
- HUB Drive
- Food & Dining
- Grocery & E-Commerce Marketplace
- Fitness & Wellness
- Utility Bill Payments
- Education Payments
- Unified History & Expense Tracking
- Reviews & Ratings
- Notifications
- Recommendation System
- Administration

Removed/deferred from the current compressed service list:
- Package Delivery
- Payment Reminders
- Smart Billing

---

## Payments

- JazzCash is the selected payment gateway for the current sandbox work.
- Hosted checkout/page redirection versus direct API integration is not yet decided. Earlier chat recommendations are proposals, not approved decisions.
- Refund implementation is deferred to a later step.
- Work proceeds one small implementation step at a time. Explain the approach and important choices to the user; update documentation after completed work with actual files, methods, checks, results, and limitations. Do not document planned functionality as implemented.
- Previous HUB Credits concept has been removed.
- Do not recreate the credit ledger unless explicitly requested in the future.
- Use authorized external payment providers for real-world payments.
- Sandbox/test payments must be described as test transactions.
- Do not describe HUB as a bank.

---

## Actors

Current important actors:
- Customer/User
- Rider/Driver
- Restaurant
- Merchant/Grocery Store
- Fitness/Wellness Provider
- Institution/Biller
- Administrator

---

## Recommendation

- Recommendation is a major FYP technical component.
- Begin with explainable baseline/rule-based recommendations.
- Add ML-based recommendation where practical.
- Avoid introducing a large ML infrastructure unless required.

---

## Database

- PostgreSQL is the main database.
- Money values must use decimal/numeric types.
- Use relational integrity and foreign keys.
- Keep schemas modular.

---

## Architecture

- Avoid full microservices for the initial FYP.
- Prefer a modular monolith.
- External APIs should be wrapped behind backend interfaces/adapters.
- Mobile application should not communicate directly with sensitive external payment infrastructure when backend mediation is required.

---

## General Scope Rule

Do not automatically add features simply because Grab, Uber, Foodpanda, ClassPass, Daraz, JazzCash, Easypaisa, or another platform has them.

A feature should be added only when it:
- strengthens the FYP,
- fits the timeline,
- can be demonstrated,
- and is technically justified.

## Client platforms and first module (20 October 2026)

- React website and React Native Android/iOS app use the same ASP.NET Core REST backend.
- The first service module is HUB Drive, with identity and persistence foundations as needed.
- This shared information pack does not assign team responsibilities.
- See [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md) for API coordination and verification.
