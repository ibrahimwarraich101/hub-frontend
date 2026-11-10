// File purpose: The customer's cart on the website: items grouped by store, quantity, remove, live prices, problems and totals.
import { useCallback, useEffect, useState } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { formatPrice } from './api'
import { cartPaths, maxCartQuantity } from './cartApi'
import type { Cart, CartItem } from './cartApi'

type Props = {
  onBack: () => void
  onOpenProduct: (id: string) => void
  // Tells the store header the new number of items.
  onCount: (count: number) => void
}

export function CartPage({ onBack, onOpenProduct, onCount }: Props) {
  const { authFetch } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Line being saved, and a message for one line (e.g. "Only 2 available").
  const [busy, setBusy] = useState<string | null>(null)
  const [lineError, setLineError] = useState<{ id: string; message: string } | null>(null)
  // Line waiting for a second click to confirm removing it.
  const [confirming, setConfirming] = useState<string | null>(null)

  const show = useCallback((next: Cart) => { setCart(next); onCount(next.itemCount) }, [onCount])

  useEffect(() => {
    let current = true
    authFetch<Cart>(cartPaths.cart)
      .then((data) => { if (current) { show(data); setError(null) } })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your cart.') })
    return () => { current = false }
  }, [authFetch, show])

  async function change(item: CartItem, action: () => Promise<Cart>) {
    setBusy(item.id)
    setLineError(null)
    setConfirming(null)
    try {
      show(await action())
    } catch (reason) {
      // Only things the website cannot know (stock changed a moment ago, server down) come from the server.
      setLineError({ id: item.id, message: reason instanceof ApiError ? reason.message : 'That did not work. Please try again.' })
    } finally {
      setBusy(null)
    }
  }

  const setQuantity = (item: CartItem, quantity: number) =>
    change(item, () => authFetch<Cart>(cartPaths.item(item.id), 'PUT', { quantity }))
  const remove = (item: CartItem) => change(item, () => authFetch<Cart>(cartPaths.item(item.id), 'DELETE'))

  return (
    <div className="mp-cart">
      <button type="button" className="mp-back" onClick={onBack}>Back to store</button>
      <h2 className="mp-cart-title">Your cart</h2>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {!cart && !error && <p className="mp-message">Loading your cart…</p>}
      {cart && cart.stores.length === 0 && (
        <div className="mp-panel mp-cart-empty">
          <p>Your cart is empty.</p>
          <button type="button" className="mp-primary" onClick={onBack}>Start shopping</button>
        </div>
      )}

      {cart && cart.stores.length > 0 && (
        <div className="mp-cart-body">
          <div className="mp-cart-stores">
            {cart.stores.map((store) => (
              <section key={store.merchantId} className="mp-panel mp-cart-store" aria-label={store.merchantName}>
                <div className="mp-cart-store-head">
                  <h3>{store.merchantName}</h3>
                  <span className="mp-hint">Delivered by this store</span>
                </div>
                {store.items.map((item) => {
                  const max = Math.min(item.available ?? maxCartQuantity, maxCartQuantity)
                  const option = [item.color, item.size].filter(Boolean).join(', ')
                  const working = busy === item.id
                  return (
                    <div key={item.id} className={item.status === 'ok' ? 'mp-cart-line' : 'mp-cart-line problem'}>
                      <button type="button" className="mp-cart-photo" onClick={() => onOpenProduct(item.productId)} aria-label={`Open ${item.name}`}>
                        {item.imageUrl ? <img src={mediaUrl(item.imageUrl) ?? ''} alt="" /> : <span className="mp-noimage">No photo</span>}
                      </button>
                      <div className="mp-cart-info">
                        <strong>{item.name}</strong>
                        {option && <span className="mp-hint">{option}</span>}
                        <span className="mp-price">
                          {formatPrice(item.unitPrice, cart.currency)}
                          {item.unitPrice < item.originalPrice && <s>{formatPrice(item.originalPrice, cart.currency)}</s>}
                        </span>
                        {item.message && <span className="mp-choice-error">{item.message}</span>}
                        {lineError?.id === item.id && <span className="mp-choice-error" role="alert">{lineError.message}</span>}
                      </div>
                      <div className="mp-cart-actions">
                        {item.status !== 'unavailable' && item.status !== 'sold-out' && (
                          <div className="mp-quantity" aria-label={`Quantity of ${item.name}`}>
                            <button type="button" disabled={working || item.quantity <= 1} onClick={() => void setQuantity(item, item.quantity - 1)}
                              aria-label={`One less ${item.name}`}>−</button>
                            <output aria-live="polite">{item.quantity}</output>
                            <button type="button" disabled={working || item.quantity >= max} onClick={() => void setQuantity(item, item.quantity + 1)}
                              aria-label={`One more ${item.name}`}>+</button>
                          </div>
                        )}
                        {item.status === 'not-enough-stock' && item.available !== null && item.available > 0 && (
                          <button type="button" className="mp-link" disabled={working} onClick={() => void setQuantity(item, item.available!)}>
                            Change to {item.available}
                          </button>
                        )}
                        <span className="mp-cart-line-total">{item.status === 'ok' ? formatPrice(item.lineTotal, cart.currency) : 'Not counted'}</span>
                        {confirming === item.id ? (
                          <button type="button" className="mp-danger mp-small" disabled={working} onClick={() => void remove(item)}>Sure? Remove</button>
                        ) : (
                          <button type="button" className="mp-link" disabled={working} onClick={() => setConfirming(item.id)}
                            aria-label={`Remove ${item.name}`}>Remove</button>
                        )}
                      </div>
                    </div>
                  )
                })}
                <p className="mp-cart-subtotal">Store subtotal <strong>{formatPrice(store.subtotal, cart.currency)}</strong></p>
              </section>
            ))}
          </div>

          <aside className="mp-panel mp-cart-summary" aria-label="Order summary">
            <h3>Summary</h3>
            <p className="mp-cart-row"><span>Items</span><span>{cart.itemCount}</span></p>
            {cart.stores.map((store) => (
              <p key={store.merchantId} className="mp-cart-row"><span>{store.merchantName}</span><span>{formatPrice(store.subtotal, cart.currency)}</span></p>
            ))}
            <p className="mp-cart-row total"><span>Total</span><span>{formatPrice(cart.total, cart.currency)}</span></p>
            <p className="mp-hint">Each store delivers its own items.</p>
            {cart.hasProblems && <p className="mp-message error">Some items need your attention. Change or remove them before checkout.</p>}
            <button type="button" className="mp-primary" disabled>Checkout</button>
            <p className="mp-hint">Checkout and payment are the next E-Commerce feature.</p>
          </aside>
        </div>
      )}
    </div>
  )
}
