// File purpose: Checkout for ONE store's items: delivery details, payment method (JazzCash wallet or card), order
// summary, then "Place order and pay" sends the customer to JazzCash. Free delivery for now.
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Field } from '../../shared/auth/AuthScreens'
import { formatPrice } from './api'
import { cartPaths } from './cartApi'
import type { Cart, CartStore } from './cartApi'
import { newRequestKey, orderPaths, paymentMethods, validateDelivery } from './ordersApi'
import type { DeliveryFields, Order, PaymentMethod } from './ordersApi'
import { startPayment } from './payment'

type Props = { merchantId: string; onBack: () => void; onOrder: (orderId: string, message: string | null) => void }

export function CheckoutPage({ merchantId, onBack, onOrder }: Props) {
  const { authFetch, user } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [store, setStore] = useState<CartStore | null | undefined>(undefined)
  const [values, setValues] = useState<Record<DeliveryFields, string>>({
    name: user?.fullName ?? '', phone: user?.phone ?? '', address: '', city: '', note: '',
  })
  const [method, setMethod] = useState<PaymentMethod>('Wallet')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Made once for this screen: pressing the button twice never makes two orders.
  const [requestKey] = useState(() => newRequestKey('checkout'))

  useEffect(() => {
    let current = true
    authFetch<Cart>(cartPaths.cart)
      .then((cart) => { if (current) setStore(cart.stores.find((item) => item.merchantId === merchantId) ?? null) })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your cart.') })
    return () => { current = false }
  }, [authFetch, merchantId])

  const errors = tried ? validateDelivery(values) : {}
  const set = (field: DeliveryFields) => (value: string) => setValues({ ...values, [field]: value })
  const problems = store?.items.some((item) => item.status !== 'ok') ?? false

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = validateDelivery(values)
    if (Object.keys(found).length > 0) {
      ;(formRef.current?.elements.namedItem(Object.keys(found)[0]) as HTMLElement | null)?.focus()
      return
    }
    setBusy(true)
    let order: Order
    try {
      order = await authFetch<Order>(orderPaths.checkout, 'POST', {
        merchantId, deliveryName: values.name.trim(), deliveryPhone: values.phone.trim(), deliveryAddress: values.address.trim(),
        deliveryCity: values.city.trim(), note: values.note.trim() || null, requestKey,
      })
    } catch (reason) {
      // Only things the website cannot know (stock changed a moment ago, server down) come from the server.
      setError(reason instanceof ApiError ? reason.message : 'Could not place your order. Please try again.')
      setBusy(false)
      return
    }
    try {
      await startPayment(authFetch, order.id, method)
    } catch (reason) {
      // The order exists and holds its stock; the customer can pay from the order page.
      onOrder(order.id, reason instanceof ApiError ? reason.message : 'Your order is saved, but the payment could not start. Please tap Pay now.')
    }
  }

  return (
    <div className="mp-checkout">
      <button type="button" className="mp-back" onClick={onBack}>Back to cart</button>
      <h2 className="mp-cart-title">Checkout</h2>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {store === undefined && !error && <p className="mp-message">Loading…</p>}
      {store === null && <p className="mp-message">There is nothing from this store in your cart any more.</p>}
      {store && (
        <form ref={formRef} className="mp-cart-body" onSubmit={(event) => void submit(event)} noValidate>
          <div className="mp-cart-stores">
            <section className="mp-panel mp-form" aria-label="Delivery details">
              <h3>Delivery details</h3>
              <p className="mp-hint">{store.merchantName} delivers this order to you.</p>
              <Field label="Full name" name="name" value={values.name} onChange={set('name')} error={errors.name} autoComplete="name" />
              <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={set('phone')} error={errors.phone}
                hint="With country code, for example +923001234567" autoComplete="tel" />
              <Field label="Address" name="address" value={values.address} onChange={set('address')} error={errors.address}
                placeholder="House, street, area" autoComplete="street-address" />
              <Field label="City" name="city" value={values.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
              <label className={errors.note ? 'auth-field invalid' : 'auth-field'}>
                Note for the store (optional)
                <textarea name="note" rows={2} value={values.note} onChange={(event) => set('note')(event.target.value)} aria-invalid={errors.note ? true : undefined} />
                {errors.note ? <span className="auth-field-error">{errors.note}</span> : <span className="auth-hint">{values.note.trim().length} / 300</span>}
              </label>
            </section>
            <section className="mp-panel" aria-label="Payment method">
              <h3>Pay with JazzCash</h3>
              <div className="mp-methods" role="radiogroup" aria-label="Payment method">
                {paymentMethods.map((option) => (
                  <button key={option.id} type="button" role="radio" aria-checked={method === option.id}
                    className={method === option.id ? 'mp-method active' : 'mp-method'} onClick={() => setMethod(option.id)}>
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>
              <p className="mp-hint">No cash on delivery. You will pay on JazzCash’s secure page and come back here.</p>
            </section>
          </div>

          <aside className="mp-panel mp-cart-summary" aria-label="Order summary">
            <h3>Your order from {store.merchantName}</h3>
            {store.items.map((item) => (
              <div key={item.id} className="mp-checkout-line">
                {item.imageUrl ? <img src={mediaUrl(item.imageUrl) ?? ''} alt="" /> : <span className="mp-noimage">No photo</span>}
                <span>
                  {item.quantity} × {item.name}
                  {(item.color || item.size) && <span className="mp-hint"> ({[item.color, item.size].filter(Boolean).join(', ')})</span>}
                </span>
                <strong>{formatPrice(item.lineTotal, 'PKR')}</strong>
              </div>
            ))}
            <p className="mp-cart-row"><span>Subtotal</span><span>{formatPrice(store.subtotal, 'PKR')}</span></p>
            <p className="mp-cart-row"><span>Delivery</span><span>Free</span></p>
            <p className="mp-cart-row total"><span>Total</span><span>{formatPrice(store.subtotal, 'PKR')}</span></p>
            {problems && <p className="mp-message error">Some items changed. Go back to your cart and fix them first.</p>}
            <button type="submit" className="mp-primary" disabled={busy || problems}>
              {busy ? 'Taking you to JazzCash…' : `Place order and pay ${formatPrice(store.subtotal, 'PKR')}`}
            </button>
            <p className="mp-hint">Your items are held for 30 minutes while you pay.</p>
          </aside>
        </form>
      )}
    </div>
  )
}
