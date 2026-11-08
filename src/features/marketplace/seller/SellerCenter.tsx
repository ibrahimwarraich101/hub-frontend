// File purpose: Seller Center: apply to open a HUB Store, see the application status, and re-apply after a rejection.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Field } from '../../../shared/auth/AuthScreens'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../../../shared/forms/validation'
import type { FieldErrors } from '../../../shared/forms/validation'
import '../../../shared/auth/auth.css'
import { sellerPaths, shortDate } from '../sellerApi'
import type { SellerAccount } from '../sellerApi'
import '../marketplace.css'
import { SellerProducts } from './SellerProducts'

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
        <button type="button" className="mp-back" onClick={onExit}>Back to HUB</button>
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
            <p>Your store is approved and open. Add and manage your products below.</p>
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

      {account?.status === 'Approved' && !editing && <SellerProducts />}
    </section>
  )
}

type ApplyFields = 'name' | 'description' | 'phone'

// Same rules as the backend's seller application.
function validateApply(values: Record<ApplyFields, string>): FieldErrors<ApplyFields> {
  return collect({
    name: firstError(rules.required(values.name, 'store name'), rules.minLength(values.name.trim(), 2, 'Store name'),
      rules.maxLength(values.name.trim(), 150, 'Store name')),
    description: rules.maxLength(values.description.trim(), 2000, 'About your store'),
    phone: firstError(rules.required(values.phone, 'store phone'), rules.phone(values.phone)),
  })
}

function ApplyForm({ initial, defaultPhone, onSaved }: { initial?: SellerAccount; defaultPhone: string; onSaved: (account: SellerAccount) => void }) {
  const { authFetch } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ name: initial?.name ?? '', description: initial?.description ?? '', phone: initial?.phone ?? defaultPhone })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // After the first attempt, messages update live while the seller types.
  const errors = tried ? validateApply(values) : {}
  const set = (field: ApplyFields) => (value: string) => setValues({ ...values, [field]: value })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = validateApply(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    setBusy(true)
    try {
      onSaved(await authFetch<SellerAccount>(sellerPaths.mine, 'POST', {
        name: values.name.trim(), description: values.description.trim() || null, phone: values.phone.trim(),
      }))
    } catch (reason) {
      // Only things the frontend cannot know (already applied, server down) come from the backend.
      setError(reason instanceof ApiError && reason.status === 409 ? 'You already have a seller application. Refresh to see its status.'
        : reason instanceof ApiError && reason.status === 0 ? reason.message : 'Could not send your application. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} className="mp-panel mp-form" onSubmit={submit} noValidate>
      <h2>{initial ? 'Apply again' : 'Open your HUB Store'}</h2>
      <p>Tell us about your store. An administrator checks every application before the store goes live.</p>
      <Field label="Store name" name="name" value={values.name} onChange={set('name')} error={errors.name} />
      <label className={errors.description ? 'auth-field invalid' : 'auth-field'}>
        About your store (optional)
        <textarea name="description" rows={4} value={values.description} onChange={(e) => set('description')(e.target.value)}
          aria-invalid={errors.description ? true : undefined} />
        {errors.description
          ? <span className="auth-field-error">{errors.description}</span>
          : <span className="auth-hint">{values.description.length} / 2000 characters</span>}
      </label>
      <Field label="Store phone" name="phone" type="tel" placeholder="+923001234567" value={values.phone} onChange={set('phone')}
        error={errors.phone} hint="With country code, for example +923001234567" />
      {error && <p className="mp-message error" role="alert">{error}</p>}
      <button type="submit" className="mp-primary" disabled={busy}>{busy ? 'Sending…' : 'Send application'}</button>
    </form>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`mp-status mp-status-${status.toLowerCase()}`}>{status}</span>
}
