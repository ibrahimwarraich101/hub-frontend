// File purpose: The customer's food carts (one per restaurant) and checkout with delivery details. The delivery details
// start from the customer's last food order, so a repeat customer usually only presses "Place order".
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Field } from '../../shared/auth/AuthScreens'
import { PhoneField } from '../../shared/forms/PhoneField'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../../shared/forms/validation'
import type { FieldErrors } from '../../shared/forms/validation'
import '../../shared/auth/auth.css'
import { foodPhone, foodPaths, money, newRequestKey } from './foodApi'
import type { FoodCart, FoodOrder, FoodOrderPage, RestaurantCart } from './foodApi'
import { SavedAddressPicker } from '../../shared/account/SavedAddressPicker'
import { matchesAddress } from '../../shared/account/accountApi'
import type { Address } from '../../shared/account/accountApi'

type Props = {
  cart: FoodCart | null
  // The restaurant whose checkout form is open (null = the cart list).
  checkoutFor: string | null
  onCartChange: (cart: FoodCart) => void
  onCheckout: (restaurantId: string) => void
  onCancelCheckout: () => void
  onOrdered: (orderId: string) => void
  onBrowse: () => void
}

export function CartView({ cart, checkoutFor, onCartChange, onCheckout, onCancelCheckout, onOrdered, onBrowse }: Props) {
  const { authFetch } = useAuth()
  const [error, setError] = useState<string | null>(null)

  async function change(menuItemId: string, quantity: number) {
    setError(null)
    try {
      onCartChange(await authFetch<FoodCart>(foodPaths.cartItems, 'PUT', { menuItemId, quantity }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not update your cart.')
    }
  }

  async function clear(restaurantId: string) {
    setError(null)
    try {
      onCartChange(await authFetch<FoodCart>(foodPaths.clearCart(restaurantId), 'DELETE'))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not empty this cart.')
    }
  }

  if (!cart) return <div className="fd-message">Loading…</div>
  if (cart.carts.length === 0) {
    return (
      <div className="fd-panel">
        <h2>Your cart is empty</h2>
        <p>Find a restaurant and add some dishes.</p>
        <button type="button" className="fd-primary" onClick={onBrowse}>Browse restaurants</button>
      </div>
    )
  }

  const selected = cart.carts.find((item) => item.restaurantId === checkoutFor)
  return (
    <>
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {selected ? (
        <Checkout cart={selected} onCancel={onCancelCheckout} onOrdered={onOrdered} />
      ) : (
        cart.carts.map((restaurant) => (
          <section key={restaurant.restaurantId} className="fd-panel" aria-label={`Cart for ${restaurant.restaurantName}`}>
            <h2>{restaurant.restaurantName}</h2>
            <ul className="fd-lines">
              {restaurant.items.map((line) => (
                <li key={line.menuItemId} className={line.status === 'ok' ? 'fd-line' : 'fd-line unavailable'}>
                  <span>{line.name}{line.status !== 'ok' && ' (sold out)'} · {money(line.unitPrice)}</span>
                  <span className="fd-actions">
                    <span className="fd-qty">
                      <button type="button" aria-label={`One less ${line.name}`} onClick={() => void change(line.menuItemId, line.quantity - 1)}>−</button>
                      <output>{line.quantity}</output>
                      <button type="button" aria-label={`One more ${line.name}`} disabled={line.status !== 'ok' || line.quantity >= 50}
                        onClick={() => void change(line.menuItemId, line.quantity + 1)}>+</button>
                    </span>
                    <strong>{money(line.lineTotal)}</strong>
                  </span>
                </li>
              ))}
            </ul>
            <Totals cart={restaurant} />
            {restaurant.problem && <p className="fd-reason">{restaurant.problem}</p>}
            <div className="fd-actions">
              <button type="button" className="fd-primary" disabled={!restaurant.canCheckout} onClick={() => onCheckout(restaurant.restaurantId)}>
                Checkout
              </button>
              <button type="button" className="fd-secondary" onClick={() => void clear(restaurant.restaurantId)}>Empty cart</button>
            </div>
          </section>
        ))
      )}
    </>
  )
}

function Totals({ cart }: { cart: RestaurantCart }) {
  return (
    <div className="fd-totals">
      <span>Subtotal</span><span>{money(cart.subtotal)}</span>
      <span>Delivery fee</span><span>{cart.deliveryFee === 0 ? 'Free' : money(cart.deliveryFee)}</span>
      <span className="grand">Total</span><span className="grand">{money(cart.total)}</span>
    </div>
  )
}

type CheckoutFields = 'deliveryName' | 'deliveryPhone' | 'deliveryAddress' | 'deliveryCity' | 'note'

// Same rules as the backend's FoodCheckoutRequest.
function validate(values: Record<CheckoutFields, string>): FieldErrors<CheckoutFields> {
  return collect({
    deliveryName: firstError(rules.required(values.deliveryName, 'name'), rules.minLength(values.deliveryName.trim(), 2, 'Name'),
      rules.maxLength(values.deliveryName.trim(), 100, 'Name')),
    deliveryPhone: firstError(rules.required(values.deliveryPhone, 'phone number'), rules.phone(foodPhone(values.deliveryPhone))),
    deliveryAddress: firstError(rules.required(values.deliveryAddress, 'delivery address'), rules.minLength(values.deliveryAddress.trim(), 5, 'Address'),
      rules.maxLength(values.deliveryAddress.trim(), 300, 'Address')),
    deliveryCity: firstError(rules.required(values.deliveryCity, 'city'), rules.minLength(values.deliveryCity.trim(), 2, 'City'),
      rules.maxLength(values.deliveryCity.trim(), 60, 'City')),
    note: rules.maxLength(values.note.trim(), 300, 'Note for the restaurant'),
  })
}

function Checkout({ cart, onCancel, onOrdered }: { cart: RestaurantCart; onCancel: () => void; onOrdered: (orderId: string) => void }) {
  const { authFetch, user } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  // One key per checkout screen: pressing the button twice cannot create two orders.
  const requestKey = useRef(newRequestKey())
  const [values, setValues] = useState({ deliveryName: user?.fullName ?? '', deliveryPhone: user?.phone ?? '', deliveryAddress: '', deliveryCity: '', note: '' })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromLastOrder, setFromLastOrder] = useState(false)
  const errors = tried ? validate(values) : {}
  // Once the customer types, nothing is filled in for them any more.
  const typed = useRef(false)
  const set = (field: CheckoutFields) => (value: string) => { typed.current = true; setValues((current) => ({ ...current, [field]: value })) }

  // A saved address from My account fills address, city and phone. The default one is used when the page opens
  // (before the customer types), and it is preferred over the last order's address.
  const [savedAddress, setSavedAddress] = useState<Address | null>(null)
  const fillFromSaved = (address: Address, automatic = false) => {
    if (automatic && typed.current) return
    setValues((current) => ({ ...current, deliveryAddress: address.addressLine, deliveryCity: address.city, deliveryPhone: address.contactPhone }))
    setSavedAddress(address)
  }
  const selectedAddress = savedAddress && matchesAddress(savedAddress, values.deliveryAddress, values.deliveryCity, values.deliveryPhone)
    ? savedAddress.id : null

  // Start from the delivery details of the last food order (only fields the customer has not typed in yet).
  useEffect(() => {
    let cancelled = false
    authFetch<FoodOrderPage>(foodPaths.myOrders(1))
      .then((page) => page.items[0] ? authFetch<FoodOrder>(foodPaths.order(page.items[0].id)) : null)
      .then((last) => {
        if (cancelled || !last) return
        const saved = { deliveryName: last.delivery.name, deliveryPhone: last.delivery.phone, deliveryAddress: last.delivery.address,
          deliveryCity: last.delivery.city }
        setValues((current) => ({
          ...current,
          deliveryName: current.deliveryName.trim() && current.deliveryName !== (user?.fullName ?? '') ? current.deliveryName : saved.deliveryName,
          deliveryPhone: current.deliveryPhone.trim() && current.deliveryPhone !== (user?.phone ?? '') ? current.deliveryPhone : saved.deliveryPhone,
          deliveryAddress: current.deliveryAddress.trim() ? current.deliveryAddress : saved.deliveryAddress,
          deliveryCity: current.deliveryCity.trim() ? current.deliveryCity : saved.deliveryCity,
        }))
        setFromLastOrder(true)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [authFetch, user])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = validate(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    setBusy(true)
    try {
      const order = await authFetch<FoodOrder>(foodPaths.orders, 'POST', {
        restaurantId: cart.restaurantId, requestKey: requestKey.current, deliveryName: values.deliveryName.trim(),
        deliveryPhone: foodPhone(values.deliveryPhone), deliveryAddress: values.deliveryAddress.trim(), deliveryCity: values.deliveryCity.trim(),
        note: values.note.trim() || null,
      })
      onOrdered(order.id)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not place your order. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} className="fd-panel fd-form" onSubmit={submit} noValidate>
      <h2>Checkout · {cart.restaurantName}</h2>
      <ul className="fd-lines">
        {cart.items.map((line) => (
          <li key={line.menuItemId} className="fd-line"><span>{line.quantity} × {line.name}</span><span>{money(line.lineTotal)}</span></li>
        ))}
      </ul>
      <Totals cart={cart} />
      <h3>Delivery details</h3>
      <SavedAddressPicker selectedId={selectedAddress} onPick={(address) => fillFromSaved(address)} onDefault={(address) => fillFromSaved(address, true)} />
      {fromLastOrder && !savedAddress && <p className="fd-meta">Filled in from your last order. Change anything that is different this time.</p>}
      <Field label="Name" name="deliveryName" value={values.deliveryName} onChange={set('deliveryName')} error={errors.deliveryName} autoComplete="name" />
      <PhoneField label="Phone" name="deliveryPhone" value={values.deliveryPhone} onChange={set('deliveryPhone')} error={errors.deliveryPhone}
        hint="The restaurant calls this number when delivering." />
      <Field label="Address" name="deliveryAddress" value={values.deliveryAddress} onChange={set('deliveryAddress')} error={errors.deliveryAddress}
        autoComplete="street-address" placeholder="House, street, area" />
      <Field label="City" name="deliveryCity" value={values.deliveryCity} onChange={set('deliveryCity')} error={errors.deliveryCity} autoComplete="address-level2" />
      <label className={errors.note ? 'auth-field invalid' : 'auth-field'}>
        Note for the restaurant (optional)
        <textarea name="note" rows={2} value={values.note} onChange={(e) => set('note')(e.target.value)} placeholder="For example: no onions" />
        {errors.note && <span className="auth-field-error">{errors.note}</span>}
      </label>
      <p className="fd-meta">After placing the order you will be asked to pay. Unpaid orders are cancelled after 15 minutes.</p>
      {error && <p className="fd-message error" role="alert">{error}</p>}
      <div className="fd-actions">
        <button type="submit" className="fd-primary" disabled={busy}>{busy ? 'Placing order…' : `Place order · ${money(cart.total)}`}</button>
        <button type="button" className="fd-secondary" onClick={onCancel} disabled={busy}>Back</button>
      </div>
    </form>
  )
}
