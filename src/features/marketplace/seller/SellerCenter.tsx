// File purpose: Seller Center: apply to open a HUB Store, see the application status, and re-apply after a rejection.
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { sellerPaths, shortDate } from '../sellerApi'
import type { SellerAccount } from '../sellerApi'
import '../marketplace.css'

type Props = { onExit: () => void }

export function SellerCenter({ onExit }: Props) {
  const { authFetch, user } = useAuth()
  // undefined = loading, null = has not applied yet.
  const [account, setAccount] = useState<SellerAccount | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    authFetch<SellerAccount>(sellerPaths.mine)
      .then((data) => { setAccount(data); setError(null) })
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 404) setAccount(null)
        else setError(reason instanceof ApiError ? reason.message : 'Could not load your seller account.')
      })
  }, [authFetch])

  useEffect(() => { load() }, [load])

  return (
    <section className="mp-app" aria-label="Seller Center">
      <header className="mp-header">
        <button type="button" className="mp-back" onClick={onExit}>← HUB</button>
        <h1>Seller Center</h1>
      </header>
      {error && <div className="mp-message error" role="alert">{error}</div>}
      {account === undefined && !error && <div className="mp-message">Loading…</div>}

      {(account === null || editing) && (
        <ApplyForm
          initial={account ?? undefined}
          defaultPhone={user?.phone ?? ''}
          onSaved={(saved) => { setAccount(saved); setEditing(false) }}
        />
      )}

      {account && !editing && (
        <div className="mp-panel">
          <h2>{account.name}</h2>
          <StatusBadge status={account.status} />
          {account.status === 'Pending' && (
            <p>Your application was sent on {shortDate(account.submittedAt)}. An administrator will review it soon.</p>
          )}
          {account.status === 'Approved' && (
            <p>Your store is approved. Adding and managing products is the next E-Commerce feature.</p>
          )}
          {account.status === 'Rejected' && (
            <>
              <p>Your application was not approved.</p>
              <p className="mp-reason"><strong>Reason:</strong> {account.reviewReason}</p>
              <button type="button" className="mp-primary" onClick={() => setEditing(true)}>Fix details and apply again</button>
            </>
          )}
          {account.status === 'Suspended' && (
            <>
              <p>Your store is suspended and hidden from customers.</p>
              <p className="mp-reason"><strong>Reason:</strong> {account.reviewReason}</p>
            </>
          )}
          <dl className="mp-facts">
            <dt>Phone</dt><dd>{account.phone}</dd>
            {account.description && (<><dt>About</dt><dd>{account.description}</dd></>)}
            {account.reviewedAt && (<><dt>Last decision</dt><dd>{shortDate(account.reviewedAt)}</dd></>)}
          </dl>
          <button type="button" className="mp-link" onClick={load}>Refresh status</button>
        </div>
      )}
    </section>
  )
}

function ApplyForm({ initial, defaultPhone, onSaved }: { initial?: SellerAccount; defaultPhone: string; onSaved: (account: SellerAccount) => void }) {
  const { authFetch } = useAuth()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? defaultPhone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (name.trim().length < 2) return setError('The store name must have at least 2 characters.')
    if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) return setError('Phone must look like +923001234567.')
    setBusy(true)
    try {
      onSaved(await authFetch<SellerAccount>(sellerPaths.mine, 'POST', {
        name: name.trim(), description: description.trim() || null, phone,
      }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not send your application.')
      setBusy(false)
    }
  }

  return (
    <form className="mp-panel mp-form" onSubmit={submit}>
      <h2>{initial ? 'Apply again' : 'Open your HUB Store'}</h2>
      <p>Tell us about your store. An administrator checks every application before the store goes live.</p>
      <label>Store name<input required minLength={2} maxLength={150} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>About your store (optional)<textarea maxLength={2000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label>Store phone<input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+923001234567" /></label>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      <button type="submit" className="mp-primary" disabled={busy}>{busy ? 'Sending…' : 'Send application'}</button>
    </form>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`mp-status mp-status-${status.toLowerCase()}`}>{status}</span>
}
