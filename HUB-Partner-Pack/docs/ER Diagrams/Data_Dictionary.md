# HUB - Reviewed table dictionary

Aligned on 19 October 2026 with [HUB_UML_ERD.drawio](HUB_UML_ERD.drawio), the consolidated ERD in this folder. Table names, field names, types, key markers, nullability and FK endpoints were compared with the diagram. This is a proposed schema, not an applied migration. Read [Database_Constraints.md](Database_Constraints.md) for composite/partial uniqueness, status values and cross-table enforcement.

All fields are NOT NULL unless marked nullable. UQ denotes single-column uniqueness; PK members together form the table primary key. Referenced parents always use their id.

## users

Module: Identity. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| full_name | text | - | No |
| email | text | UQ | No |
| phone | text | UQ | No |
| password_hash | text | - | No |
| is_active | boolean | - | No |
| created_at | timestamptz | - | No |

## roles

Module: Identity. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | smallint | PK | No |
| name | text | UQ | No |

## user_roles

Module: Identity. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| user_id | uuid | PK/FK -> users.id | No |
| role_id | smallint | PK/FK -> roles.id | No |

## sessions

Module: Identity. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| token_hash | text | UQ | No |
| expires_at | timestamptz | - | No |
| revoked_at | timestamptz | - | Yes |

## user_addresses

Module: Identity. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| label | text | - | No |
| address_line | text | - | No |
| latitude | numeric(9,6) | - | No |
| longitude | numeric(9,6) | - | No |

## driver_profiles

Module: Providers. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK/UQ -> users.id | No |
| available | boolean | - | No |
| current_lat | numeric(9,6) | - | Yes |
| current_lon | numeric(9,6) | - | Yes |
| location_updated_at | timestamptz | - | Yes |

## restaurants

Module: Providers. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK/UQ -> users.id | No |
| name | text | - | No |
| available | boolean | - | No |
| dining_capacity | integer | - | Yes |

## merchants

Module: Providers. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK/UQ -> users.id | No |
| name | text | - | No |
| active | boolean | - | No |

## fitness_providers

Module: Providers. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK/UQ -> users.id | No |
| name | text | - | No |
| active | boolean | - | No |

## institutions

Module: Providers. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK/UQ -> users.id | No |
| name | text | - | No |
| provider_code | text | UQ | No |

## billers

Module: Providers. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK/UQ -> users.id | No |
| name | text | - | No |
| provider_code | text | UQ | No |

## provider_locations

Module: Providers. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| restaurant_id | uuid | FK -> restaurants.id | Yes |
| merchant_id | uuid | FK -> merchants.id | Yes |
| fitness_provider_id | uuid | FK -> fitness_providers.id | Yes |
| address_line | text | - | No |
| latitude | numeric(9,6) | - | No |
| longitude | numeric(9,6) | - | No |

## vehicles

Module: Drive. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| driver_profile_id | uuid | FK -> driver_profiles.id | No |
| registration | text | UQ | No |
| capacity | smallint | - | No |
| active | boolean | - | No |

## service_engagements

Module: Shared. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| customer_id | uuid | FK -> users.id | No |
| kind | text | - | No |
| request_key | text | - | Yes |
| occurred_at | timestamptz | - | No |
| completed_at | timestamptz | - | Yes |

## rides

Module: Drive. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK/FK -> service_engagements.id | No |
| driver_profile_id | uuid | FK -> driver_profiles.id | Yes |
| vehicle_id | uuid | FK -> vehicles.id | Yes |
| pickup_lat | numeric(9,6) | - | No |
| pickup_lon | numeric(9,6) | - | No |
| destination_lat | numeric(9,6) | - | No |
| destination_lon | numeric(9,6) | - | No |
| quoted_fare | numeric(12,2) | - | No |
| final_fare | numeric(12,2) | - | Yes |
| currency | char(3) | - | No |
| status | text | - | No |
| version | integer | - | No |

## menu_categories

Module: Food. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| restaurant_id | uuid | FK -> restaurants.id | No |
| name | text | - | No |

## menu_items

Module: Food. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| menu_category_id | uuid | FK -> menu_categories.id | No |
| name | text | - | No |
| price | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| available | boolean | - | No |

## food_carts

Module: Food. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| restaurant_id | uuid | FK -> restaurants.id | No |
| updated_at | timestamptz | - | No |

## food_cart_items

Module: Food. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| cart_id | uuid | PK/FK -> food_carts.id | No |
| menu_item_id | uuid | PK/FK -> menu_items.id | No |
| quantity | integer | - | No |

## food_orders

Module: Food. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK/FK -> service_engagements.id | No |
| restaurant_id | uuid | FK -> restaurants.id | No |
| total | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| status | text | - | No |
| version | integer | - | No |

## food_order_items

Module: Food. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| food_order_id | uuid | FK -> food_orders.id | No |
| menu_item_id | uuid | FK -> menu_items.id | No |
| item_name | text | - | No |
| quantity | integer | - | No |
| unit_price | numeric(12,2) | - | No |

## product_categories

Module: Marketplace. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| name | text | - | No |

## products

Module: Marketplace. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| merchant_id | uuid | FK -> merchants.id | No |
| product_category_id | uuid | FK -> product_categories.id | No |
| name | text | - | No |
| price | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| stock_quantity | integer | - | Yes |
| active | boolean | - | No |
| version | integer | - | No |

## product_images

Module: Marketplace. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| product_id | uuid | FK -> products.id | No |
| image_uri | text | - | No |
| sort_order | integer | - | No |

## product_carts

Module: Marketplace. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| merchant_id | uuid | FK -> merchants.id | No |
| updated_at | timestamptz | - | No |

## product_cart_items

Module: Marketplace. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| cart_id | uuid | PK/FK -> product_carts.id | No |
| product_id | uuid | PK/FK -> products.id | No |
| quantity | integer | - | No |

## marketplace_orders

Module: Marketplace. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK/FK -> service_engagements.id | No |
| merchant_id | uuid | FK -> merchants.id | No |
| total | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| status | text | - | No |
| inventory_released | boolean | - | No |
| version | integer | - | No |

## marketplace_order_items

Module: Marketplace. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| marketplace_order_id | uuid | FK -> marketplace_orders.id | No |
| product_id | uuid | FK -> products.id | No |
| product_name | text | - | No |
| quantity | integer | - | No |
| unit_price | numeric(12,2) | - | No |

## fitness_activities

Module: Fitness. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| fitness_provider_id | uuid | FK -> fitness_providers.id | No |
| name | text | - | No |
| category | text | - | No |
| active | boolean | - | No |

## activity_schedules

Module: Fitness. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| fitness_activity_id | uuid | FK -> fitness_activities.id | No |
| starts_at | timestamptz | - | No |
| ends_at | timestamptz | - | No |
| capacity | integer | - | No |
| reserved_seats | integer | - | No |
| price_per_seat | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| is_open | boolean | - | No |
| version | integer | - | No |

## fitness_bookings

Module: Fitness. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK/FK -> service_engagements.id | No |
| activity_schedule_id | uuid | FK -> activity_schedules.id | No |
| seats | integer | - | No |
| status | text | - | No |
| reservation_released | boolean | - | No |
| version | integer | - | No |

## bill_categories

Module: Billing. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| name | text | - | No |

## bill_payment_requests

Module: Billing. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK/FK -> service_engagements.id | No |
| biller_id | uuid | FK -> billers.id | No |
| bill_category_id | uuid | FK -> bill_categories.id | No |
| reference | text | - | No |
| amount | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| validated_at | timestamptz | - | No |
| provider_inquiry_reference | text | - | No |
| status | text | - | No |
| family_bill_group_id | uuid | FK -> family_bill_groups.id | Yes |
| obligation_reference | text | - | No |
| inquiry_expires_at | timestamptz | - | No |

## education_payment_requests

Module: Billing. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK/FK -> service_engagements.id | No |
| institution_id | uuid | FK -> institutions.id | No |
| student_reference | text | - | No |
| amount | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| validated_at | timestamptz | - | No |
| provider_inquiry_reference | text | - | No |
| status | text | - | No |
| obligation_reference | text | - | No |
| inquiry_expires_at | timestamptz | - | No |

## family_bill_groups

Module: Billing. Scope: Advanced.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| label | text | - | No |

## ocr_scans

Module: Billing. Scope: Advanced.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| bill_request_id | uuid | FK -> bill_payment_requests.id | Yes |
| extracted_fields | jsonb | - | No |
| confirmed_at | timestamptz | - | Yes |
| created_at | timestamptz | - | No |
| education_request_id | uuid | FK -> education_payment_requests.id | Yes |

## dining_reservations

Module: Food. Scope: Advanced.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK/FK -> service_engagements.id | No |
| restaurant_id | uuid | FK -> restaurants.id | No |
| reserved_at | timestamptz | - | No |
| party_size | integer | - | No |
| status | text | - | No |

## transactions

Module: Payments. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| engagement_id | uuid | FK/UQ -> service_engagements.id | No |
| amount | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| category | text | - | No |
| status | text | - | No |
| created_at | timestamptz | - | No |
| completed_at | timestamptz | - | Yes |

## payments

Module: Payments. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| transaction_id | uuid | FK -> transactions.id | No |
| provider | text | - | No |
| provider_reference | text | - | Yes |
| idempotency_key | text | - | No |
| amount | numeric(12,2) | - | No |
| currency | char(3) | - | No |
| status | text | - | No |
| created_at | timestamptz | - | No |
| completed_at | timestamptz | - | Yes |
| collection_status | text | - | No |
| fulfilment_status | text | - | No |
| fulfilment_provider | text | - | Yes |
| fulfilment_reference | text | - | Yes |
| last_verified_at | timestamptz | - | Yes |
| resolution_required | boolean | - | No |

## payment_events

Module: Payments. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| payment_id | uuid | FK -> payments.id | No |
| provider | text | - | No |
| event_reference | text | - | No |
| verified_outcome | text | - | No |
| received_at | timestamptz | - | No |
| verified_at | timestamptz | - | No |

## payment_status_history

Module: Payments. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| payment_id | uuid | FK -> payments.id | No |
| from_status | text | - | No |
| to_status | text | - | No |
| changed_at | timestamptz | - | No |

## engagement_status_history

Module: Shared. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| engagement_id | uuid | FK -> service_engagements.id | No |
| actor_user_id | uuid | FK -> users.id | Yes |
| from_status | text | - | No |
| to_status | text | - | No |
| changed_at | timestamptz | - | No |

## reviews

Module: Shared. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| engagement_id | uuid | FK/UQ -> service_engagements.id | No |
| author_user_id | uuid | FK -> users.id | No |
| rating | smallint | - | No |
| comment | text | - | No |
| visibility | text | - | No |
| created_at | timestamptz | - | No |

## notifications

Module: Shared. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| engagement_id | uuid | FK -> service_engagements.id | Yes |
| type | text | - | No |
| title | text | - | No |
| body | text | - | No |
| delivery_status | text | - | No |
| attempt_count | integer | - | No |
| read_at | timestamptz | - | Yes |
| created_at | timestamptz | - | No |

## device_tokens

Module: Shared. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| token | text | UQ | No |
| platform | text | - | No |
| active | boolean | - | No |

## user_preferences

Module: Recommendations. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| category | text | - | No |
| value | text | - | No |

## recommendation_interactions

Module: Recommendations. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| user_id | uuid | FK -> users.id | No |
| event_type | text | - | No |
| restaurant_id | uuid | FK -> restaurants.id | Yes |
| menu_item_id | uuid | FK -> menu_items.id | Yes |
| product_id | uuid | FK -> products.id | Yes |
| fitness_activity_id | uuid | FK -> fitness_activities.id | Yes |
| fitness_provider_id | uuid | FK -> fitness_providers.id | Yes |
| occurred_at | timestamptz | - | No |
| context | jsonb | - | No |

## audit_entries

Module: Administration. Scope: Core.

| Field | PostgreSQL type | Keys / reference | Nullable |
|---|---|---|---|
| id | uuid | PK | No |
| actor_user_id | uuid | FK -> users.id | No |
| target_user_id | uuid | FK -> users.id | Yes |
| review_id | uuid | FK -> reviews.id | Yes |
| action | text | - | No |
| reason | text | - | No |
| details | jsonb | - | No |
| occurred_at | timestamptz | - | No |


## Reading and implementation guidance

- `id` identifies a record. In service subtypes it also references the shared engagement; it is not a second independent identifier.
- `user_id` refers to the account associated with the record; its role depends on the table. `customer_id` identifies the engagement customer. Provider profile ownership does not grant authorization by itself.
- `status` fields describe different lifecycles. Read the known lifecycle rules in [Database_Constraints.md](Database_Constraints.md); complete transition/initial-history conventions still need feature-level agreement. Do not use one universal status enum.
- `version` supports optimistic concurrency. Initialization and increment behavior must be implemented consistently in backend code.
- `request_key` identifies an idempotent customer command; payment `idempotency_key` identifies an attempt within its transaction. Neither is an authentication credential.
- `provider_reference`, inquiry references and obligation references have different meanings; see the constraints before mapping an external provider.
- Monetary values use decimal amounts and an explicit currency. Instants use `timestamptz`; display timezone belongs to the client/user context.
- JSON fields hold contextual metadata, not arbitrary substitutes for required foreign keys. Validate their structure for each operation and exclude secrets.
- UI labels and API DTOs need not reproduce database column names. Never expose password/token hashes through frontend responses.
- Advanced marks scope classification in the current design, not permission to remove an approved requirement. Resolve conflicts against `docs/DECISIONS.md` and the agreed feature specification.

## expense_summary (derived view)

This is a calculated view, not a 49th physical table. It derives spending from successful transactions joined to their service engagements.

| Field | PostgreSQL type | Meaning |
|---|---|---|
| customer_id | uuid | Customer from the engagement |
| month | date | Calendar-month bucket using the agreed reporting timezone |
| category | text | Transaction spending category |
| currency | char(3) | Currency grouping; never aggregate different currencies together |
| total_amount | numeric | Sum of successful obligation amounts for the group |

The backend must choose and document the reporting timezone policy when implementing this view/query. This document does not establish API response contracts or prove database runtime enforcement.
