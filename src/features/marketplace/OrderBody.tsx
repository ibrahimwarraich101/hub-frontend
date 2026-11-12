// File purpose: The parts of an order both the customer and the seller see: status, timeline, items, delivery and totals.
import { mediaUrl } from '../../shared/api/client'
import { formatPrice } from './api'
import { orderDate, statusLabels, statusTones } from './ordersApi'
import type { Order, OrderStatus } from './ordersApi'

const steps: OrderStatus[] = ['AwaitingPayment', 'Placed', 'Confirmed', 'Shipped', 'Delivered']

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`mp-pill ${statusTones[status]}`}>{statusLabels[status]}</span>
}

export function OrderBody({ order, showCustomer }: { order: Order; showCustomer?: boolean }) {
  const reached = new Map(order.history.map((item) => [item.status, item.at]))
  return (
    <>
      <section className="mp-panel" aria-label="Progress">
        <h3>Progress</h3>
        {order.status === 'Cancelled' ? (
          <p className="mp-message error">
            Cancelled {order.cancelledAt ? `on ${orderDate(order.cancelledAt)}` : ''} by {order.cancelledBy === 'System' ? 'HUB' : order.cancelledBy?.toLowerCase()}.
            {' '}Reason: {order.cancelReason}
            {order.refundNeeded && ' This order was paid, so HUB will return the money to the same JazzCash account or card.'}
          </p>
        ) : (
          <ol className="mp-steps">
            {steps.map((step) => (
              <li key={step} className={reached.has(step) ? 'done' : ''}>
                <strong>{statusLabels[step]}</strong>
                {reached.get(step) && <span className="mp-hint">{orderDate(reached.get(step)!)}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mp-panel" aria-label="Items">
        <h3>Items from {order.merchantName}</h3>
        {order.items.map((item) => (
          <div key={item.id} className="mp-checkout-line">
            {item.imageUrl ? <img src={mediaUrl(item.imageUrl) ?? ''} alt="" /> : <span className="mp-noimage">No photo</span>}
            <span>
              {item.quantity} × {item.name}
              {(item.color || item.size) && <span className="mp-hint"> ({[item.color, item.size].filter(Boolean).join(', ')})</span>}
              <span className="mp-hint"> · {formatPrice(item.unitPrice, order.currency)} each</span>
            </span>
            <strong>{formatPrice(item.lineTotal, order.currency)}</strong>
          </div>
        ))}
        <p className="mp-cart-row"><span>Subtotal</span><span>{formatPrice(order.subtotal, order.currency)}</span></p>
        <p className="mp-cart-row"><span>Delivery</span><span>{order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee, order.currency)}</span></p>
        <p className="mp-cart-row total"><span>Total</span><span>{formatPrice(order.total, order.currency)}</span></p>
      </section>

      <section className="mp-panel" aria-label="Delivery">
        <h3>Delivery</h3>
        <dl className="mp-facts">
          {showCustomer && order.customerName && <><dt>Customer</dt><dd>{order.customerName}</dd></>}
          <dt>Name</dt><dd>{order.delivery.name}</dd>
          <dt>Phone</dt><dd>{order.delivery.phone}</dd>
          <dt>Address</dt><dd>{order.delivery.address}, {order.delivery.city}</dd>
          {order.note && <><dt>Note</dt><dd>{order.note}</dd></>}
          <dt>Ordered</dt><dd>{orderDate(order.createdAt)}</dd>
          {order.paidAt && <><dt>Paid</dt><dd>{orderDate(order.paidAt)} with JazzCash</dd></>}
        </dl>
      </section>
    </>
  )
}
