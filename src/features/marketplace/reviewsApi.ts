// File purpose: Product review API types, paths and form rules (matches docs/ECOMMERCE_REVIEWS.md in hub-backend).
import { getJson } from '../../shared/api/client'

// The customer's own review of one order item.
export type MyReview = {
  id: string
  rating: number
  comment: string | null
  hiddenByHub: boolean
  hiddenReason: string | null
  createdAt: string
  updatedAt: string
}

export type ProductReview = {
  id: string
  rating: number
  comment: string | null
  // Short form of the buyer's name, e.g. "Ayesha K."
  authorName: string
  color: string | null
  size: string | null
  createdAt: string
  edited: boolean
}

// starCounts: how many reviews have 5, 4, 3, 2 and 1 stars (in that order).
export type RatingSummary = { average: number | null; count: number; starCounts: number[] }

export type ProductReviewPage = { summary: RatingSummary; total: number; page: number; pageSize: number; items: ProductReview[] }

export type AdminReview = {
  id: string
  rating: number
  comment: string | null
  visibility: 'Visible' | 'Hidden'
  hiddenReason: string | null
  hiddenAt: string | null
  hiddenByName: string | null
  productId: string
  productName: string
  merchantName: string
  authorUserId: string
  authorName: string
  orderNumber: string
  createdAt: string
  updatedAt: string
}

export type AdminReviewPage = { total: number; page: number; pageSize: number; items: AdminReview[] }

// Text-only labels for the star choices.
export const ratingWords: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' }

export const reviewPaths = {
  write: (orderId: string, itemId: string) => `/api/marketplace/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/review`,
  admin: (filters: { search?: string; filter?: string; rating?: string; page: number }) => {
    const query = new URLSearchParams({ page: String(filters.page), pageSize: '20', filter: filters.filter || 'all' })
    if (filters.search) query.set('search', filters.search)
    if (filters.rating) query.set('rating', filters.rating)
    return `/api/admin/marketplace/reviews?${query.toString()}`
  },
  hide: (id: string) => `/api/admin/marketplace/reviews/${encodeURIComponent(id)}/hide`,
  unhide: (id: string) => `/api/admin/marketplace/reviews/${encodeURIComponent(id)}/unhide`,
}

// Visible reviews of a product (no login needed).
export function fetchProductReviews(productId: string, page: number, signal?: AbortSignal): Promise<ProductReviewPage> {
  return getJson<ProductReviewPage>(`/api/marketplace/products/${encodeURIComponent(productId)}/reviews?page=${page}&pageSize=5`, signal)
}

// Same rules as the backend.
export function validateReview(rating: number, comment: string): { rating?: string; comment?: string } {
  const errors: { rating?: string; comment?: string } = {}
  if (rating < 1 || rating > 5) errors.rating = 'Please choose how many stars to give.'
  if (comment.trim().length > 1000) errors.comment = `Your review can be at most 1000 characters (now ${comment.trim().length}).`
  return errors
}
