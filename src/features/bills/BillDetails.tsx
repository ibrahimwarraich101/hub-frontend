// File purpose: One bill: the receipt once paid (receipt number, when, paid with), or, while waiting, paying it before
// the held amount runs out. An expired bill can be looked up again. Shows the JazzCash result after coming back.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { billPaths, billResultMessages, dayLabel, monthLabel, rupees, startBillPayment, statusLabels, timeLabel } from './billsApi'
import type { BillPayment, PayMethod } from './billsApi'
import { PayChoice } from './PayChoice'

export function BillDetails({ billId, result, onLookUpAgain, onManagePayments }: {
  billId: string
  // JazzCash result when coming back from paying (success, failed...).
  result: string | null
  onLookUpAgain: (billerId: string, reference: string) => void
  onManagePayments: () => void
}) {
  const { authFetch } = useAuth()
  const [bill, setBill] = useState<BillPayment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    authFetch<BillPayment>(billPaths.one(billId)).then((data) => { setBill(data); setError(null) })
      .catch((reason: unknown) => setError(reason instanceof ApiError && reason.status === 404 ? 'This bill was not found.'
        : reason instanceof ApiError ? reason.message : 'Could not load this bill.'))
  }, [authFetch, billId])
  useEffect(load, [load])

  // While JazzCash is still processing, check again every few seconds.
  useEffect(() => {
    if (result !== 'pending' || bill?.status !== 'AwaitingPayment') return
    const timer = window.setTimeout(load, 5000)
    return () => window.clearTimeout(timer)
  }, [result, bill, load])

  async function pay(method: PayMethod, paymentMethodId: string | null) {
    setPayError(null)
    setBusy(true)
    try {
      await startBillPayment(authFetch, billId, method, paymentMethodId)
    } catch (reason) {
      setPayError(reason instanceof ApiError ? reason.message : 'Could not start the payment. Please try again.')
      setBusy(false)
      load()
    }
  }

  if (error) return <p className="bl-message error" role="alert">{error}</p>
  if (!bill) return <p className="bl-muted">Loading…</p>
  // After coming back, show the result that matches what the server now says.
  const banner = result && billResultMessages[result] && !(result === 'success' && bill.status !== 'Paid') ? billResultMessages[result] : null

  return (
    <section className="bl-section" aria-label={`Bill ${bill.number}`}>
      {banner && <p className={`bl-message ${banner.tone}`} role="status">{banner.text}</p>}
      <div className={bill.status === 'Paid' ? 'bl-card bl-receipt paid' : 'bl-card bl-receipt'}>
        <div className="bl-bill-head">
          <div>
            <span className="bl-muted">{bill.status === 'Paid' ? 'Payment receipt' : 'Bill'} · {bill.number}</span>
            <strong className="bl-bill-name">{bill.billerName}</strong>
          </div>
          <span className={`hub-pill ${bill.status === 'Paid' ? 'success' : bill.status === 'Expired' ? 'muted' : 'warning'}`}>{statusLabels[bill.status]}</span>
        </div>
        <div className="bl-total">
          <span>
            {bill.status === 'Paid' ? 'Amount paid' : 'Amount'}
            {/* Started after the due date: the amount includes the bill company's late charge. */}
            {bill.createdAt.slice(0, 10) > bill.dueDate && <span className="bl-total-note">Includes the late charge</span>}
          </span>
          <strong>{rupees(bill.amount)}</strong>
        </div>
        <dl className="bl-facts">
          <dt>Name on bill</dt><dd>{bill.consumerName}</dd>
          <dt>{bill.referenceLabel}</dt><dd>{bill.reference}</dd>
          <dt>Bill month</dt><dd>{monthLabel(bill.billingMonth)}</dd>
          <dt>Due date</dt><dd>{dayLabel(bill.dueDate)}</dd>
          {bill.paidAt && <><dt>Paid on</dt><dd>{timeLabel(bill.paidAt)}</dd></>}
          {bill.paidWith && <><dt>Paid with</dt><dd>{bill.paidWith}</dd></>}
          {bill.receiptNumber && <><dt>Receipt number</dt><dd className="bl-receipt-number">{bill.receiptNumber}</dd></>}
        </dl>
        {bill.demo && <p className="bl-muted">Demo bill: no real bill company was paid.</p>}
      </div>

      {bill.status === 'AwaitingPayment' && (
        <div className="bl-card">
          <p className="bl-muted">This amount is held for you until {timeLabel(bill.payBefore)}.</p>
          {bill.paymentMessage && <p className="bl-message error">{bill.paymentMessage}</p>}
          {payError && <p className="bl-message error" role="alert">{payError}</p>}
          <PayChoice amount={bill.amount} busy={busy} onPay={(method, id) => void pay(method, id)} onManage={onManagePayments} />
        </div>
      )}
      {bill.status === 'Expired' && (
        <div className="bl-card">
          <p>This bill was not paid in time. Look it up again to see the latest amount and pay it.</p>
          <button type="button" className="hub-button" onClick={() => onLookUpAgain(bill.billerId, bill.reference)}>Look up again</button>
        </div>
      )}
    </section>
  )
}
