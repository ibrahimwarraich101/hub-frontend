// File purpose: Admin portal (HUB Food part): every food order with totals, filters (status, search, dates, restaurant)
// and one order's full details (customer, restaurant, payment, history). Read-only; refreshes every 30 seconds.
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { ComplaintThread } from '../ComplaintThread'
import { dateTime, foodPaths, money, statusLabel } from '../foodApi'
import type { AdminOrder, AdminOrderFilter, AdminOrderPage, AdminOrderTotals } from '../foodApi'

type Filters = { status: AdminOrderFilter; search: string; from: string; to: string; restaurant: { id: string; name: string } | null; page: number }

const NO_FILTERS: Filters = { status: '', search: '', from: '', to: '', restaurant: null, page: 1 }

const FILTER_TABS: { value: AdminOrderFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'AwaitingPayment', label: 'Waiting for payment' },
  { value: 'active', label: 'Active' },
  { value: 'Completed', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'refund', label: 'Refund due' },
]

// initialOrderId: open this order straight away (for example from a complaint).
export function AdminOrders({ initialOrderId = null }: { initialOrderId?: string | null }) {
  const { authFetch } = useAuth()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [search, setSearch] = useState('')
  const [data, setData] = useState<AdminOrderPage | null>(null)
  const [totals, setTotals] = useState<AdminOrderTotals | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(initialOrderId)

  const load = useCallback((signal: { cancelled: boolean }) => {
    authFetch<AdminOrderPage>(foodPaths.adminOrders(filters.status, filters.search, filters.from, filters.to, filters.restaurant?.id ?? '', filters.page))
      .then((result) => { if (!signal.cancelled) { setData(result); setError(null) } })
      .catch((reason: unknown) => { if (!signal.cancelled) setError(reason instanceof ApiError ? reason.message : 'Could not load orders.') })
    authFetch<AdminOrderTotals>(foodPaths.adminOrderTotals)
      .then((result) => { if (!signal.cancelled) setTotals(result) })
      .catch(() => undefined)
  }, [authFetch, filters])

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    const timer = window.setInterval(() => load(signal), 30000)
    return () => { signal.cancelled = true; window.clearInterval(timer) }
  }, [load])

  function change(next: Partial<Filters>) {
    setData(null)
    setFilters({ ...filters, page: 1, ...next })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    change({ search: search.trim() })
  }

  function clearAll() {
    setSearch('')
    setData(null)
    setFilters(NO_FILTERS)
  }

  if (openId) {
    return (
      <OrderView orderId={openId} onBack={() => setOpenId(null)}
        onRestaurant={(restaurant) => { setOpenId(null); setSearch(''); setData(null); setFilters({ ...NO_FILTERS, restaurant }) }} />
    )
  }

  const filtered = filters.status !== '' || filters.search !== '' || filters.from !== '' || filters.to !== '' || filters.restaurant !== null
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const tiles = totals && [
    { label: 'All orders', value: String(totals.allOrders), tone: '' },
    { label: 'Paid orders today', value: String(totals.todayOrders), tone: '' },
    { label: 'Sales today', value: money(totals.todaySales), tone: '' },
    { label: 'Active now', value: String(totals.active), tone: '' },
    { label: 'Delivered', value: String(totals.delivered), tone: '' },
    { label: 'Refunds due', value: String(totals.refundsDue), tone: totals.refundsDue > 0 ? 'alert' : '' },
  ]

  return (
    <>
      {tiles && (
        <div className="fd-stats" aria-label="HUB Food order totals">
          {tiles.map((tile) => (
            <div key={tile.label} className={tile.tone ? `fd-stat ${tile.tone}` : 'fd-stat'}>
              <strong>{tile.value}</strong>
              <span>{tile.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="fd-tabs" role="tablist" aria-label="Order status">
        {FILTER_TABS.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={filters.status === tab.value}
            className={filters.status === tab.value ? 'fd-tab active' : 'fd-tab'} onClick={() => change({ status: tab.value })}>
            {tab.label}
          </button>
        ))}
      </div>

      <form className="fd-admin-filters" onSubmit={submit} role="search">
        <input aria-label="Search orders" placeholder="Order number, customer, phone or restaurant" value={search} maxLength={100}
          onChange={(e) => setSearch(e.target.value)} />
        <label>From <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => change({ from: e.target.value })} /></label>
        <label>To <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => change({ to: e.target.value })} /></label>
        <button type="submit" className="fd-primary">Search</button>
        {filtered && <button type="button" className="fd-link" onClick={clearAll}>Clear all</button>}
      </form>
      {filters.restaurant && (
        <p className="fd-admin-only">
          Only orders from <strong>{filters.restaurant.name}</strong>
          <button type="button" className="fd-link" onClick={() => change({ restaurant: null })}>Show all restaurants</button>
        </p>
      )}

      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !data && <div className="fd-message">Loading…</div>}
      {data && <h2 className="fd-results">{data.total} {data.total === 1 ? 'order' : 'orders'}</h2>}
      {data && data.items.length === 0 && <div className="fd-message">No orders match these filters.</div>}

      {data && data.items.length > 0 && (
        <ul className="fd-orders">
          {data.items.map((order) => (
            <li key={order.id}>
              <button type="button" className="fd-order-row fd-admin-row" onClick={() => setOpenId(order.id)} aria-label={`Open order ${order.number}`}>
                <span>
                  <strong>{order.number}</strong>
                  <span className="fd-meta">{dateTime(order.createdAt)}</span>
                </span>
                <span>
                  <strong>{order.restaurantName}</strong>
                  <span className="fd-meta">{order.customerName} · {order.deliveryCity}</span>
                </span>
                <span>
                  <strong>{money(order.total)}</strong>
                  <span className="fd-meta">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {order.paid ? 'paid' : 'not paid'}</span>
                </span>
                <span className="fd-admin-badges">
                  <span className={`fd-status fd-status-${order.status.toLowerCase()}`}>{statusLabel[order.status]}</span>
                  {order.refundDue && <span className="fd-status fd-status-awaitingpayment">Refund due</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <nav className="fd-pager" aria-label="Pages">
          <button type="button" disabled={filters.page <= 1} onClick={() => change({ page: filters.page - 1 })}>Previous</button>
          <span>Page {filters.page} of {totalPages}</span>
          <button type="button" disabled={filters.page >= totalPages} onClick={() => change({ page: filters.page + 1 })}>Next</button>
        </nav>
      )}
    </>
  )
}

type ViewProps = { orderId: string; onBack: () => void; onRestaurant: (restaurant: { id: string; name: string }) => void }

function OrderView({ orderId, onBack, onRestaurant }: ViewProps) {
  const { authFetch } = useAuth()
  const [data, setData] = useState<AdminOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    authFetch<AdminOrder>(foodPaths.adminOrder(orderId))
      .then((result) => { if (!cancelled) setData(result) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof ApiError ? reason.message : 'Could not load this order.') })
    return () => { cancelled = true }
  }, [authFetch, orderId])

  const back = <button type="button" className="fd-link" onClick={onBack}>← All orders</button>
  if (!data) return <>{back}{error ? <div className="fd-message error" role="alert">{error}</div> : <div className="fd-message">Loading…</div>}</>
  const order = data.order

  return (
    <div className="fd-layout">
      <div className="fd-admin-column">
        {back}
        <div className="fd-panel">
          <div className="fd-card-top">
            <h2>Order {order.number}</h2>
            <span className="fd-admin-badges">
              <span className={`fd-status fd-status-${order.status.toLowerCase()}`}>{statusLabel[order.status]}</span>
              {data.refundDue && <span className="fd-status fd-status-awaitingpayment">Refund due</span>}
            </span>
          </div>
          <p className="fd-meta">Placed {dateTime(order.createdAt)}</p>
          {order.status === 'Cancelled' && (
            <p className="fd-reason">Cancelled by {order.cancelledBy === 'System' ? 'HUB' : order.cancelledBy?.toLowerCase()}: {order.cancelReason}</p>
          )}
          {data.refundDue && (
            <p className="fd-message warn">The customer paid {money(order.total)} and the order was then cancelled. This payment still has to be returned.</p>
          )}
          <h3>History</h3>
          <ol className="fd-admin-history">
            {order.history.map((step) => (
              <li key={step.status + step.changedAt}><strong>{statusLabel[step.status]}</strong><span className="fd-meta">{dateTime(step.changedAt)}</span></li>
            ))}
          </ol>
          {order.review && (
            <p>Customer rating: {'★'.repeat(order.review.rating)}{'☆'.repeat(5 - order.review.rating)} {order.review.comment}</p>
          )}
        </div>

        {order.complaint && (
          <div className="fd-panel">
            <h3>Complaint</h3>
            <ComplaintThread complaint={order.complaint} viewer="admin" />
          </div>
        )}

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
            <dt>Name</dt><dd>{order.restaurantName}</dd>
            <dt>Phone</dt><dd>{data.restaurantPhone}</dd>
            <dt>Owner</dt><dd>{data.restaurantOwner.fullName} · {data.restaurantOwner.email} · {data.restaurantOwner.phone}</dd>
          </dl>
          <button type="button" className="fd-link" onClick={() => onRestaurant({ id: order.restaurantId, name: order.restaurantName })}>
            See all orders from this restaurant
          </button>
        </div>

        <div className="fd-panel">
          <h3>Payment</h3>
          <dl className="fd-facts">
            <dt>Amount owed</dt><dd>{money(order.total)} · {data.paymentStatus === 'Successful' ? 'paid' : data.paymentStatus === 'Failed' ? 'not paid (closed)' : 'not paid yet'}</dd>
            {order.paidAt && (<><dt>Paid</dt><dd>{dateTime(order.paidAt)}</dd></>)}
            {!order.paidAt && order.status === 'AwaitingPayment' && (<><dt>Pay before</dt><dd>{dateTime(order.paymentDueAt)}</dd></>)}
          </dl>
          {data.payments.length === 0 ? <p className="fd-meta">No payment attempts.</p> : (
            <ul className="fd-lines">
              {data.payments.map((payment) => (
                <li key={payment.reference} className="fd-line">
                  <span>{payment.provider} · {payment.methodType} · {payment.status}{payment.refundDue && ' · refund due'}
                    <span className="fd-meta"> {payment.reference} · {dateTime(payment.createdAt)}</span></span>
                  <span>{money(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="fd-panel" aria-label="Order summary">
        <h3>Summary</h3>
        <ul className="fd-lines">
          {order.items.map((item) => (
            <li key={item.menuItemId} className="fd-line"><span>{item.quantity} × {item.name}</span><span>{money(item.lineTotal)}</span></li>
          ))}
        </ul>
        <div className="fd-totals">
          <span>Subtotal</span><span>{money(order.subtotal)}</span>
          <span>Delivery</span><span>{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</span>
          <span className="grand">Total</span><span className="grand">{money(order.total)}</span>
        </div>
        <dl className="fd-facts">
          <dt>Deliver to</dt><dd>{order.delivery.name}, {order.delivery.address}, {order.delivery.city}</dd>
          <dt>Phone</dt><dd>{order.delivery.phone}</dd>
          {order.note && (<><dt>Note</dt><dd>{order.note}</dd></>)}
        </dl>
      </aside>
    </div>
  )
}
