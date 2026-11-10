// File purpose: Checkout, order and JazzCash payment API types, paths and form rules (matches docs/ECOMMERCE_ORDERS.md in hub-backend).
import { rules, firstError } from '../../shared/forms/validation'

export type OrderStatus = 'AwaitingPayment' | 'Placed' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled'

export type OrderItem = {
  id: string
  productId: string
  variantId: string | null
  name: string
  color: string | null
  size: string | null
  imageUrl: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type Order = {
  id: string
  number: string
  status: OrderStatus
  merchantId: string
  merchantName: string
  customerName: string | null
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  currency: string
  delivery: { name: string; phone: string; address: string; city: string }
  note: string | null
  createdAt: string
  paymentDueAt: string
  paidAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelReason: string | null
  refundNeeded: boolean
  lastPayment: { status: string; method: string; message: string | null; createdAt: string } | null
  history: { status: OrderStatus; at: string }[]
  version: number
}

export type OrderSummary = {
  id: string
  number: string
  status: OrderStatus
  merchantName: string
  customerName: string | null
  itemCount: number
  total: number
  currency: string
  createdAt: string
  firstImageUrl: string | null
}

export type OrderPage = { total: number; page: number; pageSize: number; items: OrderSummary[] }

export type PaymentMethod = 'Wallet' | 'Card'

export const orderPaths = {
  checkout: '/api/marketplace/checkout',
  mine: (page: number) => `/api/marketplace/orders?page=${page}&pageSize=20`,
  one: (id: string) => `/api/marketplace/orders/${encodeURIComponent(id)}`,
  pay: (id: string) => `/api/marketplace/orders/${encodeURIComponent(id)}/pay`,
  cancel: (id: string) => `/api/marketplace/orders/${encodeURIComponent(id)}/cancel`,
  sellerList: (status: string, page: number) => `/api/marketplace/seller/orders?page=${page}&pageSize=20${status ? `&status=${status}` : ''}`,
  sellerOne: (id: string) => `/api/marketplace/seller/orders/${encodeURIComponent(id)}`,
  sellerStatus: (id: string) => `/api/marketplace/seller/orders/${encodeURIComponent(id)}/status`,
}

// Words people read for each status.
export const statusLabels: Record<OrderStatus, string> = {
  AwaitingPayment: 'Waiting for payment',
  Placed: 'Paid, waiting for the store',
  Confirmed: 'Confirmed by the store',
  Shipped: 'On the way',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
}

export const statusTones: Record<OrderStatus, string> = {
  AwaitingPayment: 'warning', Placed: 'info', Confirmed: 'info', Shipped: 'info', Delivered: 'success', Cancelled: 'error',
}

export const paymentMethods: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: 'Wallet', label: 'JazzCash wallet', hint: 'Pay from your JazzCash mobile account.' },
  { id: 'Card', label: 'Debit or credit card', hint: 'Enter your card on JazzCash’s secure page. HUB never sees your card number.' },
]

export type DeliveryFields = 'name' | 'phone' | 'address' | 'city' | 'note'

// Same rules as the backend's checkout request.
export function validateDelivery(values: Record<DeliveryFields, string>): Partial<Record<DeliveryFields, string>> {
  const errors: Partial<Record<DeliveryFields, string>> = {}
  const name = firstError(rules.required(values.name, 'name'), rules.minLength(values.name.trim(), 2, 'Name'), rules.maxLength(values.name.trim(), 100, 'Name'))
  const phone = firstError(rules.required(values.phone, 'phone number'), rules.phone(values.phone))
  const address = firstError(rules.required(values.address, 'address'), rules.minLength(values.address.trim(), 5, 'Address'),
    rules.maxLength(values.address.trim(), 300, 'Address'))
  const city = firstError(rules.required(values.city, 'city'), rules.minLength(values.city.trim(), 2, 'City'), rules.maxLength(values.city.trim(), 60, 'City'))
  const note = rules.maxLength(values.note.trim(), 300, 'Note')
  if (name) errors.name = name
  if (phone) errors.phone = phone
  if (address) errors.address = address
  if (city) errors.city = city
  if (note) errors.note = note
  return errors
}

// A random key made once per checkout/payment screen, so a repeated tap never makes two orders or payments.
export function newRequestKey(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

export function orderDate(value: string): string {
  return new Date(value).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
