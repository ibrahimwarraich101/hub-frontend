// File purpose: "Pay a bill": choose the bill type, then the company, type the reference from the bill, see the bill
// (name, month, due date, amount) and pay it. Every mistake is explained under the field before anything is sent.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { billPaths, dayLabel, monthLabel, newKey, rupees, startBillPayment } from './billsApi'
import type { BillCategory, BillLookup, BillPayment, Biller, PayMethod } from './billsApi'
import { PayChoice } from './PayChoice'

// Tile colours per bill type (the HUB service colours).
const categoryTone: Record<string, string> = {
  Electricity: 'shop', Gas: 'food', Water: 'bills', Internet: 'fitness', MobilePostpaid: 'drive', Education: 'mint',
}

export function PayBill({ start, onOpenHistory, onManagePayments }: {
  // Opened from an expired bill: that company and reference are filled in.
  start?: { billerId: string; reference: string }
  onOpenHistory: () => void
  onManagePayments: () => void
}) {
  const { authFetch } = useAuth()
  const [categories, setCategories] = useState<BillCategory[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryCode, setCategoryCode] = useState<string | null>(null)
  const [biller, setBiller] = useState<Biller | null>(null)

  useEffect(() => {
    let current = true
    authFetch<BillCategory[]>(billPaths.billers).then((list) => {
      if (!current) return
      setCategories(list)
      const found = start && list.flatMap((category) => category.billers).find((item) => item.id === start.billerId)
      if (found) { setCategoryCode(found.category); setBiller(found) }
    }).catch((reason: unknown) => { if (current) setLoadError(reason instanceof ApiError ? reason.message : 'Could not load the bill companies.') })
    return () => { current = false }
  }, [authFetch, start])

  if (loadError) return <p className="bl-message error" role="alert">{loadError}</p>
  if (!categories) return <p className="bl-muted">Loading…</p>
  const category = categories.find((item) => item.code === categoryCode) ?? null

  if (!category) {
    return (
      <section className="bl-section" aria-label="Bill types">
        <h2>What do you want to pay?</h2>
        <ul className="bl-tiles">
          {categories.map((item) => (
            <li key={item.code}>
              <button type="button" className={`bl-tile ${categoryTone[item.code] ?? 'mint'}`} onClick={() => setCategoryCode(item.code)}>
                <strong>{item.label}</strong>
                <span>{item.billers.length} {item.billers.length === 1 ? 'company' : 'companies'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  if (!biller) {
    return (
      <section className="bl-section" aria-label={category.label}>
        <button type="button" className="hub-button secondary small bl-back" onClick={() => setCategoryCode(null)}>Back</button>
        <h2>{category.label}</h2>
        <p className="bl-muted">Choose the company on your bill.</p>
        <ul className="bl-billers">
          {category.billers.map((item) => (
            <li key={item.id}>
              <button type="button" className="bl-biller" onClick={() => setBiller(item)}>
                <strong>{item.name}</strong>
                <span>{item.referenceLabel}, {item.referenceLength} digits</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <BillForm key={biller.id} biller={biller} initialReference={start?.billerId === biller.id ? start.reference : ''}
      onBack={() => setBiller(null)} onOpenHistory={onOpenHistory} onManagePayments={onManagePayments} />
  )
}

function BillForm({ biller, initialReference, onBack, onOpenHistory, onManagePayments }: {
  biller: Biller
  initialReference: string
  onBack: () => void
  onOpenHistory: () => void
  onManagePayments: () => void
}) {
  const { authFetch } = useAuth()
  const [reference, setReference] = useState(initialReference)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [bill, setBill] = useState<BillLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // One key for this bill's "Pay" tap, so pressing twice starts it once.
  const [requestKey] = useState(() => newKey('bill'))

  function check(value: string): string | null {
    if (!value) return `Please enter the ${biller.referenceLabel.toLowerCase()}.`
    if (value.length !== biller.referenceLength) return `The ${biller.referenceLabel.toLowerCase()} has ${biller.referenceLength} digits (you typed ${value.length}).`
    if (biller.category === 'MobilePostpaid' && !value.startsWith('03')) return 'Enter the mobile number starting with 03, for example 03001234567.'
    return null
  }

  async function lookUp(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBill(null)
    const problem = check(reference)
    setFieldError(problem)
    if (problem) return
    setBusy(true)
    try {
      setBill(await authFetch<BillLookup>(billPaths.lookup, 'POST', { billerId: biller.id, reference }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not reach the bill company. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function pay(method: PayMethod, paymentMethodId: string | null) {
    setError(null)
    setBusy(true)
    try {
      const started = await authFetch<BillPayment>(billPaths.create, 'POST', { billerId: biller.id, reference, requestKey })
      await startBillPayment(authFetch, started.id, method, paymentMethodId)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not start the payment. Please try again.')
      setBusy(false)
    }
  }

  return (
    <section className="bl-section" aria-label={`Pay ${biller.name}`}>
      <button type="button" className="hub-button secondary small bl-back" onClick={onBack}>Back</button>
      <h2>{biller.name}</h2>
      <form className="bl-card bl-form" onSubmit={(event) => void lookUp(event)} noValidate>
        <label className={fieldError ? 'auth-field invalid' : 'auth-field'}>
          {biller.referenceLabel}
          <input name="reference" inputMode="numeric" autoComplete="off" value={reference} maxLength={biller.referenceLength}
            placeholder={biller.referenceExample} aria-invalid={fieldError ? true : undefined}
            onChange={(event) => { setReference(event.target.value.replace(/\D/g, '').slice(0, biller.referenceLength)); setFieldError(null); setBill(null) }} />
          {fieldError ? <span className="auth-field-error">{fieldError}</span>
            : <span className="auth-hint">{biller.referenceLength} digits, printed on your bill. Demo: any number works; ending in 0000 means "not found".</span>}
        </label>
        <button type="submit" className="hub-button" disabled={busy && !bill}>{busy && !bill ? 'Finding your bill…' : 'Find bill'}</button>
      </form>

      {error && <p className="bl-message error" role="alert">{error}</p>}

      {bill && (
        <div className="bl-card bl-bill">
          <div className="bl-bill-head">
            <div>
              <span className="bl-muted">{bill.billerName}</span>
              <strong className="bl-bill-name">{bill.consumerName}</strong>
            </div>
            {bill.demo && <span className="hub-pill info">Demo bill</span>}
          </div>
          <dl className="bl-facts">
            <dt>Bill month</dt><dd>{monthLabel(bill.billingMonth)}</dd>
            <dt>Due date</dt><dd>{dayLabel(bill.dueDate)}{bill.overdue && <span className="hub-pill warning bl-inline">Overdue</span>}</dd>
            <dt>Amount by due date</dt><dd>{rupees(bill.amountWithinDueDate)}</dd>
            <dt>Amount after due date</dt><dd>{rupees(bill.amountAfterDueDate)}</dd>
          </dl>
          {bill.status === 'Paid' && <p className="bl-message success">This bill is already paid for {monthLabel(bill.billingMonth)}.</p>}
          {bill.status === 'NoDue' && <p className="bl-message info">There is nothing to pay on this bill right now.</p>}
          {bill.status === 'Unpaid' && (
            <>
              <div className="bl-total"><span>To pay now</span><strong>{rupees(bill.payableAmount)}</strong></div>
              <PayChoice amount={bill.payableAmount} busy={busy} onPay={(method, id) => void pay(method, id)} onManage={onManagePayments} />
            </>
          )}
          {bill.status === 'Paid' && <button type="button" className="hub-button secondary" onClick={onOpenHistory}>See my bills</button>}
        </div>
      )}
    </section>
  )
}
