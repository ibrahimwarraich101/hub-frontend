// File purpose: HUB Food for customers: browse restaurants, open a menu, cart and checkout, and track orders.
// Screens switch inside this component, and the current one is kept in the address (#food, #food/restaurant/<id>,
// #food/cart, #food/checkout/<restaurant id>, #food/orders, #food/order/<id>), so Refresh and the browser's Back button work. The header's Back button
// goes back one step, or up to the parent screen when the page was opened directly.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { CartView } from './CartView'
import { foodPaths } from './foodApi'
import type { FoodCart } from './foodApi'
import { enterSection, foodDepth, goTo, leaveSection, sectionPath, useSectionHistory } from './foodRoute'
import { OrderDetails } from './OrderDetails'
import { OrdersView } from './OrdersView'
import { RestaurantList } from './RestaurantList'
import { RestaurantMenu } from './RestaurantMenu'
import './food.css'

type View =
  | { kind: 'home' }
  | { kind: 'restaurant'; id: string }
  | { kind: 'cart' }
  | { kind: 'checkout'; id: string }
  | { kind: 'orders' }
  | { kind: 'order'; id: string }

type Props = { onExit: () => void }

const SECTION = 'food'

// "restaurant/<id>" -> the restaurant screen; anything unknown -> the Food home.
function readView(path: string | null): View {
  const [kind, id] = (path ?? '').split('/')
  if (kind === 'restaurant' && id) return { kind: 'restaurant', id: decodeURIComponent(id) }
  if (kind === 'order' && id) return { kind: 'order', id: decodeURIComponent(id) }
  if (kind === 'checkout' && id) return { kind: 'checkout', id: decodeURIComponent(id) }
  if (kind === 'cart') return { kind: 'cart' }
  if (kind === 'orders') return { kind: 'orders' }
  return { kind: 'home' }
}

function pathOf(view: View): string {
  if (view.kind === 'restaurant' || view.kind === 'order' || view.kind === 'checkout') return `${view.kind}/${encodeURIComponent(view.id)}`
  return view.kind === 'home' ? '' : view.kind
}

// Where the header's Back button goes when there is no earlier Food screen to return to.
function parentOf(view: View): View {
  if (view.kind === 'order') return { kind: 'orders' }
  return view.kind === 'checkout' ? { kind: 'restaurant', id: view.id } : { kind: 'home' }
}

const backLabel: Record<View['kind'], string> = {
  home: '← HUB', restaurant: '← Back', cart: '← Back', checkout: '← Back', orders: '← Back', order: '← Back',
}

export function FoodApp({ onExit }: Props) {
  const { authFetch } = useAuth()
  const [view, setView] = useState<View>(() => readView(sectionPath(SECTION)))
  const [cart, setCart] = useState<FoodCart | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)

  useEffect(() => { enterSection(SECTION, pathOf(readView(sectionPath(SECTION)))) }, [])

  const exit = useCallback(() => { leaveSection(); onExit() }, [onExit])
  useSectionHistory(SECTION, useCallback((path: string | null) => {
    if (path === null) onExit()
    else { setView(readView(path)); window.scrollTo({ top: 0 }) }
  }, [onExit]))

  const refreshCart = useCallback(() => {
    authFetch<FoodCart>(foodPaths.cart)
      .then((data) => { setCart(data); setCartError(null) })
      .catch((reason: unknown) => setCartError(reason instanceof ApiError ? reason.message : 'Could not load your cart.'))
  }, [authFetch])

  useEffect(() => { refreshCart() }, [refreshCart])

  // replace: swap the current screen instead of adding a step (used after placing an order, so Back skips checkout).
  const go = (next: View, replace = false) => {
    goTo(SECTION, pathOf(next), replace)
    setView(next)
    window.scrollTo({ top: 0 })
  }

  function back() {
    if (view.kind === 'home') return exit()
    if (foodDepth() > 1) return history.back()
    go(parentOf(view), true)
  }

  const count = cart?.itemCount ?? 0
  return (
    <section className="fd-app" aria-label="HUB Food">
      <header className="fd-header">
        <button type="button" className="fd-back" onClick={back}>{backLabel[view.kind]}</button>
        <h1>HUB Food</h1>
        <button type="button" className="fd-link" aria-current={view.kind === 'orders' ? 'page' : undefined}
          onClick={() => view.kind !== 'orders' && go({ kind: 'orders' })}>My orders</button>
        <button type="button" className="fd-cart-button" onClick={() => view.kind !== 'cart' && go({ kind: 'cart' })} aria-label={`Cart, ${count} items`}>
          🛒 Cart <span className="fd-cart-count">{count}</span>
        </button>
      </header>
      {cartError && <div className="fd-message error" role="alert">{cartError}</div>}

      {view.kind === 'home' && <RestaurantList onOpen={(id) => go({ kind: 'restaurant', id })} />}
      {view.kind === 'restaurant' && (
        <RestaurantMenu restaurantId={view.id} cart={cart} onCartChange={setCart} onCheckout={() => go({ kind: 'checkout', id: view.id })} />
      )}
      {(view.kind === 'cart' || view.kind === 'checkout') && (
        <CartView cart={cart} checkoutFor={view.kind === 'checkout' ? view.id : null} onCartChange={setCart}
          onCheckout={(id) => go({ kind: 'checkout', id })} onCancelCheckout={back}
          onOrdered={(id) => { refreshCart(); go({ kind: 'order', id }, true) }} onBrowse={() => go({ kind: 'home' })} />
      )}
      {view.kind === 'orders' && <OrdersView onOpen={(id) => go({ kind: 'order', id })} />}
      {view.kind === 'order' && <OrderDetails orderId={view.id} />}
    </section>
  )
}
