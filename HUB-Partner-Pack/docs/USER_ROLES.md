# HUB — User Roles and Permissions

## 1. Customer/User

Main capabilities:
- manage profile,
- request rides,
- order food,
- buy products,
- book fitness/wellness activities,
- initiate supported bill/education payments,
- view unified history,
- view expenses,
- rate/review completed services,
- receive notifications,
- receive recommendations.

---

## 2. Rider/Driver

Main capabilities:
- manage driver/rider profile,
- manage availability,
- view eligible ride requests,
- accept/reject ride requests,
- update ride status,
- view trip history,
- view earnings/settlement-related records where applicable,
- receive service notifications.

---

## 3. Restaurant

Main capabilities:
- manage restaurant profile,
- manage menu categories/items,
- manage availability,
- receive orders,
- update order status,
- view order history,
- view ratings/reviews,
- view relevant transaction/settlement records.

---

## 4. Merchant / Grocery Store

Main capabilities:
- manage merchant profile,
- manage products,
- manage categories/inventory where included,
- receive/manage orders,
- update fulfillment status,
- view ratings/reviews,
- view relevant transaction/settlement records.

---

## 5. Fitness / Wellness Provider

Main capabilities:
- manage provider profile,
- create/manage activities/classes/services,
- manage schedules,
- manage capacity/availability,
- receive/manage bookings,
- view booking history,
- view ratings/reviews,
- view relevant transaction/settlement records.

---

## 6. Institution / Biller

Main capabilities:
- manage organization profile where applicable,
- manage supported payment references/records,
- validate or receive payment-related information depending on integration,
- view relevant payment records,
- support education or bill workflows.

Actual permissions depend on the available external bill/payment integration.

---

## 7. Administrator

Main capabilities:
- manage users,
- manage provider accounts,
- review platform activity,
- moderate reviews/reports,
- inspect transaction records,
- inspect operational records,
- suspend/block accounts where required,
- review audit logs,
- configure platform-level settings.

---

## Authorization Principle

Role checks must be enforced on the backend.

Hiding a button in the React website or React Native app is not sufficient authorization.

A user must only access data and actions permitted by server-side authorization rules.
