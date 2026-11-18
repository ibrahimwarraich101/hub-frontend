// File purpose: "My bills": every bill the customer started or paid, newest first, with paging.
import { useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { billPaths, monthLabel, rupees, statusLabels } from './billsApi'
import type { BillPage } from './billsApi'

export function MyBills({ onOpen, onPayBill }: { onOpen: (id: string) => void; onPayBill: () => void }) {
  const { authFetch } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<BillPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let current = true
    authFetch<BillPage>(billPaths.mine(page)).then((result) => { if (current) { setData(result); setError(null) } })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your bills.') })
    return () => { current = false }
  }, [authFetch, page, reload])

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return (
    <section className="bl-section" aria-label="My bills">
      <h2>My bills</h2>
      {error && <p className="bl-message error" role="alert">{error} <button type="button" className="hub-button secondary small" onClick={() => setReload((n) => n + 1)}>Try again</button></p>}
      {!data && !error && <p className="bl-muted">Loading…</p>}
      {data && data.total === 0 && (
        <div className="bl-empty">
          <h3>No bills yet</h3>
          <p className="bl-muted">Bills you pay on HUB appear here with their receipts.</p>
          <button type="button" className="hub-button" onClick={onPayBill}>Pay a bill</button>
        </div>
      )}
      {data && data.items.length > 0 && (
        <ul className="bl-history">
          {data.items.map((bill) => (
            <li key={bill.id}>
              <button type="button" className="bl-history-row" onClick={() => onOpen(bill.id)}>
                <span className="bl-history-main">
                  <strong>{bill.billerName}</strong>
                  <span className="bl-muted">{monthLabel(bill.billingMonth)} · {bill.number}</span>
                </span>
                <span className="bl-history-side">
                  <strong>{rupees(bill.amount)}</strong>
                  <span className={`hub-pill ${bill.status === 'Paid' ? 'success' : bill.status === 'Expired' ? 'muted' : 'warning'}`}>{statusLabels[bill.status]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && data.total > data.pageSize && (
        <div className="bl-pager">
          <button type="button" className="hub-button secondary small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className="hub-button secondary small" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  )
}
