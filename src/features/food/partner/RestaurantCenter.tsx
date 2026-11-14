// File purpose: Restaurant Center: apply to open a restaurant on HUB Food, see the application status, re-apply after
// a rejection, and (once approved) manage incoming orders, the menu and restaurant settings.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Field } from '../../../shared/auth/AuthScreens'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../../../shared/forms/validation'
import type { FieldErrors } from '../../../shared/forms/validation'
import '../../../shared/auth/auth.css'
import { foodPhone, dateTime, foodPaths } from '../foodApi'
import type { RestaurantAccount, RestaurantSummaryStats } from '../foodApi'
import '../food.css'
import { MenuManager } from './MenuManager'
import { RestaurantOrders } from './RestaurantOrders'
import { RestaurantSettings } from './RestaurantSettings'
import { SummaryBar } from './SummaryBar'

export type CenterTab = 'orders' | 'menu' | 'settings'
type Tab = CenterTab
// initialTab: which tool opens first (orders by default).
type Props = { onExit: () => void; initialTab?: CenterTab }

export function RestaurantCenter({ onExit, initialTab = 'orders' }: Props) {
  const { authFetch, user } = useAuth()
  // undefined = loading, null = has not applied yet.
  const [account, setAccount] = useState<RestaurantAccount | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [waiting, setWaiting] = useState(0)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const onStats = useCallback((stats: RestaurantSummaryStats) => setWaiting(stats.waitingOrders), [])

  const load = useCallback(() => {
    authFetch<RestaurantAccount>(foodPaths.account)
      .then((data) => { setAccount(data); setError(null) })
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 404) setAccount(null)
        else setError(reason instanceof ApiError ? reason.message : 'Could not load your restaurant.')
      })
  }, [authFetch])

  useEffect(() => { load() }, [load])

  // One click to open or close: saves the current settings with "open" switched.
  async function toggleOpen() {
    if (!account) return
    setSwitching(true)
    setSwitchError(null)
    try {
      setAccount(await authFetch<RestaurantAccount>(foodPaths.settings, 'PUT', {
        description: account.description, phone: account.phone, cuisine: account.cuisine, addressLine: account.addressLine, city: account.city,
        deliveryFee: account.deliveryFee, minimumOrder: account.minimumOrder, deliveryMinutes: account.deliveryMinutes,
        open: !account.open, expectedVersion: account.version,
      }))
    } catch (reason) {
      setSwitchError(reason instanceof ApiError ? reason.message : 'Could not change open/closed. Please try again.')
      load()
    } finally {
      setSwitching(false)
    }
  }

  return (
    <section className="fd-app" aria-label="Restaurant Center">
      <header className="fd-header">
        <button type="button" className="fd-back" onClick={onExit}>← HUB</button>
        <h1>Restaurant Center</h1>
      </header>
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {account === undefined && !error && <div className="fd-message">Loading…</div>}

      {(account === null || editing) && (
        <ApplyForm initial={account ?? undefined} defaultPhone={user?.phone ?? ''}
          onSaved={(saved) => { setAccount(saved); setEditing(false) }} />
      )}

      {account && !editing && account.status !== 'Approved' && (
        <div className="fd-panel">
          <h2>{account.name}</h2>
          <span className={`fd-status fd-status-${account.status.toLowerCase()}`}>{account.status}</span>
          {account.status === 'Pending' && <p>Your application was sent on {dateTime(account.submittedAt)}. An administrator will review it soon.</p>}
          {account.status === 'Rejected' && (
            <>
              <p>Your application was not approved.</p>
              <p className="fd-reason"><strong>Reason:</strong> {account.reviewReason}</p>
              <button type="button" className="fd-primary" onClick={() => setEditing(true)}>Fix details and apply again</button>
            </>
          )}
          {account.status === 'Suspended' && (
            <>
              <p>Your restaurant is suspended and hidden from customers.</p>
              <p className="fd-reason"><strong>Reason:</strong> {account.reviewReason}</p>
            </>
          )}
          <button type="button" className="fd-link" onClick={load}>Refresh status</button>
        </div>
      )}

      {account?.status === 'Approved' && !editing && (
        <>
          <div className="fd-owner-head">
            <div className="fd-owner-cover">
              {account.coverUrl ? <img src={mediaUrl(account.coverUrl) ?? ''} alt="" /> : <span className="fd-cover-empty" />}
              {account.logoUrl ? <img className="fd-logo" src={mediaUrl(account.logoUrl) ?? ''} alt="" />
                : <span className="fd-logo fd-logo-empty" aria-hidden="true">{account.name.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="fd-owner-info">
              <div>
                <h2>{account.name}</h2>
                <p className="fd-meta">{account.cuisine} · {account.addressLine}, {account.city}</p>
              </div>
              <div className="fd-open-switch">
                <span className={account.open ? 'fd-tag' : 'fd-tag closed'}>{account.open ? '● Open - taking orders' : '● Closed'}</span>
                <button type="button" className={account.open ? 'fd-secondary' : 'fd-primary'} disabled={switching}
                  onClick={() => void toggleOpen()}>
                  {switching ? 'Saving…' : account.open ? 'Close for now' : 'Open restaurant'}
                </button>
              </div>
            </div>
          </div>
          {switchError && <div className="fd-message error" role="alert">{switchError}</div>}
          <SummaryBar onStats={onStats} />
          <div className="fd-tabs" role="tablist" aria-label="Restaurant tools">
            {(['orders', 'menu', 'settings'] as Tab[]).map((value) => (
              <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'fd-tab active' : 'fd-tab'}
                onClick={() => setTab(value)}>
                {value === 'orders' ? 'Orders' : value === 'menu' ? 'Menu' : 'Settings & photos'}
                {value === 'orders' && waiting > 0 && <span className="fd-tab-badge">{waiting}</span>}
              </button>
            ))}
          </div>
          {tab === 'orders' && <RestaurantOrders />}
          {tab === 'menu' && <MenuManager />}
          {tab === 'settings' && <RestaurantSettings account={account} onSaved={setAccount} />}
        </>
      )}
    </section>
  )
}

type ApplyFields = 'name' | 'description' | 'phone' | 'cuisine' | 'addressLine' | 'city'

// Same rules as the backend's ApplyRestaurantRequest.
function validateApply(values: Record<ApplyFields, string>): FieldErrors<ApplyFields> {
  return collect({
    name: firstError(rules.required(values.name, 'restaurant name'), rules.minLength(values.name.trim(), 2, 'Restaurant name'),
      rules.maxLength(values.name.trim(), 150, 'Restaurant name')),
    description: rules.maxLength(values.description.trim(), 2000, 'About your restaurant'),
    phone: firstError(rules.required(values.phone, 'restaurant phone'), rules.phone(foodPhone(values.phone))),
    cuisine: firstError(rules.required(values.cuisine, 'cuisine'), rules.minLength(values.cuisine.trim(), 2, 'Cuisine'),
      rules.maxLength(values.cuisine.trim(), 50, 'Cuisine')),
    addressLine: firstError(rules.required(values.addressLine, 'restaurant address'), rules.minLength(values.addressLine.trim(), 5, 'Address'),
      rules.maxLength(values.addressLine.trim(), 300, 'Address')),
    city: firstError(rules.required(values.city, 'city'), rules.minLength(values.city.trim(), 2, 'City'), rules.maxLength(values.city.trim(), 60, 'City')),
  })
}

function ApplyForm({ initial, defaultPhone, onSaved }: { initial?: RestaurantAccount; defaultPhone: string; onSaved: (account: RestaurantAccount) => void }) {
  const { authFetch } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({
    name: initial?.name ?? '', description: initial?.description ?? '', phone: initial?.phone ?? defaultPhone,
    cuisine: initial?.cuisine ?? '', addressLine: initial?.addressLine ?? '', city: initial?.city ?? '',
  })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      onSaved(await authFetch<RestaurantAccount>(foodPaths.account, 'POST', {
        name: values.name.trim(), description: values.description.trim() || null, phone: foodPhone(values.phone),
        cuisine: values.cuisine.trim(), addressLine: values.addressLine.trim(), city: values.city.trim(),
      }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not send your application. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} className="fd-panel fd-form" onSubmit={submit} noValidate>
      <h2>{initial ? 'Apply again' : 'Open your restaurant on HUB Food'}</h2>
      <p>Tell us about your restaurant. An administrator checks every application before customers can order.</p>
      <Field label="Restaurant name" name="name" value={values.name} onChange={set('name')} error={errors.name} />
      <Field label="Cuisine" name="cuisine" value={values.cuisine} onChange={set('cuisine')} error={errors.cuisine} placeholder="For example: Burgers, Desi, Pizza" />
      <label className={errors.description ? 'auth-field invalid' : 'auth-field'}>
        About your restaurant (optional)
        <textarea name="description" rows={3} value={values.description} onChange={(e) => set('description')(e.target.value)}
          aria-invalid={errors.description ? true : undefined} />
        {errors.description && <span className="auth-field-error">{errors.description}</span>}
      </label>
      <Field label="Restaurant phone" name="phone" type="tel" placeholder="+923001234567" value={values.phone} onChange={set('phone')}
        error={errors.phone} hint="For example 03001234567 or +923001234567" />
      <Field label="Address" name="addressLine" value={values.addressLine} onChange={set('addressLine')} error={errors.addressLine} />
      <Field label="City" name="city" value={values.city} onChange={set('city')} error={errors.city} />
      {error && <p className="fd-message error" role="alert">{error}</p>}
      <button type="submit" className="fd-primary" disabled={busy}>{busy ? 'Sending…' : 'Send application'}</button>
    </form>
  )
}
