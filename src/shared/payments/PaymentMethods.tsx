// File purpose: "My payment methods" (shared by every module): the customer's saved JazzCash wallets, choosing the
// default, removing, and adding a wallet. Cards are shown as coming later: they will be saved only by JazzCash, and
// HUB never sees card numbers. All mistakes are shown under the field, never as browser popups.
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ModuleBar } from '../layout/AppShell'
import { enterSection, useSectionHistory } from '../layout/sectionRoute'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PhoneField } from '../forms/PhoneField'
import { phoneDigits } from '../forms/phone'
import { rules } from '../forms/validation'
import { MAX_PAYMENT_METHODS, paymentMethodPaths } from './paymentMethodsApi'
import type { SavedPaymentMethod } from './paymentMethodsApi'
import { usePaymentProvider } from './paymentProvider'
import './payments.css'

// The list and the add form. Used inside a module (e.g. Bills) or as its own page (PaymentMethodsPage below).
export function PaymentMethods() {
  const { authFetch } = useAuth()
  const payments = usePaymentProvider()
  const [methods, setMethods] = useState<SavedPaymentMethod[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // The method waiting for "Yes, remove" (removing needs a second tap).
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Bumped by "Try again" to load the list again.
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let current = true
    authFetch<SavedPaymentMethod[]>(paymentMethodPaths.mine).then((list) => { if (current) { setMethods(list); setError(null) } })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your payment methods.') })
    return () => { current = false }
  }, [authFetch, reload])
  const load = () => setReload((count) => count + 1)

  async function change(id: string, action: 'default' | 'remove') {
    setBusyId(id)
    setError(null)
    try {
      setMethods(await authFetch<SavedPaymentMethod[]>(action === 'default' ? paymentMethodPaths.makeDefault(id) : paymentMethodPaths.remove(id),
        action === 'default' ? 'POST' : 'DELETE'))
      setConfirmId(null)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Something went wrong. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="pm">
      <section className="pm-card">
        <h2>Saved methods</h2>
        <p className="pm-muted">Choose one when you pay. You still approve every payment with JazzCash.</p>
        {/* Saved wallets are JazzCash wallets: say so while payments go through another company (e.g. Safepay, cards only). */}
        {payments.loaded && payments.provider !== 'JazzCash' && (
          <p className="pm-muted" role="status">Payments are made by card on {payments.name} right now, so saved JazzCash wallets cannot be used to pay for the moment. They stay saved for later.</p>
        )}
        {error && <p className="pm-message error" role="alert">{error} <button type="button" className="hub-button secondary small" onClick={load}>Try again</button></p>}
        {!methods && !error && <p className="pm-muted">Loading…</p>}
        {methods && methods.length === 0 && <p className="pm-empty">You have not saved a payment method yet. Add your JazzCash wallet below.</p>}
        {methods && methods.length > 0 && (
          <ul className="pm-list">
            {methods.map((method) => (
              <li key={method.id} className={method.isDefault ? 'pm-item default' : 'pm-item'}>
                <div className="pm-item-main">
                  <strong>{method.label}</strong>
                  <span className="pm-muted">{method.methodType === 'Wallet' ? 'JazzCash wallet' : `${method.cardBrand} card`}</span>
                </div>
                {method.isDefault && <span className="hub-pill success">Default</span>}
                <div className="pm-item-actions">
                  {!method.isDefault && (
                    <button type="button" className="hub-button secondary small" disabled={busyId !== null} onClick={() => void change(method.id, 'default')}>
                      Make default
                    </button>
                  )}
                  {confirmId === method.id ? (
                    <>
                      <button type="button" className="hub-button danger small" disabled={busyId !== null} onClick={() => void change(method.id, 'remove')}>
                        {busyId === method.id ? 'Removing…' : 'Yes, remove'}
                      </button>
                      <button type="button" className="hub-button secondary small" onClick={() => setConfirmId(null)}>Keep</button>
                    </>
                  ) : (
                    <button type="button" className="hub-button secondary small" disabled={busyId !== null} onClick={() => setConfirmId(method.id)}>Remove</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {methods && methods.length < MAX_PAYMENT_METHODS && (
        <AddWallet first={methods.length === 0} onAdded={(added) => setMethods((current) => sortMethods([
          ...(current ?? []).map((item) => (added.isDefault ? { ...item, isDefault: false } : item)), added]))} />
      )}
      {methods && methods.length >= MAX_PAYMENT_METHODS && (
        <p className="pm-muted">You have saved {MAX_PAYMENT_METHODS} methods, the most allowed. Remove one to add another.</p>
      )}

      <section className="pm-card">
        <h2>Bank cards</h2>
        <p className="pm-muted">Saving cards is coming soon. Cards will be saved securely by JazzCash; HUB never sees or keeps your card number.
          Until then you can still pay with a card on JazzCash's page each time.</p>
      </section>
    </div>
  )
}

function AddWallet({ first, onAdded }: { first: boolean; onAdded: (method: SavedPaymentMethod) => void }) {
  const { authFetch, user } = useAuth()
  const [phone, setPhone] = useState(user?.phone ?? '+92')
  const [makeDefault, setMakeDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(null)
    const problem = rules.phone(phone)
    setFieldError(problem)
    if (problem) return
    setBusy(true)
    try {
      const added = await authFetch<SavedPaymentMethod>(paymentMethodPaths.addWallet, 'POST', { mobileNumber: phone, makeDefault: first || makeDefault })
      onAdded(added)
      setSaved(`${added.label} is saved.`)
      setPhone('+92')
      setMakeDefault(false)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not save the wallet. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="pm-card" onSubmit={(event) => void submit(event)} noValidate>
      <h2>Add a JazzCash wallet</h2>
      <p className="pm-muted">Enter the mobile number of your JazzCash account.</p>
      <PhoneField label="JazzCash mobile number" name="walletNumber" value={phone}
        onChange={(value) => { setPhone(value); if (fieldError) setFieldError(null) }} error={fieldError ?? undefined} />
      {!first && (
        <label className="pm-check">
          <input type="checkbox" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} />
          Make this my default
        </label>
      )}
      {error && <p className="pm-message error" role="alert">{error}</p>}
      {saved && <p className="pm-message success" role="status">{saved}</p>}
      <button type="submit" className="hub-button" disabled={busy || phoneDigits(phone).length === 0}>{busy ? 'Saving…' : 'Save wallet'}</button>
    </form>
  )
}

function sortMethods(methods: SavedPaymentMethod[]): SavedPaymentMethod[] {
  return [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt))
}

// "My payment methods" as its own page (opened from the menu under the person's name on the HUB home page).
export function PaymentMethodsPage({ onExit }: { onExit: () => void }) {
  // The page has its own address (#payment-methods), so Refresh keeps it open and the browser's Back button returns home.
  useEffect(() => { enterSection('payment-methods', '') }, [])
  useSectionHistory('payment-methods', useCallback((path: string | null) => { if (path === null) onExit() }, [onExit]))
  return (
    <>
      <ModuleBar title="My account" />
      <main className="pm-page">
        <h2 className="pm-title">My payment methods</h2>
        <PaymentMethods />
      </main>
    </>
  )
}
