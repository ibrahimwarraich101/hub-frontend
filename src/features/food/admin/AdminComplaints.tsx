// File purpose: Admin portal (HUB Food part): customer complaints about orders. Open ones come first; the administrator
// reads both sides, then closes each as Resolved or Dismissed with a note the customer and the restaurant will see.
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { confirmLeave, useUnsavedChanges } from '../../../shared/forms/unsavedChanges'
import { ComplaintThread } from '../ComplaintThread'
import { complaintTopicLabel, dateTime, foodPaths, money, statusLabel } from '../foodApi'
import type { AdminComplaint, ComplaintStatus, FoodComplaintPage } from '../foodApi'

type Props = { onOpenOrder: (orderId: string) => void; onChanged: () => void }

const TABS: { value: ComplaintStatus | ''; label: string }[] = [
  { value: 'Open', label: 'Open' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Dismissed', label: 'Dismissed' },
  { value: '', label: 'All' },
]

export function AdminComplaints({ onOpenOrder, onChanged }: Props) {
  const { authFetch } = useAuth()
  const [status, setStatus] = useState<ComplaintStatus | ''>('Open')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<FoodComplaintPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback((signal: { cancelled: boolean }) => {
    authFetch<FoodComplaintPage>(foodPaths.adminComplaints(status, query, page))
      .then((result) => { if (!signal.cancelled) { setData(result); setError(null) } })
      .catch((reason: unknown) => { if (!signal.cancelled) setError(reason instanceof ApiError ? reason.message : 'Could not load complaints.') })
  }, [authFetch, status, query, page])

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    const timer = window.setInterval(() => load(signal), 30000)
    return () => { signal.cancelled = true; window.clearInterval(timer) }
  }, [load])

  function submit(event: FormEvent) {
    event.preventDefault()
    setData(null)
    setPage(1)
    setQuery(search.trim())
  }

  if (openId) {
    return (
      <ComplaintView complaintId={openId} onOpenOrder={onOpenOrder}
        onBack={() => confirmLeave(() => { setOpenId(null); load({ cancelled: false }) })}
        onClosed={(text) => { setNotice(text); setOpenId(null); setData(null); load({ cancelled: false }); onChanged() }} />
    )
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return (
    <>
      <div className="fd-tabs" role="tablist" aria-label="Complaint status">
        {TABS.map((tab) => (
          <button key={tab.label} type="button" role="tab" aria-selected={status === tab.value} className={status === tab.value ? 'fd-tab active' : 'fd-tab'}
            onClick={() => { setStatus(tab.value); setPage(1); setData(null); setNotice(null) }}>{tab.label}</button>
        ))}
      </div>
      <form className="fd-admin-filters" onSubmit={submit} role="search">
        <input aria-label="Search complaints" placeholder="Order number, customer or restaurant" value={search} maxLength={100}
          onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="fd-primary">Search</button>
        {query && <button type="button" className="fd-link" onClick={() => { setSearch(''); setQuery(''); setPage(1); setData(null) }}>Clear</button>}
      </form>
      {notice && <div className="fd-message" role="status">{notice}</div>}
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !data && <div className="fd-message">Loading…</div>}
      {data && <h2 className="fd-results">{data.total} {data.total === 1 ? 'complaint' : 'complaints'}</h2>}
      {data && data.items.length === 0 && <div className="fd-message">No complaints here.</div>}
      {data && data.items.length > 0 && (
        <ul className="fd-orders">
          {data.items.map((complaint) => (
            <li key={complaint.id}>
              <button type="button" className="fd-order-row fd-admin-row" onClick={() => setOpenId(complaint.id)}
                aria-label={`Open complaint about order ${complaint.orderNumber}`}>
                <span>
                  <strong>{complaintTopicLabel[complaint.topic]}</strong>
                  <span className="fd-meta">{dateTime(complaint.createdAt)}</span>
                </span>
                <span>
                  <strong>{complaint.restaurantName}</strong>
                  <span className="fd-meta">{complaint.customerName} · order {complaint.orderNumber}</span>
                </span>
                <span>
                  <strong className="fd-admin-quote">“{complaint.details}”</strong>
                  <span className="fd-meta">{complaint.restaurantReply ? 'Restaurant answered' : 'No answer from the restaurant'}</span>
                </span>
                <span className="fd-admin-badges">
                  <span className={`fd-status fd-status-${complaint.status.toLowerCase()}`}>{complaint.status}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && totalPages > 1 && (
        <nav className="fd-pager" aria-label="Pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </>
  )
}

type ViewProps = { complaintId: string; onBack: () => void; onClosed: (text: string) => void; onOpenOrder: (orderId: string) => void }

function ComplaintView({ complaintId, onBack, onClosed, onOpenOrder }: ViewProps) {
  const { authFetch } = useAuth()
  const [data, setData] = useState<AdminComplaint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  // A typed note that was not sent yet is an unsaved change.
  useUnsavedChanges(note.trim() !== '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    authFetch<AdminComplaint>(foodPaths.adminComplaint(complaintId))
      .then((result) => { if (!cancelled) setData(result) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof ApiError ? reason.message : 'Could not load this complaint.') })
    return () => { cancelled = true }
  }, [authFetch, complaintId])

  async function close(outcome: 'Resolved' | 'Dismissed') {
    if (!data) return
    if (note.trim().length < 2) return setError('Write a note first. The customer and the restaurant will read it.')
    setBusy(true)
    setError(null)
    try {
      await authFetch(foodPaths.adminCloseComplaint(complaintId), 'POST', { outcome, note: note.trim(), expectedVersion: data.complaint.version })
      setNote('')
      onClosed(`Complaint about order ${data.complaint.orderNumber}: ${outcome.toLowerCase()}.`)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not save the decision.')
      setBusy(false)
    }
  }

  const back = <button type="button" className="fd-link" onClick={onBack}>← All complaints</button>
  if (!data) return <>{back}{error ? <div className="fd-message error" role="alert">{error}</div> : <div className="fd-message">Loading…</div>}</>
  const complaint = data.complaint

  return (
    <div className="fd-layout">
      <div className="fd-admin-column">
        {back}
        <div className="fd-panel">
          <h2>Complaint about order {complaint.orderNumber}</h2>
          <ComplaintThread complaint={complaint} viewer="admin" />
          {complaint.canClose && (
            <div className="fd-form">
              <label className="auth-field">
                Your decision note (the customer and the restaurant will read it)
                <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you find, and what happens now?" />
              </label>
              {error && <p className="fd-message error" role="alert">{error}</p>}
              <div className="fd-actions">
                <button type="button" className="fd-primary" disabled={busy} onClick={() => void close('Resolved')}>Resolve</button>
                <button type="button" className="fd-danger" disabled={busy} onClick={() => void close('Dismissed')}>Dismiss</button>
              </div>
              <p className="fd-meta">Resolve when the customer was right and it is sorted out. Dismiss when there was no problem to fix.</p>
            </div>
          )}
        </div>
      </div>

      <aside className="fd-admin-column">
        <div className="fd-panel">
          <h3>Order</h3>
          <dl className="fd-facts">
            <dt>Number</dt><dd>{complaint.orderNumber}</dd>
            <dt>Total</dt><dd>{money(complaint.orderTotal)}</dd>
            <dt>Status</dt><dd>{statusLabel[data.orderStatus]}{data.refundDue && ' · refund due'}</dd>
          </dl>
          <button type="button" className="fd-link" onClick={() => onOpenOrder(complaint.orderId)}>Open the full order</button>
        </div>
        <div className="fd-panel">
          <h3>Customer</h3>
          <dl className="fd-facts">
            <dt>Name</dt><dd>{data.customer.fullName}</dd>
            <dt>Email</dt><dd>{data.customer.email}</dd>
            <dt>Phone</dt><dd>{data.customer.phone}</dd>
          </dl>
        </div>
        <div className="fd-panel">
          <h3>Restaurant</h3>
          <dl className="fd-facts">
            <dt>Name</dt><dd>{complaint.restaurantName}</dd>
            <dt>Phone</dt><dd>{data.restaurantPhone}</dd>
            <dt>Owner</dt><dd>{data.restaurantOwner.fullName} · {data.restaurantOwner.email}</dd>
          </dl>
        </div>
      </aside>
    </div>
  )
}
