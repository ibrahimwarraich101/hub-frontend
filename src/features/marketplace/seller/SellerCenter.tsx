// File purpose: Seller Center, the seller's own workspace (laid out like the seller portals of large online stores):
// - a side bar with the store, its status and the pages: Dashboard, Products, Orders, Store profile;
// - Dashboard: real counts (new orders, to ship, on the way, products) and the newest orders waiting for the seller;
// - before approval: the application form, or where the application stands.
// The page is kept in the address (#seller, #seller/products, #seller/orders, #seller/profile) so Refresh and Back work.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Field } from '../../../shared/auth/AuthScreens'
import { PhoneField } from '../../../shared/forms/PhoneField'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../../../shared/forms/validation'
import type { FieldErrors } from '../../../shared/forms/validation'
import { enterSection, goTo, leaveSection, sectionPath, useSectionHistory } from '../../../shared/layout/sectionRoute'
import '../../../shared/auth/auth.css'
import { formatPrice } from '../api'
import { StatusPill } from '../OrderBody'
import { orderDate, orderPaths } from '../ordersApi'
import type { OrderPage, OrderSummary } from '../ordersApi'
import { sellerPaths, shortDate } from '../sellerApi'
import type { SellerAccount } from '../sellerApi'
import { sellerProductPaths } from '../sellerProductsApi'
import type { SellerProductPage } from '../sellerProductsApi'
import '../marketplace.css'
import '../../../shared/layout/workspace.css'
import { SellerOrders } from './SellerOrders'
import { SellerProducts } from './SellerProducts'

type Props = {
  onExit: () => void
  // Opens HUB Store (the address is already set to this store's page).
  onViewStore?: () => void
}

type Page = 'dashboard' | 'products' | 'orders' | 'profile'
type OpenOptions = { newProduct?: boolean; orderId?: string }

const SECTION = 'seller'

const PAGES: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'profile', label: 'Store profile' },
]

const TITLES: Record<Page, { title: string; text: string }> = {
  dashboard: { title: 'Dashboard', text: 'What needs your attention today.' },
  products: { title: 'Products', text: 'Add products, change prices and stock, and choose what shows in the store.' },
  orders: { title: 'Orders', text: 'Confirm new orders, then mark them as shipped and delivered.' },
  profile: { title: 'Store profile', text: 'Your store details as HUB has them.' },
}

function readPage(path: string | null): Page {
  return path === 'products' || path === 'orders' || path === 'profile' ? path : 'dashboard'
}

const pathOf = (page: Page) => (page === 'dashboard' ? '' : page)

export function SellerCenter({ onExit, onViewStore }: Props) {
  const { authFetch, user } = useAuth()
  // undefined = loading, null = has not applied yet.
  const [account, setAccount] = useState<SellerAccount | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [page, setPage] = useState<Page>(() => readPage(sectionPath(SECTION)))
  // Set by the dashboard: open the product form, or one order, when the page opens. A new key restarts the page.
  const [start, setStart] = useState<OpenOptions & { key: number }>({ key: 0 })

  const load = useCallback(() => {
    authFetch<SellerAccount>(sellerPaths.mine)
      .then((data) => { setAccount(data); setError(null) })
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 404) setAccount(null)
        else setError(reason instanceof ApiError ? reason.message : 'Could not load your seller account.')
      })
  }, [authFetch])
  useEffect(() => { load() }, [load])

  // Put the first page in the address bar when Seller Center opens.
  const [startPath] = useState(() => pathOf(readPage(sectionPath(SECTION))))
  useEffect(() => { enterSection(SECTION, startPath) }, [startPath])
  useSectionHistory(SECTION, useCallback((path: string | null) => {
    if (path === null) onExit()
    else { setPage(readPage(path)); window.scrollTo({ top: 0 }) }
  }, [onExit]))

  const open = (next: Page, options: OpenOptions = {}) => {
    if (next !== page) goTo(SECTION, pathOf(next))
    setPage(next)
    setStart((current) => ({ key: current.key + 1, ...options }))
    window.scrollTo({ top: 0 })
  }
  const exit = () => { leaveSection(); onExit() }
  // The store as customers see it: this store's page in HUB Store (the seller account id is the shop id).
  const viewStore = () => {
    if (!account || !onViewStore) return
    history.pushState({ hubDepth: 1 }, '', `#store/shop/${encodeURIComponent(account.id)}`)
    onViewStore()
    window.scrollTo({ top: 0 })
  }

  const approved = account?.status === 'Approved' && !editing
  const heading = approved ? TITLES[page]
    : { title: account ? 'Your application' : 'Open your HUB Store', text: 'Sell to HUB customers across the country.' }

  return (
    <div className="sx">
      <aside className="sx-side" aria-label="Seller Center">
        <div className="sx-brand">
          <span className="sx-logo">HUB</span>
          <span className="sx-brand-name">Seller Center</span>
        </div>
        {account && (
          <div className="sx-store">
            <span className="sx-store-mark" aria-hidden="true">{initials(account.name)}</span>
            <span className="sx-store-text">
              <strong>{account.name}</strong>
              <StatusBadge status={account.status} />
            </span>
          </div>
        )}
        <nav className="sx-nav" aria-label="Seller Center pages">
          {approved ? PAGES.map((item) => (
            <button key={item.id} type="button" aria-current={page === item.id ? 'page' : undefined} onClick={() => open(item.id)}>
              {item.label}
            </button>
          )) : <button type="button" aria-current="page">{account ? 'Application' : 'Apply'}</button>}
        </nav>
        <div className="sx-side-foot">
          {approved && onViewStore && <button type="button" onClick={viewStore}>View my store</button>}
          <button type="button" onClick={exit}>Back to HUB</button>
        </div>
      </aside>

      <main className="sx-main mp-app">
        <header className="sx-head">
          <div>
            <h1>{heading.title}</h1>
            <p>{heading.text}</p>
          </div>
          {approved && page !== 'products' && (
            <button type="button" className="sx-button primary" onClick={() => open('products', { newProduct: true })}>Add product</button>
          )}
        </header>

        {error && <div className="mp-message error" role="alert">{error}</div>}
        {account === undefined && !error && <div className="mp-message">Loading…</div>}

        {(account === null || editing) && (
          <ApplyForm initial={account ?? undefined} defaultPhone={user?.phone ?? ''}
            onSaved={(saved) => { setAccount(saved); setEditing(false) }} />
        )}
        {account && !editing && !approved && <AccountPanel account={account} onRefresh={load} onEdit={() => setEditing(true)} />}

        {approved && page === 'dashboard' && <Dashboard key={start.key} name={user?.fullName ?? ''} onOpen={open} />}
        {approved && page === 'products' && <SellerProducts key={start.key} startNew={start.newProduct} />}
        {approved && page === 'orders' && <SellerOrders key={start.key} openId={start.orderId} />}
        {approved && page === 'profile' && account && <AccountPanel account={account} onRefresh={load} onEdit={() => setEditing(true)} />}
      </main>
    </div>
  )
}

// The store's status and details (the Store profile page, and the page shown before approval).
function AccountPanel({ account, onRefresh, onEdit }: { account: SellerAccount; onRefresh: () => void; onEdit: () => void }) {
  return (
    <section className="sx-card">
      <div className="sx-card-head">
        <h2>{account.name}</h2>
        <StatusBadge status={account.status} />
      </div>
      {account.status === 'Pending' && (
        <p className="sx-note">Your application was sent on {shortDate(account.submittedAt)}. An administrator will review it soon; this page shows the decision.</p>
      )}
      {account.status === 'Approved' && <p className="sx-note">Your store is approved and open to customers.</p>}
      {account.status === 'Rejected' && (
        <>
          <p className="sx-note">Your application was not approved.</p>
          <p className="mp-reason"><strong>Reason:</strong> {account.reviewReason}</p>
        </>
      )}
      {account.status === 'Suspended' && (
        <>
          <p className="sx-note">Your store is suspended and hidden from customers.</p>
          <p className="mp-reason"><strong>Reason:</strong> {account.reviewReason}</p>
        </>
      )}
      <dl className="sx-facts">
        <div><dt>Store name</dt><dd>{account.name}</dd></div>
        <div><dt>Store phone</dt><dd>{account.phone}</dd></div>
        <div><dt>Applied on</dt><dd>{shortDate(account.submittedAt)}</dd></div>
        {account.reviewedAt && <div><dt>Last decision</dt><dd>{shortDate(account.reviewedAt)}</dd></div>}
        {account.description && <div className="wide"><dt>About your store</dt><dd>{account.description}</dd></div>}
      </dl>
      <div className="sx-actions">
        {account.status === 'Rejected' && <button type="button" className="sx-button primary" onClick={onEdit}>Fix details and apply again</button>}
        <button type="button" className="sx-button" onClick={onRefresh}>Refresh status</button>
      </div>
    </section>
  )
}

type Counts = { placed: number; confirmed: number; shipped: number; products: number }

// Dashboard: the counts that matter today and the newest orders waiting for the store. Every number comes from the server.
function Dashboard({ name, onOpen }: { name: string; onOpen: (page: Page, options?: OpenOptions) => void }) {
  const { authFetch } = useAuth()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [waiting, setWaiting] = useState<OrderSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    const orders = (status: string) => authFetch<OrderPage>(orderPaths.sellerList(status, 1))
    Promise.all([orders('Placed'), orders('Confirmed'), orders('Shipped'), authFetch<SellerProductPage>(sellerProductPaths.list('', 1))])
      .then(([placed, confirmed, shipped, products]) => {
        if (!current) return
        setCounts({ placed: placed.total, confirmed: confirmed.total, shipped: shipped.total, products: products.total })
        setWaiting(placed.items.slice(0, 5))
        setError(null)
      })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your dashboard.') })
    return () => { current = false }
  }, [authFetch])

  const firstName = name.split(' ')[0]
  return (
    <>
      {firstName && <p className="sx-welcome">Welcome back, {firstName}.</p>}
      {error && <div className="mp-message error" role="alert">{error}</div>}
      <ul className="sx-stats">
        <Stat label="New orders" hint="Paid, waiting for you to confirm" value={counts?.placed} urgent onClick={() => onOpen('orders')} />
        <Stat label="To ship" hint="Confirmed, not shipped yet" value={counts?.confirmed} onClick={() => onOpen('orders')} />
        <Stat label="On the way" hint="Shipped, not delivered yet" value={counts?.shipped} onClick={() => onOpen('orders')} />
        <Stat label="Products" hint="All your products" value={counts?.products} onClick={() => onOpen('products')} />
      </ul>

      <div className="sx-grid">
        <section className="sx-card">
          <div className="sx-card-head">
            <h2>Orders waiting for you</h2>
            <button type="button" className="sx-link" onClick={() => onOpen('orders')}>All orders</button>
          </div>
          {!waiting && !error && <p className="sx-empty">Loading…</p>}
          {waiting && waiting.length === 0 && <p className="sx-empty">No new orders right now. New paid orders show up here first.</p>}
          {waiting && waiting.length > 0 && (
            <ul className="sx-orders">
              {waiting.map((order) => (
                <li key={order.id}>
                  <button type="button" onClick={() => onOpen('orders', { orderId: order.id })}>
                    {order.firstImageUrl ? <img src={mediaUrl(order.firstImageUrl) ?? ''} alt="" /> : <span className="sx-noimage" />}
                    <span className="sx-order-main">
                      <strong>{order.number}</strong>
                      <span>{order.customerName} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {orderDate(order.createdAt)}</span>
                    </span>
                    <span className="sx-order-total">{formatPrice(order.total, order.currency)}</span>
                    <StatusPill status={order.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sx-card">
          <div className="sx-card-head"><h2>Quick actions</h2></div>
          <ul className="sx-quick">
            <QuickAction title="Add a product" text="Name, price, stock, options and photos." onClick={() => onOpen('products', { newProduct: true })} />
            <QuickAction title="Manage products" text="Change prices and stock, or hide a product." onClick={() => onOpen('products')} />
            <QuickAction title="Store profile" text="Your store details and status." onClick={() => onOpen('profile')} />
          </ul>
        </section>
      </div>
    </>
  )
}

function Stat({ label, hint, value, urgent, onClick }: { label: string; hint: string; value: number | undefined; urgent?: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" className={urgent && value ? 'sx-stat urgent' : 'sx-stat'} onClick={onClick}>
        <span className="sx-stat-label">{label}</span>
        <strong className="sx-stat-value">{value === undefined ? '–' : value.toLocaleString('en-PK')}</strong>
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

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'S'
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
    <form ref={formRef} className="sx-card mp-form sx-apply" onSubmit={submit} noValidate>
      <h2>{initial ? 'Apply again' : 'Tell us about your store'}</h2>
      <p className="sx-note">An administrator checks every application before the store goes live.</p>
      <Field label="Store name" name="name" value={values.name} onChange={set('name')} error={errors.name} />
      <label className={errors.description ? 'auth-field invalid' : 'auth-field'}>
        About your store (optional)
        <textarea name="description" rows={4} value={values.description} onChange={(e) => set('description')(e.target.value)}
          aria-invalid={errors.description ? true : undefined} />
        {errors.description
          ? <span className="auth-field-error">{errors.description}</span>
          : <span className="auth-hint">{values.description.length} / 2000 characters</span>}
      </label>
      <PhoneField label="Store phone" name="phone" value={values.phone} onChange={set('phone')} error={errors.phone} />
      {error && <p className="mp-message error" role="alert">{error}</p>}
      <button type="submit" className="sx-button primary" disabled={busy}>{busy ? 'Sending…' : 'Send application'}</button>
    </form>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`mp-status mp-status-${status.toLowerCase()}`}>{status}</span>
}
