// File purpose: One food order for the customer: live status tracker, items, payment (development test payment for now),
// cancelling before the restaurant starts cooking, and rating after delivery. Refreshes every 15 seconds while active.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { dateTime, foodPaths, money, statusLabel, trackerSteps } from './foodApi'
import type { FoodOrder } from './foodApi'

type Props = { orderId: string; onBack: () => void }

export function OrderDetails({ orderId, onBack }: Props) {
  const { authFetch } = useAuth()
  const [order, setOrder] = useState<FoodOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const load = useCallback(() => {
    authFetch<FoodOrder>(foodPaths.order(orderId))
      .then((data) => { setOrder(data); setError(null) })
      .catch((problem: unknown) => setError(problem instanceof ApiError ? problem.message : 'Could not load this order.'))
  }, [authFetch, orderId])

  useEffect(() => { load() }, [load])
  const active = order !== null && !['Completed', 'Cancelled'].includes(order.status)
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(load, 15000)
    return () => window.clearInterval(timer)
  }, [active, load])

  async function act(path: string, body?: unknown) {
    setBusy(true)
    setError(null)
    try {
      setOrder(await authFetch<FoodOrder>(path, 'POST', body))
      setCancelling(false)
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!order) return error ? <div className="fd-message error" role="alert">{error}</div> : <div className="fd-message">Loading…</div>
  const reached = (step: string) => order.history.some((item) => item.status === step)

  return (
    <div className="fd-layout">
      <div>
        <button type="button" className="fd-link" onClick={onBack}>← My orders</button>
        <div className="fd-panel">
          <h2>{order.restaurantName}</h2>
          <p className="fd-meta">Order {order.number} · placed {dateTime(order.createdAt)}</p>
          <span className={`fd-status fd-status-${order.status.toLowerCase()}`}>{statusLabel[order.status]}</span>
          {order.status !== 'Cancelled' && order.status !== 'AwaitingPayment' && (
            <ol className="fd-tracker" aria-label="Order progress">
              {trackerSteps.map((step) => (
                <li key={step} className={reached(step) ? 'done' : undefined}>{statusLabel[step]}</li>
              ))}
            </ol>
          )}
          {order.status === 'Cancelled' && (
            <p className="fd-reason">
              Cancelled by {order.cancelledBy === 'System' ? 'HUB' : order.cancelledBy?.toLowerCase()}: {order.cancelReason}
              {order.paidAt && ' Your payment will be returned by HUB.'}
            </p>
          )}
          {error && <div className="fd-message error" role="alert">{error}</div>}

          {order.status === 'AwaitingPayment' && (
            <div className="fd-test">
              <strong>Payment needed</strong>
              <p>Pay before {dateTime(order.paymentDueAt)} or the order is cancelled.</p>
              {order.testPaymentAvailable ? (
                <>
                  <p className="fd-meta">JazzCash is not connected to HUB Food yet. On this development server you can mark the order paid with a test payment (no real money).</p>
                  <button type="button" className="fd-primary" disabled={busy} onClick={() => void act(foodPaths.testPayment(order.id))}>
                    Pay {money(order.total)} (test payment)
                  </button>
                </>
              ) : (
                <p className="fd-meta">Online payment for HUB Food is coming soon.</p>
              )}
            </div>
          )}

          {order.canCancel && !cancelling && (
            <button type="button" className="fd-danger" onClick={() => setCancelling(true)}>Cancel order</button>
          )}
          {cancelling && (
            <div className="fd-form">
              <label className="auth-field">
                Why are you cancelling?
                <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="fd-actions">
                <button type="button" className="fd-danger" disabled={busy || !reason.trim()}
                  onClick={() => void act(foodPaths.cancel(order.id), { reason: reason.trim() })}>Cancel order</button>
                <button type="button" className="fd-secondary" onClick={() => setCancelling(false)}>Keep order</button>
              </div>
            </div>
          )}

          {order.canReview && (
            <div className="fd-form">
              <h3>Rate {order.restaurantName}</h3>
              <div className="fd-stars" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" role="radio" aria-checked={rating === star} className={star <= rating ? 'on' : undefined}
                    onClick={() => setRating(star)}>★ {star}</button>
                ))}
              </div>
              <label className="auth-field">
                Comment (optional)
                <textarea rows={2} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
              <button type="button" className="fd-primary" disabled={busy || rating === 0}
                onClick={() => void act(foodPaths.review(order.id), { rating, comment: comment.trim() || null })}>Send rating</button>
            </div>
          )}
          {order.review && (
            <p>Your rating: {'★'.repeat(order.review.rating)}{'☆'.repeat(5 - order.review.rating)} {order.review.comment}</p>
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
