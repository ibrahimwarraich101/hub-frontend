// File purpose: HUB Food API types, paths and small display helpers (matches hub-backend Contracts/Food).
export type RestaurantStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended'
export type OrderStatus = 'AwaitingPayment' | 'Placed' | 'Accepted' | 'Ready' | 'Completed' | 'Cancelled'

export type RestaurantSummary = {
  id: string
  name: string
  cuisine: string
  city: string
  open: boolean
  deliveryFee: number
  minimumOrder: number
  currency: string
  deliveryMinutes: number
  rating: number | null
  ratingCount: number
  // Photo addresses from the backend ("/media/..."); pass them through mediaUrl() before showing them.
  logoUrl: string | null
  coverUrl: string | null
}

export type RestaurantList = { total: number; page: number; pageSize: number; items: RestaurantSummary[] }

export type PublicMenuItem = {
  id: string; name: string; description: string; price: number; currency: string; available: boolean; imageUrl: string | null
}
export type PublicMenuCategory = { id: string; name: string; items: PublicMenuItem[] }

export type RestaurantDetails = {
  summary: RestaurantSummary
  description: string | null
  addressLine: string
  menu: PublicMenuCategory[]
}

export type RestaurantReview = { rating: number; comment: string; authorName: string; createdAt: string }

export type CartLine = { menuItemId: string; name: string; unitPrice: number; quantity: number; lineTotal: number; status: 'ok' | 'unavailable' }

export type RestaurantCart = {
  restaurantId: string
  restaurantName: string
  open: boolean
  items: CartLine[]
  subtotal: number
  deliveryFee: number
  total: number
  minimumOrder: number
  currency: string
  canCheckout: boolean
  problem: string | null
}

export type FoodCart = { carts: RestaurantCart[]; itemCount: number }

export type FoodOrder = {
  id: string
  number: string
  status: OrderStatus
  restaurantId: string
  restaurantName: string
  customerName: string | null
  items: { menuItemId: string; name: string; unitPrice: number; quantity: number; lineTotal: number }[]
  subtotal: number
  deliveryFee: number
  total: number
  currency: string
  delivery: { name: string; phone: string; address: string; city: string }
  note: string | null
  createdAt: string
  paymentDueAt: string
  paidAt: string | null
  acceptedAt: string | null
  readyAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelReason: string | null
  history: { status: OrderStatus; changedAt: string }[]
  review: { rating: number; comment: string; createdAt: string } | null
  canCancel: boolean
  canReview: boolean
  testPaymentAvailable: boolean
  version: number
}

export type FoodOrderSummary = {
  id: string
  number: string
  status: OrderStatus
  restaurantId: string
  restaurantName: string
  customerName: string | null
  total: number
  currency: string
  itemCount: number
  createdAt: string
}

export type FoodOrderPage = { total: number; page: number; pageSize: number; items: FoodOrderSummary[] }

export type RestaurantAccount = {
  id: string
  name: string
  description: string | null
  phone: string
  status: RestaurantStatus
  open: boolean
  cuisine: string
  addressLine: string
  city: string
  deliveryFee: number
  minimumOrder: number
  currency: string
  deliveryMinutes: number
  submittedAt: string
  reviewedAt: string | null
  reviewReason: string | null
  version: number
  // Photo addresses from the backend ("/media/..."), or null when none has been uploaded.
  logoUrl: string | null
  coverUrl: string | null
}

export type AdminRestaurant = {
  account: RestaurantAccount
  owner: { id: string; fullName: string; email: string; phone: string }
  reviewedBy: string | null
}

export type AdminRestaurantPage = { total: number; page: number; pageSize: number; items: AdminRestaurant[] }

export type MenuItem = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  currency: string
  available: boolean
  archived: boolean
  sortOrder: number
  version: number
  imageUrl: string | null
}

export type OwnerMenuCategory = { id: string; name: string; sortOrder: number; archived: boolean; items: MenuItem[] }
export type OwnerMenu = { restaurantId: string; categories: OwnerMenuCategory[] }

export type RestaurantDecision = 'Approve' | 'Reject' | 'Suspend' | 'Reinstate'

// Which decisions an administrator may take for each status.
export const decisionsFor: Record<RestaurantStatus, RestaurantDecision[]> = {
  Pending: ['Approve', 'Reject'],
  Approved: ['Suspend'],
  Suspended: ['Reinstate'],
  Rejected: [],
}

const id = (value: string) => encodeURIComponent(value)

export const foodPaths = {
  restaurants: (search: string, city: string, openOnly: boolean, page: number) => {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (search.trim()) query.set('search', search.trim())
    if (city.trim()) query.set('city', city.trim())
    if (openOnly) query.set('openOnly', 'true')
    return `/api/food/restaurants?${query.toString()}`
  },
  restaurant: (restaurantId: string) => `/api/food/restaurants/${id(restaurantId)}`,
  reviews: (restaurantId: string) => `/api/food/restaurants/${id(restaurantId)}/reviews`,
  cart: '/api/food/cart',
  cartItems: '/api/food/cart/items',
  clearCart: (restaurantId: string) => `/api/food/cart/${id(restaurantId)}`,
  orders: '/api/food/orders',
  myOrders: (page: number) => `/api/food/orders?page=${page}&pageSize=20`,
  order: (orderId: string) => `/api/food/orders/${id(orderId)}`,
  cancel: (orderId: string) => `/api/food/orders/${id(orderId)}/cancel`,
  review: (orderId: string) => `/api/food/orders/${id(orderId)}/review`,
  testPayment: (orderId: string) => `/api/food/orders/${id(orderId)}/test-payment`,
  account: '/api/food/restaurant-account',
  settings: '/api/food/my-restaurant',
  menu: '/api/food/my-restaurant/menu',
  categories: '/api/food/my-restaurant/menu/categories',
  category: (categoryId: string) => `/api/food/my-restaurant/menu/categories/${id(categoryId)}`,
  items: '/api/food/my-restaurant/menu/items',
  itemPhoto: (itemId: string) => `/api/food/my-restaurant/menu/items/${id(itemId)}/photo`,
  restaurantPhoto: (kind: 'logo' | 'cover') => `/api/food/my-restaurant/photos/${kind}`,
  summary: '/api/food/my-restaurant/summary',
  item: (itemId: string) => `/api/food/my-restaurant/menu/items/${id(itemId)}`,
  restaurantOrders: (status: string, page: number) => `/api/food/my-restaurant/orders?status=${id(status)}&page=${page}&pageSize=20`,
  restaurantOrder: (orderId: string) => `/api/food/my-restaurant/orders/${id(orderId)}`,
  restaurantOrderStatus: (orderId: string) => `/api/food/my-restaurant/orders/${id(orderId)}/status`,
  adminQueue: (status: RestaurantStatus, page: number) => `/api/admin/food/restaurants?status=${status}&page=${page}&pageSize=20`,
  adminReview: (restaurantId: string) => `/api/admin/food/restaurants/${id(restaurantId)}/review`,
}

// "Rs 1,250" (prices are whole or two-decimal rupees).
export function money(amount: number): string {
  return 'Rs ' + amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })
}

// Plain words for each order status, as customers see them.
export const statusLabel: Record<OrderStatus, string> = {
  AwaitingPayment: 'Waiting for payment',
  Placed: 'Sent to restaurant',
  Accepted: 'Preparing',
  Ready: 'On the way',
  Completed: 'Delivered',
  Cancelled: 'Cancelled',
}

// The steps shown in the order tracker.
export const trackerSteps: OrderStatus[] = ['Placed', 'Accepted', 'Ready', 'Completed']

export function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
}

// A new random key per "Place order" tap, so a double tap never makes two orders.
export function newRequestKey(): string {
  return 'web-' + crypto.randomUUID()
}

// Pakistani numbers as people type them ("0300 1234567", "923001234567") become "+923001234567", the format the
// backend accepts. Spaces, dashes and brackets are removed; other numbers are left as typed.
export function foodPhone(value: string): string {
  const digits = value.replace(/[\s()-]/g, '')
  if (/^03\d{9}$/.test(digits)) return '+92' + digits.slice(1)
  if (/^923\d{9}$/.test(digits)) return '+' + digits
  if (/^00\d{8,15}$/.test(digits)) return '+' + digits.slice(2)
  return digits
}

// The numbers at the top of the Restaurant Center ("today" is the Pakistan calendar day; sales exclude delivery fees).
export type RestaurantSummaryStats = {
  todayOrders: number
  todaySales: number
  waitingOrders: number
  activeOrders: number
  deliveredOrders: number
  rating: number | null
  ratingCount: number
  currency: string
}

// "just now", "5 min ago", "2 h ago", or the date for older times.
export function timeAgo(value: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`
  return dateTime(value)
}

// Check a chosen photo in the browser before uploading it (the server checks again). Returns a message or null.
export async function checkFoodPhoto(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPEG, PNG or WebP photo.'
  if (file.size > 8 * 1024 * 1024) return 'The photo must be 8 MB or smaller.'
  try {
    const bitmap = await createImageBitmap(file)
    const small = bitmap.width < 200 || bitmap.height < 200
    bitmap.close()
    return small ? 'The photo is too small. Use at least 200 x 200 pixels.' : null
  } catch {
    return 'This file could not be opened as a photo.'
  }
}
