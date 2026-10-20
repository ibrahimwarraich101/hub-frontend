# HUB — Service Modules

## 1. HUB Drive

Core:
- pickup and destination,
- map integration,
- distance calculation,
- fare estimation,
- nearby driver discovery,
- ride request,
- ride acceptance,
- ride status,
- ride history,
- ratings.

Advanced:
- live location updates,
- smarter driver matching,
- demand-based recommendations.

Future:
- commercial-scale dispatch optimization,
- advanced dynamic pricing.

---

## 2. Food & Dining

Core:
- restaurant discovery,
- menu browsing,
- search/filter,
- cart,
- order placement,
- order status,
- restaurant order management,
- order history.

Advanced:
- table/dining booking,
- personalized food recommendations.

---

## 3. Grocery & E-Commerce Marketplace

Core:
- product discovery,
- search/filter,
- product details,
- cart,
- checkout,
- order tracking,
- merchant product management,
- merchant order management.

Advanced:
- inventory alerts,
- recommendation ranking,
- personalized storefront.

---

## 4. Fitness & Wellness

Core:
- provider discovery,
- gym/class/activity listing,
- schedules,
- booking,
- provider booking management.

Advanced:
- personalized class recommendations,
- schedule-aware suggestions.

The previous HUB Credits concept is not part of the current design.

---

## 5. Utility & Education Payments

Core:
- supported bill categories,
- bill/reference entry,
- education payment references,
- payment initiation,
- provider status handling,
- payment history.

Advanced:
- OCR-assisted bill field extraction,
- family bill organization,
- institution/biller portal.

Important:
Production implementation depends on authorized payment and bill providers.

---

## 6. Unified History & Expense Tracking

Core:
- transaction history,
- service activity history,
- category-based spending,
- monthly summaries.

Categories may include:
- rides,
- food,
- grocery/e-commerce,
- fitness/wellness,
- bills,
- education payments.

---

## 7. Reviews & Ratings

Core:
- ratings after eligible completed interactions,
- text reviews,
- provider rating summaries,
- admin moderation.

---

## 8. Notifications

Core:
- ride status,
- order status,
- booking status,
- payment status,
- important account events.

Firebase Cloud Messaging may be used.

---

## 9. Recommendation System

Recommendation targets:
- restaurants,
- food,
- products,
- gyms,
- classes,
- service providers,
- frequently used services,
- nearby services,
- offers,
- ride-related suggestions.

Signals:
- history,
- purchases,
- ratings,
- searches,
- location,
- preferences,
- popularity,
- time,
- price range,
- similar-user behavior.

---

## Current Removed / Deferred Service Items

The current compressed service scope does not include:
- Package Delivery,
- Payment Reminders,
- Smart Billing.

Do not reintroduce these automatically without explicit user approval.
