// File purpose: The customer's food order history.
import { useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { dateTime, foodPaths, money, statusLabel } from './foodApi'
import type { FoodOrderPage } from './foodApi'

type Props = { onOpen: (orderId: string) => void }

export function OrdersView({ onOpen }: Props) {
  const { authFetch } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<FoodOrderPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    authFetch<FoodOrderPage>(foodPaths.myOrders(page))
      .then((result) => { if (active) { setData(result); setError(null) } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof ApiError ? reason.message : 'Could not load your orders.') })
    return () => { active = false }
  }, [authFetch, page])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return (
    <>
      <h2>My food orders</h2>
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !data && <div className="fd-message">Loading…</div>}
      {data && data.items.length === 0 && <div className="fd-message">You have not ordered food yet.</div>}
      {data && data.items.length > 0 && (
        <ul className="fd-orders">
          {data.items.map((order) => (
            <li key={order.id}>
              <button type="button" className="fd-order-row" onClick={() => onOpen(order.id)}>
                <span>
                  <strong>{order.restaurantName}</strong>
                  <br />
                  <span className="fd-meta">{order.number} · {order.itemCount} items · {dateTime(order.createdAt)}</span>
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
