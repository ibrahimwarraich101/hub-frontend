// File purpose: Restaurant Center, the restaurant owner's workspace (same layout as Seller Center):
// - a side bar with the restaurant, its status and open/closed state, and the pages: Dashboard, Orders, Menu, Complaints,
//   Settings & photos (Orders and Complaints show how many are waiting);
// - Dashboard: today's numbers (refreshed every 20 seconds), the open/closed switch and quick actions;
// - before approval: the application form, or where the application stands.
// The page is kept in the address (#restaurant, #restaurant/orders, /menu, /complaints, /settings) so Refresh and Back work.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Field } from '../../../shared/auth/AuthScreens'
import { PhoneField } from '../../../shared/forms/PhoneField'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../../../shared/forms/validation'
import type { FieldErrors } from '../../../shared/forms/validation'
import '../../../shared/auth/auth.css'
import '../../../shared/layout/workspace.css'
import { foodPhone, dateTime, foodPaths, money } from '../foodApi'
import { enterSection, goTo, leaveSection, sectionPath, useSectionHistory } from '../foodRoute'
import type { RestaurantAccount, RestaurantSummaryStats } from '../foodApi'
import '../food.css'
import { MenuManager } from './MenuManager'
import { RestaurantComplaints } from './RestaurantComplaints'
import { RestaurantOrders } from './RestaurantOrders'
import { RestaurantSettings } from './RestaurantSettings'

type Page = 'dashboard' | 'orders' | 'menu' | 'complaints' | 'settings'

const SECTION = 'restaurant'

const PAGES: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Orders' },
  { id: 'menu', label: 'Menu' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'settings', label: 'Settings & photos' },
]

const TITLES: Record<Page, { title: string; text: string }> = {
  dashboard: { title: 'Dashboard', text: 'Today at your restaurant.' },
  orders: { title: 'Orders', text: 'Accept new orders and move them on until they are delivered.' },
  menu: { title: 'Menu', text: 'Sections, dishes, prices, photos and what is available right now.' },
  complaints: { title: 'Complaints', text: 'Read what customers reported and reply to them.' },
  settings: { title: 'Settings & photos', text: 'Delivery details, opening, logo and cover photo.' },
}

function readPage(path: string | null): Page {
  return PAGES.some((item) => item.id === path) && path !== 'dashboard' ? path as Page : 'dashboard'
}

const pathOf = (page: Page) => (page === 'dashboard' ? '' : page)

type Props = {
  onExit: () => void
  // Opens HUB Food (the address is already set to this restaurant's page).
  onViewRestaurant?: () => void
}

export function RestaurantCenter({ onExit: leave, onViewRestaurant }: Props) {
  const { authFetch, user } = useAuth()
  // undefined = loading, null = has not applied yet.
  const [account, setAccount] = useState<RestaurantAccount | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [page, setPage] = useState<Page>(() => readPage(sectionPath(SECTION)))
  const [stats, setStats] = useState<RestaurantSummaryStats | null>(null)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  // Put the first page in the address bar when Restaurant Center opens.
  const [startPath] = useState(() => pathOf(readPage(sectionPath(SECTION))))
  useEffect(() => { enterSection(SECTION, startPath) }, [startPath])
  useSectionHistory(SECTION, useCallback((path: string | null) => {
    if (path === null) leave()
    else { setPage(readPage(path)); window.scrollTo({ top: 0 }) }
  }, [leave]))
  const exit = () => { leaveSection(); leave() }
  const open = (next: Page) => {
    if (next !== page) goTo(SECTION, pathOf(next))
    setPage(next)
    window.scrollTo({ top: 0 })
  }

  const load = useCallback(() => {
    authFetch<RestaurantAccount>(foodPaths.account)
      .then((data) => { setAccount(data); setError(null) })
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 404) setAccount(null)
        else setError(reason instanceof ApiError ? reason.message : 'Could not load your restaurant.')
      })
  }, [authFetch])
  useEffect(() => { load() }, [load])

  const approved = account?.status === 'Approved' && !editing

  // Today's numbers for the dashboard and the counts beside Orders and Complaints; refreshed every 20 seconds.
  useEffect(() => {
    if (!approved) return
    const refresh = () => { authFetch<RestaurantSummaryStats>(foodPaths.summary).then(setStats).catch(() => undefined) }
    refresh()
    const timer = window.setInterval(refresh, 20000)
    return () => window.clearInterval(timer)
  }, [authFetch, approved])

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

  // The restaurant as customers see it: its page in HUB Food.
  const viewRestaurant = () => {
    if (!account || !onViewRestaurant) return
    history.pushState({ hubDepth: 1 }, '', `#food/restaurant/${encodeURIComponent(account.id)}`)
    onViewRestaurant()
    window.scrollTo({ top: 0 })
  }

  const badge = (id: Page) => id === 'orders' ? stats?.waitingOrders ?? 0 : id === 'complaints' ? stats?.openComplaints ?? 0 : 0
  const heading = approved ? TITLES[page]
    : { title: account ? 'Your application' : 'Open your restaurant on HUB Food', text: 'Take orders from HUB customers near you.' }

  return (
    <div className="sx">
      <aside className="sx-side" aria-label="Restaurant Center">
        <div className="sx-brand">
          <span className="sx-logo">HUB</span>
          <span className="sx-brand-name">Restaurant Center</span>
        </div>
        {account && (
          <div className="sx-store">
            {account.logoUrl ? <img className="sx-store-mark" src={mediaUrl(account.logoUrl) ?? ''} alt="" />
              : <span className="sx-store-mark" aria-hidden="true">{account.name.slice(0, 1).toUpperCase()}</span>}
            <span className="sx-store-text">
              <strong>{account.name}</strong>
              {account.status === 'Approved'
                ? <span className={account.open ? 'sx-open' : 'sx-open closed'}>{account.open ? 'Open' : 'Closed'}</span>
                : <span className={`fd-status fd-status-${account.status.toLowerCase()}`}>{account.status}</span>}
            </span>
          </div>
        )}
        <nav className="sx-nav" aria-label="Restaurant Center pages">
          {approved ? PAGES.map((item) => (
            <button key={item.id} type="button" aria-current={page === item.id ? 'page' : undefined} onClick={() => open(item.id)}>
              {item.label}
              {badge(item.id) > 0 && <span className="sx-badge" aria-label={`, ${badge(item.id)} waiting`}>{badge(item.id)}</span>}
            </button>
          )) : <button type="button" aria-current="page">{account ? 'Application' : 'Apply'}</button>}
        </nav>
        <div className="sx-side-foot">
          {approved && onViewRestaurant && <button type="button" onClick={viewRestaurant}>View my restaurant</button>}
          <button type="button" onClick={exit}>Back to HUB</button>
        </div>
      </aside>

      <main className="sx-main fd-app">
        <header className="sx-head">
          <div>
            <h1>{heading.title}</h1>
            <p>{heading.text}</p>
          </div>
          {approved && account && (
            <div className="sx-switch">
              <span className={account.open ? 'sx-open' : 'sx-open closed'}>{account.open ? 'Open, taking orders' : 'Closed'}</span>
              <button type="button" className={account.open ? 'sx-button' : 'sx-button primary'} disabled={switching} onClick={() => void toggleOpen()}>
                {switching ? 'Saving…' : account.open ? 'Close for now' : 'Open restaurant'}
              </button>
            </div>
          )}
        </header>

        {error && <div className="fd-message error" role="alert">{error}</div>}
        {switchError && <div className="fd-message error" role="alert">{switchError}</div>}
        {account === undefined && !error && <div className="fd-message">Loading…</div>}

        {(account === null || editing) && (
          <ApplyForm initial={account ?? undefined} defaultPhone={user?.phone ?? ''}
            onSaved={(saved) => { setAccount(saved); setEditing(false) }} />
        )}
        {account && !editing && !approved && <ApplicationPanel account={account} onRefresh={load} onEdit={() => setEditing(true)} />}

        {approved && account && page === 'dashboard' && (
          <Dashboard account={account} stats={stats} name={user?.fullName ?? ''} onOpen={open} />
        )}
        {approved && page === 'orders' && <RestaurantOrders />}
        {approved && page === 'menu' && <MenuManager />}
        {approved && page === 'complaints' && <RestaurantComplaints />}
        {approved && account && page === 'settings' && <RestaurantSettings account={account} onSaved={setAccount} />}
      </main>
    </div>
  )
}

// Where the application stands (before approval, or when suspended).
function ApplicationPanel({ account, onRefresh, onEdit }: { account: RestaurantAccount; onRefresh: () => void; onEdit: () => void }) {
  return (
    <section className="sx-card">
      <div className="sx-card-head">
        <h2>{account.name}</h2>
        <span className={`fd-status fd-status-${account.status.toLowerCase()}`}>{account.status}</span>
      </div>
      {account.status === 'Pending' && (
        <p className="sx-note">Your application was sent on {dateTime(account.submittedAt)}. An administrator will review it soon; this page shows the decision.</p>
      )}
      {account.status === 'Rejected' && (
        <>
          <p className="sx-note">Your application was not approved.</p>
          <p className="fd-reason"><strong>Reason:</strong> {account.reviewReason}</p>
        </>
      )}
      {account.status === 'Suspended' && (
        <>
          <p className="sx-note">Your restaurant is suspended and hidden from customers.</p>
          <p className="fd-reason"><strong>Reason:</strong> {account.reviewReason}</p>
        </>
      )}
      <dl className="sx-facts">
        <div><dt>Restaurant</dt><dd>{account.name}</dd></div>
        <div><dt>Cuisine</dt><dd>{account.cuisine}</dd></div>
        <div><dt>Phone</dt><dd>{account.phone}</dd></div>
        <div><dt>City</dt><dd>{account.city}</dd></div>
        <div className="wide"><dt>Address</dt><dd>{account.addressLine}</dd></div>
      </dl>
      <div className="sx-actions">
        {account.status === 'Rejected' && <button type="button" className="sx-button primary" onClick={onEdit}>Fix details and apply again</button>}
        <button type="button" className="sx-button" onClick={onRefresh}>Refresh status</button>
      </div>
    </section>
  )
}

// Dashboard: the restaurant's cover and details, today's numbers and quick actions. Every number comes from the server.
function Dashboard({ account, stats, name, onOpen }: {
  account: RestaurantAccount; stats: RestaurantSummaryStats | null; name: string; onOpen: (page: Page) => void
}) {
  const firstName = name.split(' ')[0]
  const value = (number: number | undefined) => (number === undefined ? undefined : number.toLocaleString('en-PK'))
  return (
    <>
      {firstName && <p className="sx-welcome">Welcome back, {firstName}.</p>}
      <section className="sx-hero">
        <div className="sx-hero-cover">
          {account.coverUrl ? <img src={mediaUrl(account.coverUrl) ?? ''} alt="" />
            : <button type="button" className="sx-hero-hint" onClick={() => onOpen('settings')}>Add a cover photo in Settings &amp; photos</button>}
        </div>
        <div className="sx-hero-body">
          {account.logoUrl ? <img className="sx-hero-logo" src={mediaUrl(account.logoUrl) ?? ''} alt="" />
            : <span className="sx-hero-logo" aria-hidden="true">{account.name.slice(0, 1).toUpperCase()}</span>}
          <div>
            <h2>{account.name}</h2>
            <p>{account.cuisine} · {account.addressLine}, {account.city}</p>
            <p>{account.deliveryMinutes} min delivery · {account.deliveryFee > 0 ? `${money(account.deliveryFee)} delivery fee` : 'Free delivery'} · minimum order {money(account.minimumOrder)}</p>
          </div>
        </div>
      </section>

      <ul className="sx-stats six">
        <Stat label="New orders" hint="Waiting for you to accept" value={value(stats?.waitingOrders)} urgent={(stats?.waitingOrders ?? 0) > 0} onClick={() => onOpen('orders')} />
        <Stat label="Active orders" hint="Being prepared or on the way" value={value(stats?.activeOrders)} onClick={() => onOpen('orders')} />
        <Stat label="Orders today" hint="All orders placed today" value={value(stats?.todayOrders)} onClick={() => onOpen('orders')} />
        <Stat label="Sales today" hint="From today's orders" value={stats ? money(stats.todaySales) : undefined} onClick={() => onOpen('orders')} />
        <Stat label="Open complaints" hint="Waiting for your reply" value={value(stats?.openComplaints)} urgent={(stats?.openComplaints ?? 0) > 0} onClick={() => onOpen('complaints')} />
        <Stat label="Rating" hint={stats?.ratingCount ? `From ${stats.ratingCount} review${stats.ratingCount === 1 ? '' : 's'}` : 'No reviews yet'}
          value={stats ? (stats.rating === null ? 'New' : `★ ${stats.rating}`) : undefined} onClick={() => onOpen('complaints')} />
      </ul>

      <section className="sx-card">
        <div className="sx-card-head"><h2>Quick actions</h2></div>
        <ul className="sx-quick row">
          <QuickAction title="Orders" text="Accept and move on today's orders." onClick={() => onOpen('orders')} />
          <QuickAction title="Edit the menu" text="Dishes, prices, photos and availability." onClick={() => onOpen('menu')} />
          <QuickAction title="Settings & photos" text="Delivery fee, minimum order, logo and cover." onClick={() => onOpen('settings')} />
        </ul>
      </section>
    </>
  )
}

function Stat({ label, hint, value, urgent, onClick }: { label: string; hint: string; value: string | undefined; urgent?: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" className={urgent ? 'sx-stat urgent' : 'sx-stat'} onClick={onClick}>
        <span className="sx-stat-label">{label}</span>
        <strong className="sx-stat-value">{value ?? '–'}</strong>
        <span className="sx-stat-hint">{hint}</span>
      </button>
    </li>
  )
}

function QuickAction({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick}>
        <strong>{title}</strong>
        <span>{text}</span>
      </button>
    </li>
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
    <form ref={formRef} className="sx-card fd-form sx-apply" onSubmit={submit} noValidate>
      <h2>{initial ? 'Apply again' : 'Tell us about your restaurant'}</h2>
      <p className="sx-note">An administrator checks every application before customers can order.</p>
      <Field label="Restaurant name" name="name" value={values.name} onChange={set('name')} error={errors.name} />
      <Field label="Cuisine" name="cuisine" value={values.cuisine} onChange={set('cuisine')} error={errors.cuisine} placeholder="For example: Burgers, Desi, Pizza" />
      <label className={errors.description ? 'auth-field invalid' : 'auth-field'}>
        About your restaurant (optional)
        <textarea name="description" rows={3} value={values.description} onChange={(e) => set('description')(e.target.value)}
          aria-invalid={errors.description ? true : undefined} />
        {errors.description && <span className="auth-field-error">{errors.description}</span>}
      </label>
      <PhoneField label="Restaurant phone" name="phone" value={values.phone} onChange={set('phone')} error={errors.phone} />
      <Field label="Address" name="addressLine" value={values.addressLine} onChange={set('addressLine')} error={errors.addressLine} />
      <Field label="City" name="city" value={values.city} onChange={set('city')} error={errors.city} />
      {error && <p className="fd-message error" role="alert">{error}</p>}
      <button type="submit" className="sx-button primary" disabled={busy}>{busy ? 'Sending…' : 'Send application'}</button>
    </form>
  )
}
