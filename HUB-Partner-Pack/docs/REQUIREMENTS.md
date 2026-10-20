# HUB — Functional and Non-Functional Requirements

## Functional Requirements

### Authentication
- Users can register.
- Users can log in.
- Users can log out.
- The system can identify the authenticated user's role.
- Access is restricted according to role.
- Users can manage basic profile information.

### HUB Drive
- Customer can select pickup location.
- Customer can select destination.
- System can calculate/estimate route distance.
- System can estimate fare.
- System can discover eligible nearby drivers.
- Customer can create a ride request.
- Driver can accept or reject available requests.
- Ride status can progress through defined states.
- Customer and driver can view trip details.
- Completed rides are stored in history.
- Customer can rate/review completed rides.

### Food & Dining
- Users can browse restaurants.
- Users can search/filter restaurants and menu items.
- Users can view restaurant/menu details.
- Users can add food items to cart.
- Users can place orders.
- Restaurants can manage menu items.
- Restaurants can manage incoming orders.
- Users can view order history.
- Dining/restaurant booking can be included where practical.

### Grocery & E-Commerce
- Users can browse products.
- Users can search/filter products.
- Users can view product details.
- Users can add products to cart.
- Users can place orders.
- Merchants can manage products.
- Merchants can manage orders.
- Users can view purchase history.

### Fitness & Wellness
- Users can discover gyms, classes, sports activities, wellness services, and training sessions.
- Users can view availability where supported.
- Users can make bookings.
- Providers can manage services/classes.
- Providers can manage bookings.

### Utility & Education Payments
- Users can select supported bill/payment categories.
- Users can enter or scan bill information.
- OCR may extract bill fields.
- Bill data can be validated before payment.
- Users can initiate payments using supported payment providers.
- Institutions/billers can manage relevant records where applicable.
- Users can view payment history.
- Family bill management may group payment records for family members.

### Unified History & Expense Tracking
- System stores in-platform transaction/activity records.
- Users can view transaction history.
- Users can view spending by category.
- Users can view monthly spending summaries.
- Users can view ride expenses.
- Users can view food expenses.
- Users can view shopping expenses.
- Users can view fitness/wellness expenses.
- Users can view bill/education payment expenses.

### Reviews & Ratings
- Users can rate eligible completed services.
- Users can submit reviews.
- Providers can view ratings relevant to their services.
- Admin can moderate inappropriate reviews if needed.

### Notifications
- System can send important service notifications.
- Ride/order/booking/payment status changes can trigger notifications.
- Firebase Cloud Messaging may be used for push notifications.

### Recommendation System
- System can record recommendation-relevant interactions.
- System can generate recommendations based on available data.
- Recommendations can use history, ratings, location, popularity, time, price, search behavior, and similar-user behavior.
- Recommendations may appear in food, marketplace, fitness, provider, and other discovery surfaces.

### Administration
- Admin can manage users.
- Admin can manage provider accounts.
- Admin can manage or review services.
- Admin can review reported content.
- Admin can inspect important platform records.
- Admin actions should be auditable where practical.

---

## Non-Functional Requirements

### Security
- Passwords must be securely hashed.
- APIs must require authentication where appropriate.
- Role-based authorization must be enforced server-side.
- API keys and secrets must not be hard-coded.
- Sensitive operations must be validated.
- Input validation must be applied.
- Payment data handling must minimize exposure of sensitive financial information.

### Performance
- Common API requests should respond within reasonable interactive latency.
- Database queries should use indexing where appropriate.
- Large result sets should use pagination.

### Reliability
- Important transactions should be consistent.
- Failed external API calls should be handled gracefully.
- Payment status should not be assumed successful without provider confirmation.

### Scalability
- Use modular architecture.
- Avoid tightly coupling unrelated modules.
- Keep database schema extensible.
- Do not over-engineer with production-scale microservices during the FYP.

### Usability
- One application should adapt to user role.
- Navigation should be consistent.
- Core actions should require minimal unnecessary steps.

### Maintainability
- Use clear naming conventions.
- Use layered/modular code structure.
- Use DTOs and validation.
- Maintain documentation for major architectural decisions.

### Auditability
- Important payment, booking, ride, order, and administrative actions should leave traceable records.

### Compatibility
- React website and React Native Android/iOS clients communicate with the same ASP.NET Core backend using REST APIs.
- Backend should be independent enough to support future clients if needed.
