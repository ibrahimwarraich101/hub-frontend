// File purpose: Admin portal (HUB Food part): review restaurants - approve, reject, suspend or reinstate with a reason.
// Only shown to Administrators; the backend checks the role again on every request.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { dateTime, decisionsFor, foodPaths } from '../foodApi'
import type { AdminRestaurant, AdminRestaurantPage, RestaurantDecision, RestaurantStatus } from '../foodApi'
import '../food.css'
import '../../../shared/auth/auth.css'

type Props = { onExit: () => void }

const STATUSES: RestaurantStatus[] = ['Pending', 'Approved', 'Suspended', 'Rejected']

export function RestaurantApprovals({ onExit }: Props) {
  const { authFetch } = useAuth()
  const [status, setStatus] = useState<RestaurantStatus>('Pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminRestaurantPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  const load = useCallback((signal: { cancelled: boolean }) => {
    authFetch<AdminRestaurantPage>(foodPaths.adminQueue(status, page))
      .then((result) => { if (!signal.cancelled) { setData(result); setError(null) } })
      .catch((reason: unknown) => { if (!signal.cancelled) setError(reason instanceof ApiError ? reason.message : 'Could not load restaurants.') })
  }, [authFetch, status, page])

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => { signal.cancelled = true }
  }, [load, reload])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <section className="fd-app" aria-label="Restaurant approvals">
      <header className="fd-header">
        <button type="button" className="fd-back" onClick={onExit}>← HUB</button>
        <h1>Admin portal · Restaurants</h1>
      </header>
      <div className="fd-tabs" role="tablist" aria-label="Restaurant status">
        {STATUSES.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={status === value} className={status === value ? 'fd-tab active' : 'fd-tab'}
            onClick={() => { setStatus(value); setPage(1); setNotice(null) }}>
            {value}
          </button>
        ))}
      </div>
      {notice && <div className="fd-message" role="status">{notice}</div>}
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !data && <div className="fd-message">Loading…</div>}
      {data && data.items.length === 0 && <div className="fd-message">No {status.toLowerCase()} restaurants.</div>}
      {data && data.items.map((item) => (
        <ReviewCard key={item.account.id} item={item} onDone={(text) => { setNotice(text); setReload((value) => value + 1) }} />
      ))}
      {data && totalPages > 1 && (
        <nav className="fd-pager" aria-label="Pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </section>
  )
}

function ReviewCard({ item, onDone }: { item: AdminRestaurant; onDone: (text: string) => void }) {
  const { authFetch } = useAuth()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const account = item.account

  async function decide(decision: RestaurantDecision) {
    if (!reason.trim()) return setError('Write a reason first. The restaurant owner will see it.')
    setBusy(true)
    setError(null)
    try {
      await authFetch(foodPaths.adminReview(account.id), 'POST', { decision, reason: reason.trim(), expectedVersion: account.version })
      onDone(`${account.name}: ${decision.toLowerCase()} done.`)
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : 'Could not save the decision.')
      setBusy(false)
    }
  }

  return (
    <article className="fd-panel">
      <div className="fd-card-top">
        <h2>{account.name}</h2>
        <span className={`fd-status fd-status-${account.status.toLowerCase()}`}>{account.status}</span>
      </div>
      <dl className="fd-facts">
        <dt>Owner</dt><dd>{item.owner.fullName} · {item.owner.email} · {item.owner.phone}</dd>
        <dt>Cuisine</dt><dd>{account.cuisine}</dd>
        <dt>Address</dt><dd>{account.addressLine}, {account.city}</dd>
        <dt>Restaurant phone</dt><dd>{account.phone}</dd>
        {account.description && (<><dt>About</dt><dd>{account.description}</dd></>)}
        <dt>Submitted</dt><dd>{dateTime(account.submittedAt)}</dd>
        {account.reviewReason && (<><dt>Last reason</dt><dd>{account.reviewReason}</dd></>)}
      </dl>
      {decisionsFor[account.status].length > 0 && (
        <div className="fd-form">
          <label className="auth-field">
            Reason (shown to the owner)
            <textarea rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && <p className="fd-message error" role="alert">{error}</p>}
          <div className="fd-actions">
            {decisionsFor[account.status].map((decision) => (
              <button key={decision} type="button" className={decision === 'Approve' || decision === 'Reinstate' ? 'fd-primary' : 'fd-danger'}
                disabled={busy} onClick={() => void decide(decision)}>{decision}</button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
