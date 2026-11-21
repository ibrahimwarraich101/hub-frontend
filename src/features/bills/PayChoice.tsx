// File purpose: Choosing how to pay a bill (a saved JazzCash wallet, another JazzCash wallet, or a card on JazzCash's
// page) and the "Pay" button. Saved wallets come from "My payment methods"; the default one is chosen first.
import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { paymentMethodPaths } from '../../shared/payments/paymentMethodsApi'
import type { SavedPaymentMethod } from '../../shared/payments/paymentMethodsApi'
import { rupees } from './billsApi'
import type { PayMethod } from './billsApi'

type Choice = { key: string; method: PayMethod; paymentMethodId: string | null; title: string; detail: string }

export function PayChoice({ amount, busy, onPay, onManage }: {
  amount: number
  busy: boolean
  onPay: (method: PayMethod, paymentMethodId: string | null) => void
  // Opens "My payment methods".
  onManage: () => void
}) {
  const { authFetch } = useAuth()
  const [saved, setSaved] = useState<SavedPaymentMethod[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  // Saved wallets are optional: if they cannot be loaded, the customer can still pay on JazzCash's page.
  useEffect(() => {
    let current = true
    authFetch<SavedPaymentMethod[]>(paymentMethodPaths.mine).then((methods) => { if (current) setSaved(methods) }).catch(() => {})
    return () => { current = false }
  }, [authFetch])

  const choices: Choice[] = [
    ...saved.filter((method) => method.methodType === 'Wallet').map((method) => ({
      key: method.id, method: 'Wallet' as const, paymentMethodId: method.id, title: method.label,
      detail: method.isDefault ? 'Your default wallet' : 'Saved wallet',
    })),
    { key: 'wallet', method: 'Wallet', paymentMethodId: null, title: saved.length ? 'Another JazzCash wallet' : 'JazzCash wallet', detail: 'Enter the number on JazzCash' },
    { key: 'card', method: 'Card', paymentMethodId: null, title: 'Debit or credit card', detail: "Typed on JazzCash's secure page" },
  ]
  const chosenKey = selected ?? saved.find((method) => method.isDefault && method.methodType === 'Wallet')?.id ?? 'wallet'
  const chosen = choices.find((choice) => choice.key === chosenKey) ?? choices[choices.length - 2]!

  return (
    <div className="bl-pay">
      <div className="bl-pay-head">
        <h3>Pay with</h3>
        <button type="button" className="hub-button secondary small" onClick={onManage}>Payment methods</button>
      </div>
      <div className="bl-options" role="radiogroup" aria-label="Payment method">
        {choices.map((choice) => (
          <button key={choice.key} type="button" role="radio" aria-checked={choice.key === chosen.key}
            className={choice.key === chosen.key ? 'bl-option active' : 'bl-option'} onClick={() => setSelected(choice.key)}>
            <strong>{choice.title}</strong>
            <span>{choice.detail}</span>
          </button>
        ))}
      </div>
      <button type="button" className="hub-button bl-pay-button" disabled={busy} onClick={() => onPay(chosen.method, chosen.paymentMethodId)}>
        {busy ? 'Opening JazzCash…' : `Pay ${rupees(amount)}`}
      </button>
      <p className="bl-muted">You will finish the payment on JazzCash and come back here.</p>
    </div>
  )
}
