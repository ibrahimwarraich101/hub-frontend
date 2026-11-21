// File purpose: Which payment company the backend uses right now (Safepay or JazzCash) and which ways to pay it takes
// (GET /api/payments/provider, docs/SAFEPAY.md in hub-backend). Payment screens use it to show only choices that work:
// Safepay takes cards only, JazzCash takes wallets and cards. Asked once per page load and shared by every screen.
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export type PayMethodType = 'Wallet' | 'Card'

export type PaymentProviderInfo = {
  // Null when online payments are not set up on the server.
  provider: 'Safepay' | 'JazzCash' | null
  methods: PayMethodType[]
}

// Until the server answers (or if it cannot be asked), the screens behave as before: JazzCash, wallet or card.
const fallback: PaymentProviderInfo = { provider: 'JazzCash', methods: ['Wallet', 'Card'] }
let cached: Promise<PaymentProviderInfo> | null = null

export function usePaymentProvider() {
  const { authFetch } = useAuth()
  const [info, setInfo] = useState<PaymentProviderInfo | null>(null)

  useEffect(() => {
    let current = true
    cached ??= authFetch<PaymentProviderInfo>('/api/payments/provider').catch(() => { cached = null; return fallback })
    cached.then((answer) => { if (current) setInfo(answer) })
    return () => { current = false }
  }, [authFetch])

  const active = info ?? fallback
  return {
    loaded: info !== null,
    provider: active.provider,
    // The company name shown to the customer, e.g. "Pay on Safepay's secure page".
    name: active.provider ?? 'our payment partner',
    methods: active.methods,
    allows: (method: PayMethodType) => active.methods.includes(method),
  }
}
