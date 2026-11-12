// File purpose: Admin "Sellers": review seller accounts by status and approve, reject, suspend or reinstate with a reason.
import { useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Pager } from '../../admin/Pager'
import type { AdminRoute } from '../../admin/sections'
import { useAdminData } from '../../admin/useAdminData'
import { decisionsFor, sellerPaths, shortDate } from '../sellerApi'
import type { AdminSeller, AdminSellerPage, SellerDecision, SellerStatus } from '../sellerApi'

const STATUSES: SellerStatus[] = ['Pending', 'Approved', 'Suspended', 'Rejected']
const tones: Record<SellerStatus, string> = { Pending: 'warning', Approved: 'success', Suspended: 'error', Rejected: 'muted' }

// `tab` comes from the address (#admin/sellers/Approved) so dashboard numbers can open the right list.
export function SellersPage({ tab, go }: { tab: string | null; go: (route: AdminRoute) => void }) {
  const status: SellerStatus = STATUSES.find((value) => value === tab) ?? 'Pending'
  const [page, setPage] = useState({ status, number: 1 })
  const pageNumber = page.status === status ? page.number : 1
  const { data, error, loading, reload, replace } = useAdminData<AdminSellerPage>(sellerPaths.queue(status, pageNumber))
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="adm-stack">
      <div className="adm-tabs" role="tablist" aria-label="Seller status">
        {STATUSES.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={status === value} className={status === value ? 'adm-tab active' : 'adm-tab'}
            onClick={() => { setNotice(null); go({ section: 'sellers', id: value }) }}>
            {value}
          </button>
        ))}
      </div>
      {notice && <p className="adm-alert success" role="status">{notice}</p>}
      {error && <p className="adm-alert error" role="alert">{error}</p>}
      {!data && !error && <p className="adm-muted">Loading…</p>}
      {data && !loading && data.items.length === 0 && <p className="adm-empty">No {status.toLowerCase()} sellers.</p>}
      {data && data.items.map((seller) => (
        <SellerCard key={seller.account.id} seller={seller} go={go}
          onDone={(message, decided) => {
            setNotice(message)
            // A decided seller leaves this list at once (its status changed), then the latest list is loaded.
            if (decided) replace({ ...data, total: data.total - 1, items: data.items.filter((item) => item.account.id !== decided) })
            reload()
          }} />
      ))}
      {data && <Pager page={pageNumber} total={data.total} pageSize={data.pageSize} onPage={(number) => setPage({ status, number })} />}
    </div>
  )
}

function SellerCard({ seller, go, onDone }: { seller: AdminSeller; go: (route: AdminRoute) => void; onDone: (message: string, decidedId?: string) => void }) {
  const { authFetch } = useAuth()
  const [decision, setDecision] = useState<SellerDecision | null>(null)
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { account, owner } = seller
  const length = reason.trim().length
  const problem = !tried ? null : length === 0 ? 'Please write a reason. The seller will see it.'
    : length > 1000 ? `The reason can be at most 1000 characters (you typed ${length}).` : null
  const positive = decision === 'Approve' || decision === 'Reinstate'

  async function confirm() {
    if (!decision) return
    setTried(true)
    if (length === 0 || length > 1000) return
    setBusy(true)
    setError(null)
    try {
      await authFetch(sellerPaths.review(account.id), 'POST', { decision, reason: reason.trim(), expectedVersion: account.version })
      onDone(`${account.name}: ${decision.toLowerCase()} done.`, account.id)
    } catch (failure) {
      // 409 usually means another administrator decided first; the list reloads to show the latest state.
      if (failure instanceof ApiError && failure.status === 409) onDone(`${account.name}: ${failure.message}`)
      else setError(failure instanceof ApiError && failure.status === 0 ? failure.message : 'The decision could not be saved. Please try again.')
      setBusy(false)
    }
  }

  return (
    <section className="hub-card adm-panel" aria-label={account.name}>
      <div className="adm-panel-head">
        <div>
          <h2>{account.name}</h2>
          <span className={`hub-pill ${tones[account.status]}`}>{account.status}</span>
        </div>
      </div>
      <dl className="adm-facts">
        <dt>Owner</dt>
        <dd><button type="button" className="adm-link" onClick={() => go({ section: 'users', id: owner.id })}>{owner.fullName}</button> · {owner.email} · {owner.phone}</dd>
        <dt>Store phone</dt><dd>{account.phone}</dd>
        {account.description && <><dt>About</dt><dd>{account.description}</dd></>}
        <dt>Submitted</dt><dd>{shortDate(account.submittedAt)}</dd>
        {account.reviewReason && <><dt>Last reason</dt><dd>{account.reviewReason}</dd></>}
      </dl>

      {decision === null ? (
        decisionsFor[account.status].length > 0 && (
          <div className="adm-actions">
            {decisionsFor[account.status].map((option) => (
              <button key={option} type="button" className={option === 'Approve' || option === 'Reinstate' ? 'hub-button small' : 'hub-button danger small'}
                onClick={() => { setDecision(option); setReason(''); setTried(false); setError(null) }}>
                {option}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="adm-reason">
          <label className={problem ? 'adm-field invalid' : 'adm-field'}>
            Reason for "{decision}" (the seller will see it)
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={problem ? true : undefined} />
            {problem ? <span className="adm-field-error">{problem}</span> : <span className="adm-hint">{length} / 1000</span>}
          </label>
          {error && <p className="adm-alert error" role="alert">{error}</p>}
          <div className="adm-actions">
            <button type="button" className={positive ? 'hub-button small' : 'hub-button danger small'} disabled={busy} onClick={() => void confirm()}>
              {busy ? 'Saving…' : `Confirm ${decision.toLowerCase()}`}
            </button>
            <button type="button" className="hub-button secondary small" disabled={busy} onClick={() => setDecision(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  )
}
