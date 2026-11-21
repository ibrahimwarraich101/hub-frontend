// File purpose: Starts an online payment for an order (JazzCash or Safepay, chosen by the server): asks our server for a
// short-lived launch address and opens it. The payment page brings the customer back to this website with ?order=...&payment=success|pending|failed|cancelled.
import { newRequestKey, orderPaths } from './ordersApi'
import type { PaymentMethod } from './ordersApi'

type AuthFetch = <T>(path: string, method?: string, body?: unknown) => Promise<T>

export async function startPayment(authFetch: AuthFetch, orderId: string, method: PaymentMethod): Promise<void> {
  const { launchUrl } = await authFetch<{ paymentId: string; launchUrl: string }>(orderPaths.pay(orderId), 'POST', {
    method, returnUrl: `${window.location.origin}/`, idempotencyKey: newRequestKey('pay'),
  })
  window.location.assign(launchUrl)
}

// The result the payment page sent back in the address, if any (read once when the website opens).
export function readPaymentReturn(): { orderId: string; result: string } | null {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get('order')
  const result = params.get('payment')
  return orderId && result ? { orderId, result } : null
}

export function clearPaymentReturn() {
  history.replaceState(null, '', window.location.pathname)
}

export const paymentResultMessages: Record<string, { tone: 'success' | 'error' | 'info'; text: string }> = {
  success: { tone: 'success', text: 'Payment received. Thank you! The store will confirm your order soon.' },
  pending: { tone: 'info', text: 'Your payment is still being processed. We will update the order as soon as it is confirmed.' },
  failed: { tone: 'error', text: 'The payment did not go through. You can try again before the time runs out.' },
  cancelled: { tone: 'error', text: 'You cancelled the payment. You can try again before the time runs out.' },
}
