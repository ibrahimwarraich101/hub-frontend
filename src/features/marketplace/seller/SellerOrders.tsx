// File purpose: Seller Center "Orders": paid orders for the seller's store, and moving each one on:
// Confirm -> Mark as shipped -> Mark as delivered, or Cancel with a reason (stock returns; HUB refunds a paid order).
import { useCallback, useEffect, useState } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { formatPrice } from '../api'
import { OrderBody, StatusPill } from '../OrderBody'
import { orderDate, orderPaths } from '../ordersApi'
import type { Order, OrderPage, OrderStatus } from '../ordersApi'

const tabs: { status: OrderStatus | ''; label: string }[] = [
  { status: 'Placed', label: 'New' },
  { status: 'Confirmed', label: 'Confirmed' },
  { status: 'Shipped', label: 'Shipped' },
  { status: 'Delivered', label: 'Delivered' },
  { status: 'Cancelled', label: 'Cancelled' },
  { status: '', label: 'All' },
]

// The next step a seller can take for each status.
const nextStep: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  Placed: { status: 'Confirmed', label: 'Confirm order' },
  Confirmed: { status: 'Shipped', label: 'Mark as shipped' },
  Shipped: { status: 'Delivered', label: 'Mark as delivered' },
}

// openId: open straight on one order (e.g. from the dashboard).
export function SellerOrders({ openId: startId = null }: { openId?: string | null }) {
  const [openId, setOpenId] = useState<string | null>(startId ?? null)
  const [tab, setTab] = useState<OrderStatus | ''>('Placed')
  if (openId) return <SellerOrderDetails orderId={openId} onBack={() => setOpenId(null)} />
  return <SellerOrderList tab={tab} onTab={setTab} onOpen={setOpenId} />
}

function SellerOrderList({ tab, onTab, onOpen }: { tab: OrderStatus | ''; onTab: (tab: OrderStatus | '') => void; onOpen: (id: string) => void }) {
  const { authFetch } = useAuth()
  const [page, setPage] = useState({ tab, number: 1 })
  const number = page.tab === tab ? page.number : 1
  const [data, setData] = useState<{ key: string; page: OrderPage } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = `${tab}#${number}`

  useEffect(() => {
    let current = true
    authFetch<OrderPage>(orderPaths.sellerList(tab, number))
      .then((result) => { if (current) { setData({ key, page: result }); setError(null) } })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your orders.') })
    return () => { current = false }
  }, [authFetch, tab, number, key])

  const list = data?.page
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1
  return (
    <div className="mp-panel">
      <h2>Your orders{list ? ` (${list.total})` : ''}</h2>
      <div className="mp-chips" role="tablist" aria-label="Order status">
        {tabs.map((item) => (
          <button key={item.label} type="button" role="tab" aria-selected={tab === item.status}
            className={tab === item.status ? 'mp-chip active' : 'mp-chip'} onClick={() => onTab(item.status)}>{item.label}</button>
        ))}
      </div>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {!list && !error && <p className="mp-message">Loading…</p>}
      {list && list.items.length === 0 && <p className="mp-message">No orders here yet.</p>}
      {list && list.items.length > 0 && (
        <div className="sx-table-wrap">
          <table className="sx-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Placed</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sx-visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((item) => (
                // The whole row opens the order; the Open button is there for keyboard and screen-reader users.
                <tr key={item.id} onClick={() => onOpen(item.id)}>
                  <td data-label="Order">
                    <span className="sx-product">
                      {item.firstImageUrl ? <img src={mediaUrl(item.firstImageUrl) ?? ''} alt="" /> : <span className="sx-noimage" />}
                      <span><strong>{item.number}</strong></span>
                    </span>
                  </td>
                  <td data-label="Customer">{item.customerName ?? '—'}</td>
                  <td data-label="Items">{item.itemCount} item{item.itemCount === 1 ? '' : 's'}</td>
                  <td data-label="Total"><span className="sx-money">{formatPrice(item.total, item.currency)}</span></td>
                  <td data-label="Placed" className="sx-muted">{orderDate(item.createdAt)}</td>
                  <td data-label="Status"><StatusPill status={item.status} /></td>
                  <td className="sx-row-action">
                    <button type="button" className="sx-link" onClick={(event) => { event.stopPropagation(); onOpen(item.id) }}
                      aria-label={`Open order ${item.number}`}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list && pages > 1 && (
        <div className="mp-pager">
          <button type="button" disabled={number <= 1} onClick={() => setPage({ tab, number: number - 1 })}>Previous</button>
          <span>Page {number} of {pages}</span>
          <button type="button" disabled={number >= pages} onClick={() => setPage({ tab, number: number + 1 })}>Next</button>
        </div>
      )}
    </div>
  )
}

function SellerOrderDetails({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { authFetch } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)

  const load = useCallback(() => {
    authFetch<Order>(orderPaths.sellerOne(orderId))
      .then((data) => { setOrder(data); setError(null) })
      .catch((failure: unknown) => setError(failure instanceof ApiError ? failure.message : 'Could not load this order.'))
  }, [authFetch, orderId])
  useEffect(() => { load() }, [load])

  async function move(status: OrderStatus, why?: string) {
    if (!order) return
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const saved = await authFetch<Order>(orderPaths.sellerStatus(orderId), 'POST', { status, reason: why ?? null, expectedVersion: order.version })
      setOrder(saved)
      setCancelling(false)
      setNotice(status === 'Cancelled' ? 'The order is cancelled. The customer has been told and HUB will refund them.' : 'Saved. The customer has been told.')
    } catch (failure) {
      // E.g. the customer cancelled a moment ago: show why and load the latest order.
      setError(failure instanceof ApiError ? failure.message : 'Could not save. Please try again.')
      load()
    } finally { setBusy(false) }
  }

  const step = order ? nextStep[order.status] : undefined
  const canCancel = order?.status === 'Placed' || order?.status === 'Confirmed'
  return (
    <div className="mp-orders">
      <button type="button" className="mp-back" onClick={onBack}>Back</button>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {!order && !error && <p className="mp-message">Loading…</p>}
      {order && (
        <>
          <div className="mp-order-head">
            <h2 className="mp-cart-title">Order {order.number}</h2>
            <StatusPill status={order.status} />
          </div>
          {notice && <p className="mp-message" role="status">{notice}</p>}
          {(step || canCancel) && (
            <section className="mp-panel" aria-label="Next step">
              <div className="mp-actions">
                {step && <button type="button" className="mp-primary" disabled={busy} onClick={() => void move(step.status)}>{busy ? 'Saving…' : step.label}</button>}
                {canCancel && !cancelling && <button type="button" className="mp-link" disabled={busy} onClick={() => setCancelling(true)}>Cancel order</button>}
              </div>
              {cancelling && (
                <div className="mp-form">
                  <p>The items go back into your stock. The customer paid, so HUB will refund them.</p>
                  <label className={tried && !reason.trim() ? 'auth-field invalid' : 'auth-field'}>
                    Why are you cancelling? (the customer will see this)
                    <textarea rows={2} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
                    {tried && !reason.trim() && <span className="auth-field-error">Please write a reason.</span>}
                  </label>
                  <div className="mp-actions">
                    <button type="button" className="mp-danger" disabled={busy}
                      onClick={() => { setTried(true); if (reason.trim()) void move('Cancelled', reason.trim()) }}>Confirm: Cancel order</button>
                    <button type="button" className="mp-link" disabled={busy} onClick={() => setCancelling(false)}>Keep the order</button>
                  </div>
                </div>
              )}
            </section>
          )}
          <OrderBody order={order} showCustomer />
        </>
      )}
    </div>
  )
}
