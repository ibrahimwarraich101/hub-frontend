// File purpose: Choosing how to pay a bill and the "Pay" button. With JazzCash: a saved JazzCash wallet, another JazzCash
// wallet, or a card on JazzCash's page (saved wallets come from "My payment methods"; the default one is chosen first).
// With Safepay (chosen by the server, see usePaymentProvider): a card on Safepay's page only.
import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { paymentMethodPaths } from '../../shared/payments/paymentMethodsApi'
import type { SavedPaymentMethod } from '../../shared/payments/paymentMethodsApi'
import { usePaymentProvider } from '../../shared/payments/paymentProvider'
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
  const payments = usePaymentProvider()
  const [saved, setSaved] = useState<SavedPaymentMethod[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  // Saved wallets are optional: if they cannot be loaded, the customer can still pay on the payment page.
  useEffect(() => {
    let current = true
    authFetch<SavedPaymentMethod[]>(paymentMethodPaths.mine).then((methods) => { if (current) setSaved(methods) }).catch(() => {})
    return () => { current = false }
  }, [authFetch])

  // Only saved methods of the payment company in use can be charged (saved JazzCash wallets do not work with Safepay).
  const usable = saved.filter((method) => method.methodType === 'Wallet' && method.provider === payments.provider && payments.allows('Wallet'))
  const choices: Choice[] = [
    ...usable.map((method) => ({
      key: method.id, method: 'Wallet' as const, paymentMethodId: method.id, title: method.label,
      detail: method.isDefault ? 'Your default wallet' : 'Saved wallet',
    })),
    ...(payments.allows('Wallet')
      ? [{ key: 'wallet', method: 'Wallet' as const, paymentMethodId: null, title: usable.length ? 'Another JazzCash wallet' : 'JazzCash wallet', detail: 'Enter the number on JazzCash' }]
      : []),
    { key: 'card', method: 'Card', paymentMethodId: null, title: 'Debit or credit card', detail: `Typed on ${payments.name}'s secure page` },
  ]
  const preferred = usable.find((method) => method.isDefault)?.id ?? choices[0]!.key
  const chosen = choices.find((choice) => choice.key === (selected ?? preferred)) ?? choices[0]!

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
        {busy ? `Opening ${payments.name}…` : `Pay ${rupees(amount)}`}
      </button>
      <p className="bl-muted">You will finish the payment on {payments.name} and come back here.</p>
    </div>
  )
}
