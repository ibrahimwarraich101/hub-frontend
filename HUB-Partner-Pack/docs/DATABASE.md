# HUB database design

Reviewed for sharing on 20 October 2026. This is a proposed PostgreSQL schema, not an applied database or completed EF Core implementation.

## Authoritative design files

- [Editable ERD](ER%20Diagrams/HUB_UML_ERD.drawio), [PNG](ER%20Diagrams/HUB_UML_ERD.png), [SVG](ER%20Diagrams/HUB_UML_ERD.svg).
- [Table and field dictionary](ER%20Diagrams/Data_Dictionary.md).
- [Relational constraints and workflow rules](ER%20Diagrams/Database_Constraints.md).

Read all three together. The diagram supplies structure, the dictionary supplies field types/nullability, and the constraints supply cross-table rules and concurrency requirements. Current scope decisions in [DECISIONS.md](DECISIONS.md) override deferred features shown for context. Do not treat older conceptual entity lists as a competing schema.

## Model by area

| Area | Physical tables |
|---|---|
| Identity | users, roles, user_roles, sessions, user_addresses |
| Providers | driver_profiles, restaurants, merchants, fitness_providers, institutions, billers, provider_locations |
| Shared service identity | service_engagements, engagement_status_history |
| Drive | vehicles, rides |
| Food | menu_categories, menu_items, food_carts, food_cart_items, food_orders, food_order_items; Advanced dining_reservations |
| Marketplace | product_categories, products, product_images, product_carts, product_cart_items, marketplace_orders, marketplace_order_items |
| Fitness | fitness_activities, activity_schedules, fitness_bookings |
| Billing | bill_categories, bill_payment_requests, education_payment_requests; Advanced family_bill_groups, ocr_scans |
| Payments | transactions, payments, payment_events, payment_status_history |
| Shared features | reviews, notifications, device_tokens, user_preferences, recommendation_interactions, audit_entries |

There are 48 physical tables. `expense_summary` is a derived view, not another physical table.

## Relationships that matter across modules

- `service_engagements` holds the customer and shared identity. Each engagement has exactly one matching service subtype. A subtype's `id` is both its primary key and a foreign key to the engagement.
- Ride driver/vehicle assignment is nullable before acceptance; assigned vehicles must belong to the assigned driver. Driver acceptance and reservations require concurrency protection.
- Food/product carts belong to a customer and provider context. Submitted order lines preserve name and price snapshots; checkout validates ownership, totals and tracked stock.
- Fitness booking reserves schedule capacity. Uncertain payment keeps its hold; definitive failure/cancellation releases a reservation only once under the documented rules.
- A payable engagement has one `transactions` obligation and may have several `payments` attempts. `payment_events` records verified evidence. Do not flatten these into one payment table or create a second obligation on retry.
- Bills/fees require authoritative invoice identity and inquiry validation. Collection and bill fulfilment are separate facts; unresolved collected funds must not trigger another charge.
- Expenses derive from successful transactions joined to engagements. Do not introduce a separate ExpenseEntry ledger or count payment retries as spending.
- Reviews reference eligible completed engagements, not arbitrary target-type/target-ID pairs. One review per engagement; author must be its customer.
- Notifications use `read_at` for read state. Recommendation targets use typed optional foreign keys, with the target-count rules documented in the constraints.

## Implementation boundaries

Use backend APIs from both clients; neither client accesses PostgreSQL directly. Enforce roles and record ownership server-side. Use numeric/decimal for money and explicit currency, and use timestamptz for instants. Never expose password/session hashes or payment secrets through API DTOs.

Foreign keys alone cannot enforce all business rules. Translate the documented checks, uniqueness, locking and deferred cross-table checks into migrations and meaningful backend tests when implementing each module. No field dictionary or ERD review proves runtime enforcement.

Exact DTOs, routes, authentication/session policy, fare/cancellation rules and provider-specific behavior remain to be agreed. Database column names are not automatically public API names.
