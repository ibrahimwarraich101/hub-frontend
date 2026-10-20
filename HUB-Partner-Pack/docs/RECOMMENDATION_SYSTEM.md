# HUB — Recommendation System

## Purpose

Recommendation is one of HUB's important technical components.

It should improve discovery across multiple service categories and demonstrate a meaningful data-driven feature for the FYP.

---

## Recommendation Targets

Recommendations may be generated for:
- restaurants,
- food items,
- products,
- gyms,
- fitness classes,
- wellness activities,
- service providers,
- nearby services,
- frequently used services,
- offers,
- ride-related suggestions.

---

## Available Signals

Potential signals:
- previous orders,
- previous purchases,
- bookings,
- ratings,
- searches,
- clicks/views,
- location,
- category preferences,
- popularity,
- time of day,
- day of week,
- price range,
- repeat usage,
- similar-user behavior.

---

## Phase 1 — Rule-Based Recommendation

Use this first because it is simple and demonstrable.

Examples:
- popular restaurants nearby,
- previously ordered categories,
- frequently booked fitness categories,
- products related to past purchases,
- services near the user's current location.

Rule-based ranking can combine weighted features.

Example conceptual score:

```text
Score =
  0.30 * PreferenceMatch
+ 0.25 * Popularity
+ 0.20 * LocationScore
+ 0.15 * RatingScore
+ 0.10 * TimeRelevance
```

Weights are illustrative and should be evaluated.

---

## Phase 2 — ML-Based Recommendation

A stronger FYP contribution may include one or more of:

### Content-Based Filtering
Recommend items similar to items the user liked or used.

Useful features:
- category,
- tags,
- price,
- location,
- rating,
- provider/service attributes.

### Collaborative Filtering
Recommend items based on patterns from similar users.

Requires sufficient interaction data.

### Hybrid Recommendation
Combine content-based and collaborative signals.

This is stronger but should only be implemented if the team has enough time and usable data.

---

## Cold Start

New users have little history.

Fallback signals:
- popularity,
- location,
- onboarding preferences,
- high ratings,
- time/context.

New items can use:
- category similarity,
- provider quality,
- popularity priors.

---

## Data Collection

Record interaction events such as:
- view,
- search,
- click,
- add to cart,
- order,
- booking,
- rating.

Conceptual event fields (not the schema contract; use `recommendation_interactions` in the included dictionary and its typed target rules):
- UserId
- ItemType
- ItemId
- EventType
- Timestamp
- Context

---

## Evaluation

Possible offline metrics:
- Precision@K
- Recall@K
- Hit Rate
- Mean Average Precision
- NDCG

For the FYP, keep evaluation understandable and tied to the available dataset.

---

## Recommended FYP Scope

Core:
- interaction logging,
- rule-based recommendation,
- popularity/location/personal-history ranking.

Advanced:
- content-based model.

Strong optional enhancement:
- collaborative or hybrid model using collected or prepared dataset.

Do not delay core HUB functionality solely to build an overly complex recommendation pipeline.
