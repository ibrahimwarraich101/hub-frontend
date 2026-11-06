// File purpose: Admin portal (E-Commerce part): review seller accounts - approve, reject, suspend or reinstate with a reason.
// Only shown to Administrators; the backend checks the role again on every request.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { StatusBadge } from '../seller/SellerCenter'
import { decisionsFor, sellerPaths, shortDate } from '../sellerApi'
import type { AdminSeller, AdminSellerPage, SellerDecision, SellerStatus } from '../sellerApi'
import '../marketplace.css'

type Props = { onExit: () => void }

const STATUSES: SellerStatus[] = ['Pending', 'Approved', 'Suspended', 'Rejected']

export function AdminPortal({ onExit }: Props) {
  const { authFetch } = useAuth()
  const [status, setStatus] = useState<SellerStatus>('Pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminSellerPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  const load = useCallback((signal: { cancelled: boolean }) => {
    authFetch<AdminSellerPage>(sellerPaths.queue(status, page))
      .then((result) => { if (!signal.cancelled) { setData(result); setError(null) } })
      .catch((reason: unknown) => {
        if (!signal.cancelled) setError(reason instanceof ApiError ? reason.message : 'Could not load sellers.')
      })
  }, [authFetch, status, page])

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => { signal.cancelled = true }
  }, [load, reload])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <section className="mp-app" aria-label="Admin portal">
      <header className="mp-header">
        <button type="button" className="mp-back" onClick={onExit}>← HUB</button>
        <h1>Admin portal · Sellers</h1>
      </header>

      <div className="mp-chips" role="tablist" aria-label="Seller status">
        {STATUSES.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={status === value}
            className={status === value ? 'mp-chip active' : 'mp-chip'}
            onClick={() => { setStatus(value); setPage(1); setNotice(null) }}>
            {value}
          </button>
        ))}
      </div>

      {notice && <div className="mp-message" role="status">{notice}</div>}
      {error && <div className="mp-message error" role="alert">{error}</div>}
      {!error && !data && <div className="mp-message">Loading…</div>}
      {data && data.items.length === 0 && <div className="mp-message">No {status.toLowerCase()} sellers.</div>}

      {data && data.items.length > 0 && (
        <ul className="mp-admin-list">
          {data.items.map((seller) => (
            <SellerRow key={seller.account.id} seller={seller}
              onDone={(message, decided) => {
                setNotice(message)
                // Take a decided seller off this list at once (its status changed), then reload the latest data.
                if (decided) setData((current) => current && { ...current, total: current.total - 1, items: current.items.filter((item) => item.account.id !== decided) })
                setReload((count) => count + 1)
              }} />
          ))}
        </ul>
      )}

      {data && data.total > data.pageSize && (
        <div className="mp-pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  )
}

function SellerRow({ seller, onDone }: { seller: AdminSeller; onDone: (message: string, decidedId?: string) => void }) {
  const { authFetch } = useAuth()
  const [decision, setDecision] = useState<SellerDecision | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { account, owner } = seller

  async function confirm() {
    if (!decision) return
    if (!reason.trim()) return setError('Please write a reason. The seller will see it.')
    setBusy(true)
    setError(null)
    try {
      await authFetch(sellerPaths.review(account.id), 'POST', { decision, reason: reason.trim(), expectedVersion: account.version })
      onDone(`${account.name}: ${decision.toLowerCase()} done.`, account.id)
    } catch (reason) {
      // 409 usually means another administrator changed it first; the list reloads to show the latest state.
      if (reason instanceof ApiError && reason.status === 409) onDone(`${account.name}: ${reason.message}`)
      else setError(reason instanceof ApiError ? reason.message : 'The decision could not be saved.')
      setBusy(false)
    }
  }

  return (
    <li className="mp-panel">
      <div className="mp-admin-head">
        <h2>{account.name}</h2>
        <StatusBadge status={account.status} />
      </div>
      <dl className="mp-facts">
        <dt>Owner</dt><dd>{owner.fullName} · {owner.email} · {owner.phone}</dd>
        <dt>Store phone</dt><dd>{account.phone}</dd>
        {account.description && (<><dt>About</dt><dd>{account.description}</dd></>)}
        <dt>Submitted</dt><dd>{shortDate(account.submittedAt)}</dd>
        {account.reviewReason && (<><dt>Last reason</dt><dd>{account.reviewReason}</dd></>)}
      </dl>

      {decision === null ? (
        <div className="mp-actions">
          {decisionsFor[account.status].map((option) => (
            <button key={option} type="button" className={option === 'Approve' || option === 'Reinstate' ? 'mp-primary' : 'mp-danger'}
              onClick={() => { setDecision(option); setReason(''); setError(null) }}>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="mp-form">
          <label>
            Reason for “{decision}” (shown to the seller)
            <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </label>
          {error && <p className="mp-message error" role="alert">{error}</p>}
          <div className="mp-actions">
            <button type="button" className={decision === 'Approve' || decision === 'Reinstate' ? 'mp-primary' : 'mp-danger'}
              disabled={busy} onClick={() => void confirm()}>
              {busy ? 'Saving…' : `Confirm ${decision.toLowerCase()}`}
            </button>
            <button type="button" className="mp-link" disabled={busy} onClick={() => setDecision(null)}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  )
}
