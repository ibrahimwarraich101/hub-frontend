// File purpose: The customer's orders: a list, and one order with its progress, "Pay now" while unpaid, and "Cancel order"
// until the store confirms it. Also shows the result after coming back from JazzCash.
import { useCallback, useEffect, useState } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { formatPrice } from './api'
import { OrderBody, StatusPill } from './OrderBody'
import { orderDate, orderPaths, paymentMethods } from './ordersApi'
import type { Order, OrderPage, PaymentMethod } from './ordersApi'
import { paymentResultMessages, startPayment } from './payment'

export function OrdersList({ onOpen, onBack }: { onOpen: (id: string) => void; onBack: () => void }) {
  const { authFetch } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<OrderPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    authFetch<OrderPage>(orderPaths.mine(page))
      .then((result) => { if (current) { setData(result); setError(null) } })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your orders.') })
    return () => { current = false }
  }, [authFetch, page])

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return (
    <div className="mp-orders">
      <button type="button" className="mp-back" onClick={onBack}>Back to store</button>
      <h2 className="mp-cart-title">My orders</h2>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {!data && !error && <p className="mp-message">Loading…</p>}
      {data && data.items.length === 0 && <p className="mp-message">You have not ordered anything yet.</p>}
      {data && data.items.length > 0 && (
        <ul className="mp-seller-list">
          {data.items.map((item) => (
            <li key={item.id}>
              <button type="button" className="mp-seller-row" onClick={() => onOpen(item.id)}>
                {item.firstImageUrl ? <img src={mediaUrl(item.firstImageUrl) ?? ''} alt="" /> : <span className="mp-noimage">No photo</span>}
                <span className="mp-seller-row-main">
                  <strong>{item.number} · {item.merchantName}</strong>
                  <span className="mp-hint">{item.itemCount} item{item.itemCount === 1 ? '' : 's'} · {orderDate(item.createdAt)}</span>
                  <span className="mp-price">{formatPrice(item.total, item.currency)}</span>
                </span>
                <StatusPill status={item.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <div className="mp-pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}

type DetailsProps = { orderId: string; paymentResult: string | null; startMessage: string | null; onBack: () => void }

export function OrderDetails({ orderId, paymentResult, startMessage, onBack }: DetailsProps) {
  const { authFetch } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('Wallet')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(startMessage)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  // When the order was last loaded, to know if the payment time has passed.
  const [loadedAt, setLoadedAt] = useState(0)

  const load = useCallback(() => {
    authFetch<Order>(orderPaths.one(orderId))
      .then((data) => { setOrder(data); setLoadedAt(Date.now()); setError(null) })
      .catch((failure: unknown) => setError(failure instanceof ApiError && failure.status === 404 ? 'Order not found.'
        : failure instanceof ApiError ? failure.message : 'Could not load this order.'))
  }, [authFetch, orderId])
  useEffect(() => { load() }, [load])

  async function pay() {
    setPaying(true)
    setPayError(null)
    try { await startPayment(authFetch, orderId, method) } catch (failure) {
      setPayError(failure instanceof ApiError ? failure.message : 'The payment could not start. Please try again.')
      setPaying(false)
      load()
    }
  }

  async function cancel() {
    setTried(true)
    if (!reason.trim()) return
    setBusy(true)
    try {
      setOrder(await authFetch<Order>(orderPaths.cancel(orderId), 'POST', { reason: reason.trim() }))
      setCancelling(false)
    } catch (failure) {
      setPayError(failure instanceof ApiError ? failure.message : 'Could not cancel the order. Please try again.')
      load()
    } finally { setBusy(false) }
  }

  const result = paymentResult ? paymentResultMessages[paymentResult] : null
  const canPay = order?.status === 'AwaitingPayment' && Date.parse(order.paymentDueAt) > loadedAt
  const canCancel = order?.status === 'AwaitingPayment' || order?.status === 'Placed'
  return (
    <div className="mp-orders">
      <button type="button" className="mp-back" onClick={onBack}>Back to my orders</button>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {!order && !error && <p className="mp-message">Loading…</p>}
      {order && (
        <>
          <div className="mp-order-head">
            <h2 className="mp-cart-title">Order {order.number}</h2>
            <StatusPill status={order.status} />
          </div>
          {result && <p className={`mp-message ${result.tone === 'error' ? 'error' : ''}`} role="status">{result.text}</p>}
          {payError && <p className="mp-message error" role="alert">{payError}</p>}

          {canPay && (
            <section className="mp-panel" aria-label="Pay now">
              <h3>Pay {formatPrice(order.total, order.currency)} with JazzCash</h3>
              <p className="mp-hint">Please pay before {orderDate(order.paymentDueAt)}, or the order is cancelled and the items go back on sale.</p>
              {order.lastPayment?.message && order.lastPayment.status !== 'Successful' && <p className="mp-hint">{order.lastPayment.message}</p>}
              <div className="mp-methods" role="radiogroup" aria-label="Payment method">
                {paymentMethods.map((option) => (
                  <button key={option.id} type="button" role="radio" aria-checked={method === option.id}
                    className={method === option.id ? 'mp-method active' : 'mp-method'} onClick={() => setMethod(option.id)}>
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="mp-primary" disabled={paying} onClick={() => void pay()}>
                {paying ? 'Taking you to JazzCash…' : 'Pay now'}
              </button>
            </section>
          )}

          <OrderBody order={order} />

          {canCancel && (
            <section className="mp-panel" aria-label="Cancel order">
              {!cancelling ? (
                <button type="button" className="mp-link" onClick={() => setCancelling(true)}>Cancel order</button>
              ) : (
                <div className="mp-form">
                  <p>{order.status === 'Placed' ? 'This order is paid. If you cancel, HUB returns the money to you.' : 'The items go back on sale.'}</p>
                  <label className={tried && !reason.trim() ? 'auth-field invalid' : 'auth-field'}>
                    Why are you cancelling?
                    <textarea rows={2} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
                    {tried && !reason.trim() && <span className="auth-field-error">Please tell us why. The store will see it.</span>}
                  </label>
                  <div className="mp-actions">
                    <button type="button" className="mp-danger" disabled={busy} onClick={() => void cancel()}>{busy ? 'Cancelling…' : 'Confirm: Cancel order'}</button>
                    <button type="button" className="mp-link" disabled={busy} onClick={() => setCancelling(false)}>Keep my order</button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
