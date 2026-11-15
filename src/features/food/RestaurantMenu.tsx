// File purpose: One restaurant's page (same layout as the app): cover photo and logo, delivery details (shown once), menu
// search and section tabs, dishes with photos and a + button, reviews, and this restaurant's cart beside the menu (on a
// narrow screen, a bar fixed to the bottom with the total and "Go to checkout").
import { useEffect, useState } from 'react'
import { ApiError, getJson, mediaUrl } from '../../shared/api/client'
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
  // A cart problem is shown under the dish that was tapped.
  const [dishError, setDishError] = useState<{ id: string; text: string } | null>(null)
  const [menuText, setMenuText] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)

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
  const itemCount = mine?.items.reduce((sum, line) => sum + line.quantity, 0) ?? 0
  const quantityOf = (menuItemId: string) => mine?.items.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0

  async function setQuantity(menuItemId: string, quantity: number) {
    setBusy(menuItemId)
    setDishError(null)
    try {
      onCartChange(await authFetch<FoodCart>(foodPaths.cartItems, 'PUT', { menuItemId, quantity: Math.max(0, Math.min(50, quantity)) }))
    } catch (reason) {
      setDishError({ id: menuItemId, text: reason instanceof ApiError ? reason.message : 'Could not update your cart. Please try again.' })
    } finally {
      setBusy(null)
    }
  }

  if (error) return <div className="fd-message error" role="alert">{error}</div>
  if (!details) return <div className="fd-message">Loading…</div>
  const summary = details.summary
  // The "Search menu" box narrows every section; empty sections are hidden.
  const text = menuText.trim().toLowerCase()
  const sections = details.menu
    .map((category) => ({ ...category, items: category.items.filter((item) => !text
      || item.name.toLowerCase().includes(text) || item.description.toLowerCase().includes(text)) }))
    .filter((category) => category.items.length > 0)
  const jumpTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(`fd-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="fd-layout">
      <div>
        <div className="fd-hero">
          {summary.coverUrl ? <img src={mediaUrl(summary.coverUrl) ?? ''} alt="" /> : <div className="fd-cover-empty" />}
          {summary.logoUrl && <img className="fd-logo" src={mediaUrl(summary.logoUrl) ?? ''} alt="" />}
        </div>
        <div className="fd-intro">
          <h2>{summary.name}</h2>
          <span className="fd-rating-line">
            <span className="fd-rating">★ {summary.rating === null ? 'New' : summary.rating}</span>
            {' '}{summary.rating === null ? '· no ratings yet' : `(${summary.ratingCount} ratings)`} · {summary.cuisine}
          </span>
          <span className={summary.open ? 'fd-tag' : 'fd-tag closed'}>{summary.open ? '● Open now' : '● Closed'}</span>
          <div className="fd-deliverybox">
            <strong>Delivery {summary.deliveryMinutes}–{summary.deliveryMinutes + 15} min</strong>
            <span className="fd-meta">
              {summary.deliveryFee === 0 ? 'Free delivery' : `${money(summary.deliveryFee)} delivery`}
              {summary.minimumOrder > 0 ? ` · Min. order ${money(summary.minimumOrder)}` : ' · No minimum order'}
              {' · Delivered by the restaurant\'s own riders'}
            </span>
            <span className="fd-meta">📍 {details.addressLine}, {summary.city}</span>
            {details.description && <span className="fd-meta">{details.description}</span>}
          </div>
        </div>
        {!summary.open && <div className="fd-message warn" role="status">This restaurant is closed right now. You can look at the menu, but ordering opens when it does.</div>}
        {details.menu.length === 0 && <div className="fd-message">This restaurant has not added its menu yet.</div>}

        {details.menu.length > 0 && (
          <div className="fd-menubar">
            <input type="search" aria-label="Search this menu" placeholder="Search this menu" value={menuText} maxLength={60}
              onChange={(e) => setMenuText(e.target.value)} />
            <nav className="fd-section-tabs" aria-label="Menu sections">
              {sections.map((category, index) => (
                <button key={category.id} type="button"
                  className={activeSection === category.id || (activeSection === null && index === 0) ? 'active' : ''}
                  onClick={() => jumpTo(category.id)}>{category.name}</button>
              ))}
            </nav>
          </div>
        )}
        {details.menu.length > 0 && sections.length === 0 && <div className="fd-message">No dishes match “{menuText}”.</div>}

        {sections.map((category) => (
          <section key={category.id} id={`fd-section-${category.id}`} className="fd-section" aria-label={category.name}>
            <h2>{category.name}</h2>
            <ul className="fd-dishes">
              {category.items.map((item) => {
                const quantity = quantityOf(item.id)
                return (
                  <li key={item.id} className={item.available ? 'fd-dish' : 'fd-dish soldout'}>
                    <div className="fd-dish-text">
                      <strong>{item.name}</strong>
                      <span className="fd-price">{money(item.price)}</span>
                      {item.description && <p>{item.description}</p>}
                      {dishError?.id === item.id && <p className="fd-message error fd-dish-error" role="alert">{dishError.text}</p>}
                    </div>
                    <div className="fd-dish-media">
                      {item.imageUrl ? <img className="fd-dish-photo" src={mediaUrl(item.imageUrl) ?? ''} alt="" loading="lazy" />
                        : <div className="fd-dish-photo" />}
                      {!item.available ? <span className="fd-soldout">Sold out</span>
                        : quantity === 0 ? (
                          <button type="button" className="fd-add" aria-label={`Add ${item.name}`} disabled={busy === item.id || !summary.open}
                            onClick={() => void setQuantity(item.id, 1)}>+</button>
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
                  <div className="fd-dish-text">
                    <strong><span className="fd-rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span> · {review.authorName}</strong>
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
      {mine && (
        <div className="fd-mobilecart" role="region" aria-label="Your order">
          <span>
            <strong>{itemCount} {itemCount === 1 ? 'item' : 'items'} · {money(mine.total)}</strong>
            {mine.problem && <span className="fd-meta">{mine.problem}</span>}
          </span>
          <button type="button" className="fd-primary" disabled={!mine.canCheckout} onClick={onCheckout}>Go to checkout</button>
        </div>
      )}
    </div>
  )
}
