// File purpose: Restaurant Center "Complaints" tab: customer reports about this restaurant's orders. The owner can answer
// (and change the answer) until HUB closes the complaint. Refreshes every 30 seconds.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { ComplaintThread } from '../ComplaintThread'
import { foodPaths, money } from '../foodApi'
import type { FoodComplaint, FoodComplaintPage } from '../foodApi'

type Filter = 'open' | 'closed'
type Props = { onChanged?: () => void }

export function RestaurantComplaints({ onChanged }: Props) {
  const { authFetch } = useAuth()
  const [filter, setFilter] = useState<Filter>('open')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<FoodComplaintPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    authFetch<FoodComplaintPage>(foodPaths.restaurantComplaints(filter, page))
      .then((result) => { setData(result); setError(null) })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Could not load complaints.'))
  }, [authFetch, filter, page])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 30000)
    return () => window.clearInterval(timer)
  }, [load])

  function saved(updated: FoodComplaint) {
    setData((current) => current && { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) })
    onChanged?.()
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return (
    <>
      <div className="fd-tabs" role="tablist" aria-label="Complaint status">
        {(['open', 'closed'] as Filter[]).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'fd-tab active' : 'fd-tab'}
            onClick={() => { setFilter(value); setPage(1); setData(null) }}>
            {value === 'open' ? 'Waiting for HUB' : 'Closed'}
          </button>
        ))}
      </div>
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !data && <div className="fd-message">Loading…</div>}
      {data && data.items.length === 0 && (
        <div className="fd-message">{filter === 'open' ? 'No open complaints. Well done!' : 'No closed complaints yet.'}</div>
      )}
      {data && data.items.map((complaint) => <ComplaintCard key={complaint.id} complaint={complaint} onSaved={saved} />)}
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

function ComplaintCard({ complaint, onSaved }: { complaint: FoodComplaint; onSaved: (complaint: FoodComplaint) => void }) {
  const { authFetch } = useAuth()
  const [editing, setEditing] = useState(false)
  const [reply, setReply] = useState(complaint.restaurantReply ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showForm = complaint.canReply && (editing || !complaint.restaurantReply)

  async function send() {
    if (reply.trim().length < 2) return setError('Write your answer first. The customer and HUB will read it.')
    setBusy(true)
    setError(null)
    try {
      onSaved(await authFetch<FoodComplaint>(foodPaths.complaintReply(complaint.id), 'POST', { reply: reply.trim(), expectedVersion: complaint.version }))
      setEditing(false)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not send your answer. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="fd-panel">
      <p className="fd-meta">Order {complaint.orderNumber} · {money(complaint.orderTotal)}</p>
      <ComplaintThread complaint={complaint} viewer="restaurant" />
      {showForm && (
        <div className="fd-form">
          <label className="auth-field">
            Your answer (the customer and HUB will read it)
            <textarea rows={3} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder="Say sorry if something went wrong and how you will fix it." />
          </label>
          {error && <p className="fd-message error" role="alert">{error}</p>}
          <div className="fd-actions">
            <button type="button" className="fd-primary" disabled={busy} onClick={() => void send()}>{busy ? 'Sending…' : 'Send answer'}</button>
            {editing && <button type="button" className="fd-secondary" onClick={() => { setEditing(false); setReply(complaint.restaurantReply ?? '') }}>Keep old answer</button>}
          </div>
        </div>
      )}
      {complaint.canReply && complaint.restaurantReply && !editing && (
        <button type="button" className="fd-link" onClick={() => setEditing(true)}>Change my answer</button>
      )}
    </article>
  )
}
