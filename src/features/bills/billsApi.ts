// File purpose: Bills API calls and response types (matches docs/BILLS.md in hub-backend), plus starting a JazzCash
// payment for a bill and reading the result JazzCash sends back (?bill=...&payment=...).

export type Biller = {
  id: string
  code: string
  name: string
  category: string
  referenceLabel: string
  referenceLength: number
  referenceExample: string
}

export type BillCategory = { code: string; label: string; billers: Biller[] }

// Unpaid = can be paid; Paid = already paid this month; NoDue = nothing to pay.
export type BillLookup = {
  billerId: string
  billerName: string
  category: string
  reference: string
  consumerName: string
  billingMonth: string
  dueDate: string
  amountWithinDueDate: number
  amountAfterDueDate: number
  payableAmount: number
  overdue: boolean
  currency: string
  status: 'Unpaid' | 'Paid' | 'NoDue'
  demo: boolean
}

export type BillStatus = 'AwaitingPayment' | 'Paid' | 'Expired'

export type BillPayment = {
  id: string
  number: string
  billerId: string
  billerName: string
  category: string
  reference: string
  referenceLabel: string
  consumerName: string
  billingMonth: string
  dueDate: string
  amount: number
  currency: string
  status: BillStatus
  createdAt: string
  payBefore: string
  paidAt: string | null
  receiptNumber: string | null
  paidWith: string | null
  paymentMessage: string | null
  demo: boolean
}

export type BillSummary = {
  id: string
  number: string
  billerName: string
  category: string
  reference: string
  billingMonth: string
  amount: number
  currency: string
  status: BillStatus
  createdAt: string
  paidAt: string | null
}

export type BillPage = { total: number; page: number; pageSize: number; items: BillSummary[] }

export const billPaths = {
  billers: '/api/bills/billers',
  lookup: '/api/bills/lookup',
  create: '/api/bills',
  mine: (page: number) => `/api/bills?page=${page}&pageSize=20`,
  one: (id: string) => `/api/bills/${encodeURIComponent(id)}`,
  pay: (id: string) => `/api/bills/${encodeURIComponent(id)}/pay`,
}

type AuthFetch = <T>(path: string, method?: string, body?: unknown) => Promise<T>

// Wallet = JazzCash mobile account, Card = debit/credit card typed on JazzCash's own page.
export type PayMethod = 'Wallet' | 'Card'

// Asks our server for a short-lived JazzCash launch address and opens it. JazzCash brings the customer back afterwards.
export async function startBillPayment(authFetch: AuthFetch, billId: string, method: PayMethod, paymentMethodId: string | null): Promise<void> {
  const { launchUrl } = await authFetch<{ paymentId: string; launchUrl: string }>(billPaths.pay(billId), 'POST', {
    method, paymentMethodId, returnUrl: `${window.location.origin}/`, idempotencyKey: newKey('pay'),
  })
  window.location.assign(launchUrl)
}

// The result JazzCash sent back in the address, if any (read once when the website opens).
export function readBillReturn(): { billId: string; result: string } | null {
  const params = new URLSearchParams(window.location.search)
  const billId = params.get('bill')
  const result = params.get('payment')
  return billId && result ? { billId, result } : null
}

export function clearBillReturn() {
  history.replaceState(null, '', window.location.pathname)
}

export const billResultMessages: Record<string, { tone: 'success' | 'error' | 'info'; text: string }> = {
  success: { tone: 'success', text: 'Payment received. Your bill is paid. Keep the receipt number below.' },
  pending: { tone: 'info', text: 'JazzCash is still processing your payment. This page will show the result once it is confirmed.' },
  failed: { tone: 'error', text: 'The payment did not go through. You can try again before the time runs out.' },
  cancelled: { tone: 'error', text: 'You cancelled the payment. You can try again before the time runs out.' },
}

// A new random key so a repeated tap never pays or starts the same bill twice.
export function newKey(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

// "Rs 1,234".
export function rupees(amount: number): string {
  return 'Rs ' + amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })
}

// "2026-11" -> "November 2026".
export function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return new Date(year!, (number ?? 1) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// "2026-11-20" -> "20 Nov 2026".
export function dayLabel(date: string): string {
  return new Date(date.length === 10 ? date + 'T00:00:00' : date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeLabel(value: string): string {
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export const statusLabels: Record<BillStatus, string> = { AwaitingPayment: 'Waiting for payment', Paid: 'Paid', Expired: 'Not paid in time' }
