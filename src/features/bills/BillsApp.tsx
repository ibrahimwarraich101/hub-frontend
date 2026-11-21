// File purpose: Entry point of Bills on the website: pay a bill, My bills, one bill (receipt), and My payment methods,
// shown inside the HUB frame with the shared service bar (Back, HUB Bills, Pay a bill, My bills, Payment methods).
// Coming back from JazzCash opens the paid bill. The page is kept in the address (#bills, #bills/history, #bills/bill/<id>,
// #bills/methods), so Refresh and the browser's Back button work.
import { useCallback, useEffect, useState } from 'react'
import { ModuleBar } from '../../shared/layout/AppShell'
import { enterSection, goTo, sectionDepth, sectionPath, useSectionHistory } from '../../shared/layout/sectionRoute'
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

const SECTION = 'bills'

function readView(path: string | null): View {
  const [page, id] = (path ?? '').split('/')
  if (page === 'bill' && id) return { page: 'bill', billId: decodeURIComponent(id), result: null }
  if (page === 'history') return { page: 'history' }
  if (page === 'methods') return { page: 'methods' }
  return { page: 'pay' }
}

function pathOf(view: View): string {
  if (view.page === 'bill') return `bill/${encodeURIComponent(view.billId)}`
  return view.page === 'pay' ? '' : view.page
}

function firstView(): View {
  // JazzCash sends the customer back with ?bill=...&payment=...
  const back = readBillReturn()
  if (!back) return readView(sectionPath(SECTION))
  clearBillReturn()
  return { page: 'bill', billId: back.billId, result: back.result }
}

export function BillsApp({ onExit }: { onExit: () => void }) {
  const [history, setHistory] = useState<View[]>(() => [firstView()])
  const view = history[history.length - 1]!

  // Put the first page in the address bar when Bills opens.
  const [startPath] = useState(() => pathOf(history[0]!))
  useEffect(() => {
    enterSection(SECTION, startPath)
    if (sectionPath(SECTION) !== startPath) goTo(SECTION, startPath, true)
  }, [startPath])

  const open = useCallback((next: View) => {
    goTo(SECTION, pathOf(next))
    setHistory((pages) => (next.page === 'pay' && !next.start ? [next] : [...pages.slice(-19), next]))
    window.scrollTo({ top: 0 })
  }, [])

  // The browser's Back/Forward buttons.
  useSectionHistory(SECTION, useCallback((path: string | null) => {
    if (path === null) { onExit(); return }
    const next = readView(path)
    setHistory((pages) => {
      const previous = pages[pages.length - 2]
      if (previous && pathOf(previous) === path) return pages.slice(0, -1)
      return next.page === 'pay' ? [next] : [...pages.slice(-19), next]
    })
    window.scrollTo({ top: 0 })
  }, [onExit]))

  // Back: one step back in the browser while that stays inside Bills, otherwise to "Pay a bill".
  const back = useCallback(() => {
    if (sectionDepth() > 1) window.history.back()
    else { goTo(SECTION, '', true); setHistory([{ page: 'pay' }]) }
  }, [])

  return (
    <section className="bl-app" aria-label="HUB Bills">
      <ModuleBar title="HUB Bills" onTitle={() => open({ page: 'pay' })} onBack={view.page === 'pay' && !view.start ? undefined : back}
        tabs={[
          { label: 'Pay a bill', active: view.page === 'pay', onClick: () => open({ page: 'pay' }) },
          { label: 'My bills', active: view.page === 'history' || view.page === 'bill', onClick: () => open({ page: 'history' }) },
          { label: 'Payment methods', active: view.page === 'methods', onClick: () => open({ page: 'methods' }) },
        ]} />
      <div className="bl-body">
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
