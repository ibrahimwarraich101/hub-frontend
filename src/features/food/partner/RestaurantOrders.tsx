// File purpose: The restaurant's incoming paid orders: Accept -> On the way -> Delivered, or cancel with a reason.
// New orders are highlighted, each row shows how long ago it came in, and the next step is one click on the row.
// The list refreshes every 20 seconds so new orders appear without reloading.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { ComplaintThread } from '../ComplaintThread'
import { foodPaths, money, statusLabel, timeAgo } from '../foodApi'
import type { FoodOrder, FoodOrderPage, OrderStatus } from '../foodApi'
import { formatPhone } from '../../../shared/forms/phone'

const FILTERS: { value: OrderStatus; label: string }[] = [
  { value: 'Placed', label: 'New' },
  { value: 'Accepted', label: 'Preparing' },
  { value: 'Ready', label: 'On the way' },
  { value: 'Completed', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
]

const EMPTY: Partial<Record<OrderStatus, string>> = {
  Placed: 'No new orders right now. New paid orders appear here while your restaurant is open.',
  Accepted: 'Nothing being prepared right now.',
  Ready: 'Nothing on the way right now.',
}

// The next step the restaurant can take for each status.
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  Placed: { status: 'Accepted', label: 'Accept and start preparing' },
  Accepted: { status: 'Ready', label: 'Mark on the way' },
  Ready: { status: 'Completed', label: 'Mark delivered' },
}

export function RestaurantOrders() {
  const { authFetch } = useAuth()
  const [filter, setFilter] = useState<OrderStatus>('Placed')
  const [page, setPage] = useState<FoodOrderPage | null>(null)
  const [open, setOpen] = useState<FoodOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  // The new order being rejected from the list, and the reason typed for the customer.
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null)
  const panel = useRef<HTMLElement>(null)
  const openId = open?.id
  // On a narrow screen the order opens below the list, so bring it into view.
  useEffect(() => { if (openId && window.innerWidth <= 860) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [openId])

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

  // The next step (or rejecting) straight from the list. Reads the latest version first, so it never overwrites a newer change.
  async function quickStep(id: string, status: OrderStatus, why: string | null = null) {
    setRowBusy(id)
    setError(null)
    try {
      const current = await authFetch<FoodOrder>(foodPaths.restaurantOrder(id))
      const updated = await authFetch<FoodOrder>(foodPaths.restaurantOrderStatus(id), 'POST', { status, reason: why, expectedVersion: current.version })
      if (open?.id === id) setOpen(updated)
      if (status === 'Cancelled') setRejecting(null)
      load()
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : 'Could not update the order.')
    } finally {
      setRowBusy(null)
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
        {!page && !error && <div className="fd-message">Loading orders…</div>}
        {page && page.items.length === 0 && (
          <div className="fd-message">{EMPTY[filter] ?? 'No orders here yet.'}</div>
        )}
        {page && (
          <ul className="fd-orders">
            {page.items.map((order) => {
              const step = NEXT[order.status]
              return (
                <li key={order.id} className={order.status === 'Placed' ? 'fd-order-item new' : 'fd-order-item'}>
                  <button type="button" className={open?.id === order.id ? 'fd-order-row selected' : 'fd-order-row'} onClick={() => void openOrder(order.id)}>
                    <span>
                      {order.status === 'Placed' && <span className="fd-new">NEW</span>}
                      <strong>{order.number}</strong> · {order.customerName}
                      <br />
                      <span className="fd-meta">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {timeAgo(order.createdAt)}</span>
                    </span>
                    <span className="fd-actions">
                      <span className={`fd-status fd-status-${order.status.toLowerCase()}`}>{statusLabel[order.status]}</span>
                      <strong>{money(order.total)}</strong>
                    </span>
                  </button>
                  {step && rejecting?.id !== order.id && (
                    <span className="fd-actions fd-row-step">
                      <button type="button" className="fd-primary" disabled={rowBusy === order.id}
                        onClick={() => void quickStep(order.id, step.status)}>
                        {rowBusy === order.id ? 'Saving…' : order.status === 'Placed' ? 'Accept' : step.label}
                      </button>
                      {order.status === 'Placed' && (
                        <button type="button" className="fd-danger" disabled={rowBusy === order.id}
                          onClick={() => setRejecting({ id: order.id, reason: '' })}>Reject</button>
                      )}
                    </span>
                  )}
                  {rejecting?.id === order.id && (
                    <form className="fd-reject" onSubmit={(e) => { e.preventDefault(); if (rejecting.reason.trim()) void quickStep(order.id, 'Cancelled', rejecting.reason.trim()) }}>
                      <input aria-label="Why are you rejecting this order?" placeholder="Why? The customer sees this, e.g. Out of chicken today"
                        value={rejecting.reason} maxLength={500} autoFocus onChange={(e) => setRejecting({ id: order.id, reason: e.target.value })} />
                      <button type="submit" className="fd-danger" disabled={rowBusy === order.id || !rejecting.reason.trim()}>Reject order</button>
                      <button type="button" className="fd-link" onClick={() => setRejecting(null)}>Keep it</button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {open && (
        <aside ref={panel} className="fd-panel" aria-label={`Order ${open.number}`}>
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
            <dt>Phone</dt><dd><a href={`tel:${open.delivery.phone}`}>{formatPhone(open.delivery.phone)}</a></dd>
            <dt>Address</dt><dd>{open.delivery.address}, {open.delivery.city}</dd>
            {open.note && (<><dt>Note</dt><dd>{open.note}</dd></>)}
          </dl>
          {open.status === 'Cancelled' && <p className="fd-reason">Cancelled: {open.cancelReason}</p>}
          {open.complaint && (
            <>
              <ComplaintThread complaint={open.complaint} viewer="restaurant" />
              {open.complaint.canReply && <p className="fd-meta">Answer it in the Complaints tab.</p>}
            </>
          )}
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
