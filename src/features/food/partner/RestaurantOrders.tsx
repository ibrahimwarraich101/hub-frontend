// File purpose: The restaurant's incoming paid orders: Accept -> On the way -> Delivered, or cancel with a reason.
// The list refreshes every 20 seconds so new orders appear without reloading.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { dateTime, foodPaths, money, statusLabel } from '../foodApi'
import type { FoodOrder, FoodOrderPage, OrderStatus } from '../foodApi'

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'Completed', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
]

// The next step the restaurant can take for each status.
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  Placed: { status: 'Accepted', label: 'Accept and start preparing' },
  Accepted: { status: 'Ready', label: 'Mark on the way' },
  Ready: { status: 'Completed', label: 'Mark delivered' },
}

export function RestaurantOrders() {
  const { authFetch } = useAuth()
  const [filter, setFilter] = useState('active')
  const [page, setPage] = useState<FoodOrderPage | null>(null)
  const [open, setOpen] = useState<FoodOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')

  const load = useCallback(() => {
    authFetch<FoodOrderPage>(foodPaths.restaurantOrders(filter, 1))
      .then((data) => { setPage(data); setError(null) })
      .catch((problem: unknown) => setError(problem instanceof ApiError ? problem.message : 'Could not load orders.'))
  }, [authFetch, filter])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 20000)
    return () => window.clearInterval(timer)
  }, [load])

  async function openOrder(id: string) {
    setError(null)
    setReason('')
    try {
      setOpen(await authFetch<FoodOrder>(foodPaths.restaurantOrder(id)))
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : 'Could not open this order.')
    }
  }

  async function update(status: OrderStatus) {
    if (!open) return
    setBusy(true)
    setError(null)
    try {
      setOpen(await authFetch<FoodOrder>(foodPaths.restaurantOrderStatus(open.id), 'POST', {
        status, reason: status === 'Cancelled' ? reason.trim() : null, expectedVersion: open.version,
      }))
      load()
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : 'Could not update the order.')
    } finally {
      setBusy(false)
    }
  }

  const next = open ? NEXT[open.status] : undefined
  return (
    <div className="fd-layout">
      <div>
        <div className="fd-tabs" role="tablist" aria-label="Order filter">
          {FILTERS.map((item) => (
            <button key={item.value} type="button" role="tab" aria-selected={filter === item.value}
              className={filter === item.value ? 'fd-tab active' : 'fd-tab'} onClick={() => { setFilter(item.value); setOpen(null) }}>
              {item.label}
            </button>
          ))}
        </div>
        {error && <div className="fd-message error" role="alert">{error}</div>}
        {page && page.items.length === 0 && <div className="fd-message">No orders here yet.</div>}
        {page && (
          <ul className="fd-orders">
            {page.items.map((order) => (
              <li key={order.id}>
                <button type="button" className="fd-order-row" onClick={() => void openOrder(order.id)}>
                  <span>
                    <strong>{order.number}</strong> · {order.customerName}
                    <br />
                    <span className="fd-meta">{order.itemCount} items · {dateTime(order.createdAt)}</span>
                  </span>
                  <span className="fd-actions">
                    <span className={`fd-status fd-status-${order.status.toLowerCase()}`}>{statusLabel[order.status]}</span>
                    <strong>{money(order.total)}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <aside className="fd-panel" aria-label={`Order ${open.number}`}>
          <h3>Order {open.number}</h3>
          <span className={`fd-status fd-status-${open.status.toLowerCase()}`}>{statusLabel[open.status]}</span>
          <ul className="fd-lines">
            {open.items.map((item) => (
              <li key={item.menuItemId} className="fd-line"><span>{item.quantity} × {item.name}</span><span>{money(item.lineTotal)}</span></li>
            ))}
          </ul>
          <div className="fd-totals">
            <span>Delivery fee</span><span>{money(open.deliveryFee)}</span>
            <span className="grand">Total (paid)</span><span className="grand">{money(open.total)}</span>
          </div>
          <dl className="fd-facts">
            <dt>Customer</dt><dd>{open.delivery.name}</dd>
            <dt>Phone</dt><dd><a href={`tel:${open.delivery.phone}`}>{open.delivery.phone}</a></dd>
            <dt>Address</dt><dd>{open.delivery.address}, {open.delivery.city}</dd>
            {open.note && (<><dt>Note</dt><dd>{open.note}</dd></>)}
          </dl>
          {open.status === 'Cancelled' && <p className="fd-reason">Cancelled: {open.cancelReason}</p>}
          {next && <button type="button" className="fd-primary" disabled={busy} onClick={() => void update(next.status)}>{next.label}</button>}
          {(open.status === 'Placed' || open.status === 'Accepted') && (
            <div className="fd-form">
              <label className="auth-field">
                Reason for cancelling (the customer sees this)
                <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <button type="button" className="fd-danger" disabled={busy || !reason.trim()} onClick={() => void update('Cancelled')}>Cancel order</button>
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
