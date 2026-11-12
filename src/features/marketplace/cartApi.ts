// File purpose: Cart API types and paths (matches docs/ECOMMERCE_CART.md in hub-backend).
export type CartItemStatus = 'ok' | 'unavailable' | 'sold-out' | 'not-enough-stock'

export type CartItem = {
  id: string
  productId: string
  variantId: string | null
  name: string
  color: string | null
  size: string | null
  imageUrl: string | null
  unitPrice: number
  originalPrice: number
  quantity: number
  available: number | null
  status: CartItemStatus
  message: string | null
  lineTotal: number
}

export type CartStore = { merchantId: string; merchantName: string; items: CartItem[]; subtotal: number }

export type Cart = { stores: CartStore[]; itemCount: number; total: number; currency: string; hasProblems: boolean }

export const cartPaths = {
  cart: '/api/marketplace/cart',
  count: '/api/marketplace/cart/count',
  items: '/api/marketplace/cart/items',
  item: (id: string) => `/api/marketplace/cart/items/${encodeURIComponent(id)}`,
}

// Most units of one item a cart line can hold (same as the backend).
export const maxCartQuantity = 99
