// File purpose: The customer's food order history, with All / On the way / Past tabs and a small progress bar on each
// order, so its step is visible without opening it.
import { useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { dateTime, foodPaths, money, statusLabel, trackerSteps } from './foodApi'
import type { FoodOrderPage, OrderStatus } from './foodApi'

type Props = { onOpen: (orderId: string) => void; onBrowse: () => void }
type Tab = '' | 'active' | 'past'

const TABS: { value: Tab; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'On the way' },
  { value: 'past', label: 'Past orders' },
]

export function OrdersView({ onOpen, onBrowse }: Props) {
  const { authFetch } = useAuth()
  const [tab, setTab] = useState<Tab>('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<FoodOrderPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    authFetch<FoodOrderPage>(foodPaths.myOrders(page, tab))
      .then((result) => { if (active) { setData(result); setError(null) } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof ApiError ? reason.message : 'Could not load your orders.') })
    return () => { active = false }
  }, [authFetch, page, tab])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const empty = tab === 'active' ? 'Nothing on its way right now.' : tab === 'past' ? 'No delivered or cancelled orders yet.' : null
  return (
    <>
      <h2>My food orders</h2>
      <div className="fd-tabs" role="tablist" aria-label="Which orders">
        {TABS.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={tab === item.value ? 'fd-tab active' : 'fd-tab'}
            onClick={() => { setTab(item.value); setPage(1); setData(null) }}>{item.label}</button>
        ))}
      </div>
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !data && <div className="fd-message">Loading…</div>}
      {data && data.items.length === 0 && (empty ? <div className="fd-message">{empty}</div> : (
        <div className="fd-panel fd-empty">
          <h3>No food orders yet</h3>
          <p className="fd-meta">When you order, you can follow it here from the kitchen to your door.</p>
          <button type="button" className="fd-primary" onClick={onBrowse}>Browse restaurants</button>
        </div>
      ))}
      {data && data.items.length > 0 && (
        <ul className="fd-orders">
          {data.items.map((order) => (
            <li key={order.id}>
              <button type="button" className="fd-order-row fd-order-card" onClick={() => onOpen(order.id)}>
                <span className="fd-order-card-top">
                  <span>
                    <strong>{order.restaurantName}</strong>
                    <br />
                    <span className="fd-meta">{order.number} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {dateTime(order.createdAt)}</span>
                  </span>
                  <span className="fd-actions">
                    <span className={`fd-status fd-status-${order.status.toLowerCase()}`}>{statusLabel[order.status]}</span>
                    <strong>{money(order.total)}</strong>
                  </span>
                </span>
                <MiniProgress status={order.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && totalPages > 1 && (
        <nav className="fd-pager" aria-label="Pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </>
  )
}

// Four short bars (sent, preparing, on the way, delivered) filled up to the order's step. Not shown for cancelled orders.
function MiniProgress({ status }: { status: OrderStatus }) {
  if (status === 'Cancelled') return null
  if (status === 'AwaitingPayment') return <span className="fd-meta fd-mini-note">Pay to send this order to the restaurant.</span>
  const reached = trackerSteps.indexOf(status)
  return (
    <span className="fd-mini-progress" aria-label={`Progress: ${statusLabel[status]}`}>
      {trackerSteps.map((step, index) => <span key={step} className={index <= reached ? 'done' : undefined} title={statusLabel[step]} />)}
    </span>
  )
}
