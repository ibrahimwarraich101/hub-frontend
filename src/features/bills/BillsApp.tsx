// File purpose: Entry point of Bills on the website: pay a bill, My bills, one bill (receipt), and My payment methods,
// with a top bar like the store's ("HUB Bills" returns to the HUB home). Coming back from JazzCash opens the paid bill.
import { useCallback, useState } from 'react'
import { PaymentMethods } from '../../shared/payments/PaymentMethods'
import { BillDetails } from './BillDetails'
import { clearBillReturn, readBillReturn } from './billsApi'
import { MyBills } from './MyBills'
import { PayBill } from './PayBill'
import './bills.css'

type View =
  | { page: 'pay'; start?: { billerId: string; reference: string } }
  | { page: 'history' }
  | { page: 'bill'; billId: string; result: string | null }
  | { page: 'methods' }

function firstView(): View {
  // JazzCash sends the customer back with ?bill=...&payment=...
  const back = readBillReturn()
  if (!back) return { page: 'pay' }
  clearBillReturn()
  return { page: 'bill', billId: back.billId, result: back.result }
}

export function BillsApp({ onExit }: { onExit: () => void }) {
  const [history, setHistory] = useState<View[]>(() => [firstView()])
  const view = history[history.length - 1]!

  const open = useCallback((next: View) => {
    setHistory((pages) => (next.page === 'pay' && !next.start ? [next] : [...pages.slice(-19), next]))
    window.scrollTo({ top: 0 })
  }, [])
  const back = useCallback(() => {
    setHistory((pages) => (pages.length > 1 ? pages.slice(0, -1) : [{ page: 'pay' }]))
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <section className="bl-app" aria-label="HUB Bills">
      <header className="bl-topbar">
        <div className="bl-topbar-inner">
          {/* The name takes the customer back to the HUB home page. */}
          <h1 className="bl-brand"><button type="button" className="bl-brand-button" onClick={onExit}>HUB Bills</button></h1>
          <nav className="bl-topbar-actions" aria-label="Bills">
            <button type="button" className={view.page === 'pay' ? 'bl-nav active' : 'bl-nav'} onClick={() => open({ page: 'pay' })}>Pay a bill</button>
            <button type="button" className={view.page === 'history' || view.page === 'bill' ? 'bl-nav active' : 'bl-nav'} onClick={() => open({ page: 'history' })}>My bills</button>
          </nav>
        </div>
      </header>
      <div className="bl-body">
        {view.page !== 'pay' && <button type="button" className="hub-button secondary small bl-back" onClick={back}>Back</button>}
        {view.page === 'pay' && (
          <>
            {!view.start && (
              <div className="bl-hero">
                <h2>Pay your bills</h2>
                <p>Electricity, gas, water, internet, mobile and school fees in one place. Pay safely with JazzCash and keep every receipt.</p>
              </div>
            )}
            <PayBill key={view.start ? `${view.start.billerId}-${view.start.reference}` : 'new'} start={view.start}
              onOpenHistory={() => open({ page: 'history' })} onManagePayments={() => open({ page: 'methods' })} />
          </>
        )}
        {view.page === 'history' && <MyBills onOpen={(billId) => open({ page: 'bill', billId, result: null })} onPayBill={() => open({ page: 'pay' })} />}
        {view.page === 'bill' && (
          <BillDetails key={view.billId} billId={view.billId} result={view.result}
            onLookUpAgain={(billerId, reference) => open({ page: 'pay', start: { billerId, reference } })} onManagePayments={() => open({ page: 'methods' })} />
        )}
        {view.page === 'methods' && (
          <section className="bl-section" aria-label="My payment methods">
            <h2>My payment methods</h2>
            <PaymentMethods />
          </section>
        )}
      </div>
    </section>
  )
}
