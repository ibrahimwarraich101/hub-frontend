// File purpose: "My payment methods" API calls and types (shared by every module; docs/BILLS.md in hub-backend).
export type SavedPaymentMethod = {
  id: string
  provider: string
  methodType: 'Wallet' | 'Card'
  label: string
  walletMobileNumber: string | null
  cardBrand: string | null
  cardLast4: string | null
  cardExpiryMonth: number | null
  cardExpiryYear: number | null
  isDefault: boolean
  createdAt: string
}

export const paymentMethodPaths = {
  mine: '/api/payments/methods',
  addWallet: '/api/payments/methods/wallets',
  makeDefault: (id: string) => `/api/payments/methods/${encodeURIComponent(id)}/default`,
  remove: (id: string) => `/api/payments/methods/${encodeURIComponent(id)}`,
}

// Most methods one customer can keep (same as the backend).
export const MAX_PAYMENT_METHODS = 5
