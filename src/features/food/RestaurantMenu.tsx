// File purpose: One restaurant's page: details, menu by section, add dishes to the cart, this restaurant's cart and reviews.
import { useEffect, useState } from 'react'
import { ApiError, getJson } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { dateTime, foodPaths, money } from './foodApi'
import type { FoodCart, RestaurantDetails, RestaurantReview } from './foodApi'

type Props = {
  restaurantId: string
  cart: FoodCart | null
  onCartChange: (cart: FoodCart) => void
  onCheckout: () => void
}

export function RestaurantMenu({ restaurantId, cart, onCartChange, onCheckout }: Props) {
  const { authFetch } = useAuth()
  const [details, setDetails] = useState<RestaurantDetails | null>(null)
  const [reviews, setReviews] = useState<RestaurantReview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getJson<RestaurantDetails>(foodPaths.restaurant(restaurantId), controller.signal)
      .then((data) => { setDetails(data); setError(null) })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof ApiError && reason.status === 404 ? 'This restaurant is not available on HUB Food.'
          : reason instanceof ApiError ? reason.message : 'Could not load this restaurant.')
      })
    getJson<RestaurantReview[]>(foodPaths.reviews(restaurantId), controller.signal).then(setReviews).catch(() => undefined)
    return () => controller.abort()
  }, [restaurantId])

  const mine = cart?.carts.find((item) => item.restaurantId === restaurantId)
  const quantityOf = (menuItemId: string) => mine?.items.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0

  async function setQuantity(menuItemId: string, quantity: number) {
    setBusy(menuItemId)
    setNotice(null)
    try {
      onCartChange(await authFetch<FoodCart>(foodPaths.cartItems, 'PUT', { menuItemId, quantity: Math.max(0, Math.min(50, quantity)) }))
    } catch (reason) {
      setNotice(reason instanceof ApiError ? reason.message : 'Could not update your cart.')
    } finally {
      setBusy(null)
    }
  }

  if (error) return <div className="fd-message error" role="alert">{error}</div>
  if (!details) return <div className="fd-message">Loading…</div>
  const summary = details.summary

  return (
    <div className="fd-layout">
      <div>
        <div className="fd-panel">
          <h2>{summary.name}</h2>
          <span className={summary.open ? 'fd-tag' : 'fd-tag closed'}>{summary.open ? 'Open now' : 'Closed'}</span>
          <p className="fd-meta">
            {summary.cuisine} · {details.addressLine}, {summary.city} · {summary.rating === null ? 'No ratings yet' : `★ ${summary.rating} (${summary.ratingCount})`}
          </p>
          <p className="fd-meta">
            About {summary.deliveryMinutes} min · Delivery {summary.deliveryFee === 0 ? 'free' : money(summary.deliveryFee)}
            {summary.minimumOrder > 0 && ` · Minimum order ${money(summary.minimumOrder)}`}
          </p>
          {details.description && <p>{details.description}</p>}
          {!summary.open && <p className="fd-reason">This restaurant is closed right now. You can look at the menu, but ordering opens when it does.</p>}
        </div>
        {notice && <div className="fd-message error" role="alert">{notice}</div>}
        {details.menu.length === 0 && <div className="fd-message">This restaurant has not added its menu yet.</div>}
        {details.menu.map((category) => (
          <section key={category.id} className="fd-section" aria-label={category.name}>
            <h2>{category.name}</h2>
            <ul className="fd-dishes">
              {category.items.map((item) => {
                const quantity = quantityOf(item.id)
                return (
                  <li key={item.id} className="fd-dish">
                    <div>
                      <strong>{item.name}</strong>
                      {item.description && <p>{item.description}</p>}
                      <span className="fd-price">{money(item.price)}</span>
                    </div>
                    <div className="fd-dish-actions">
                      {!item.available ? <span className="fd-soldout">Sold out</span>
                        : quantity === 0 ? (
                          <button type="button" className="fd-primary" disabled={busy === item.id || !summary.open}
                            onClick={() => void setQuantity(item.id, 1)}>Add</button>
                        ) : (
                          <span className="fd-qty">
                            <button type="button" aria-label={`One less ${item.name}`} disabled={busy === item.id}
                              onClick={() => void setQuantity(item.id, quantity - 1)}>−</button>
                            <output aria-live="polite">{quantity}</output>
                            <button type="button" aria-label={`One more ${item.name}`} disabled={busy === item.id || quantity >= 50}
                              onClick={() => void setQuantity(item.id, quantity + 1)}>+</button>
                          </span>
                        )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {reviews.length > 0 && (
          <section className="fd-section" aria-label="Reviews">
            <h2>Reviews</h2>
            <ul className="fd-dishes">
              {reviews.map((review, index) => (
                <li key={index} className="fd-dish">
                  <div>
                    <strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong> · {review.authorName}
                    {review.comment && <p>{review.comment}</p>}
                  </div>
                  <span className="fd-meta">{dateTime(review.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="fd-panel fd-sticky" aria-label="Your order">
        <h3>Your order</h3>
        {!mine && <p className="fd-meta">Add dishes to start your order.</p>}
        {mine && (
          <>
            <ul className="fd-lines">
              {mine.items.map((line) => (
                <li key={line.menuItemId} className={line.status === 'ok' ? 'fd-line' : 'fd-line unavailable'}>
                  <span>{line.quantity} × {line.name}{line.status !== 'ok' && ' (sold out)'}</span>
                  <span>{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="fd-totals">
              <span>Subtotal</span><span>{money(mine.subtotal)}</span>
              <span>Delivery</span><span>{mine.deliveryFee === 0 ? 'Free' : money(mine.deliveryFee)}</span>
              <span className="grand">Total</span><span className="grand">{money(mine.total)}</span>
            </div>
            {mine.problem && <p className="fd-reason">{mine.problem}</p>}
            <button type="button" className="fd-primary" disabled={!mine.canCheckout} onClick={onCheckout}>Go to checkout</button>
          </>
        )}
      </aside>
    </div>
  )
}
