// File purpose: HUB Food for customers: browse restaurants, open a menu, cart and checkout, and track orders.
// Screens switch inside this component (no router yet), like the E-Commerce module.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { CartView } from './CartView'
import { foodPaths } from './foodApi'
import type { FoodCart } from './foodApi'
import { OrderDetails } from './OrderDetails'
import { OrdersView } from './OrdersView'
import { RestaurantList } from './RestaurantList'
import { RestaurantMenu } from './RestaurantMenu'
import './food.css'

type View =
  | { kind: 'home' }
  | { kind: 'restaurant'; id: string }
  | { kind: 'cart' }
  | { kind: 'orders' }
  | { kind: 'order'; id: string }

type Props = { onExit: () => void }

export function FoodApp({ onExit }: Props) {
  const { authFetch } = useAuth()
  const [view, setView] = useState<View>({ kind: 'home' })
  const [cart, setCart] = useState<FoodCart | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)

  const refreshCart = useCallback(() => {
    authFetch<FoodCart>(foodPaths.cart)
      .then((data) => { setCart(data); setCartError(null) })
      .catch((reason: unknown) => setCartError(reason instanceof ApiError ? reason.message : 'Could not load your cart.'))
  }, [authFetch])

  useEffect(() => { refreshCart() }, [refreshCart])

  const home = () => setView({ kind: 'home' })
  const count = cart?.itemCount ?? 0

  return (
    <section className="fd-app" aria-label="HUB Food">
      <header className="fd-header">
        <button type="button" className="fd-back" onClick={view.kind === 'home' ? onExit : home}>
          {view.kind === 'home' ? '← HUB' : '← Restaurants'}
        </button>
        <h1>HUB Food</h1>
        <button type="button" className="fd-link" onClick={() => setView({ kind: 'orders' })}>My orders</button>
        <button type="button" className="fd-cart-button" onClick={() => setView({ kind: 'cart' })} aria-label={`Cart, ${count} items`}>
          Cart · {count}
        </button>
      </header>
      {cartError && <div className="fd-message error" role="alert">{cartError}</div>}

      {view.kind === 'home' && <RestaurantList onOpen={(id) => setView({ kind: 'restaurant', id })} />}
      {view.kind === 'restaurant' && (
        <RestaurantMenu restaurantId={view.id} cart={cart} onCartChange={setCart} onCheckout={() => setView({ kind: 'cart' })} />
      )}
      {view.kind === 'cart' && (
        <CartView cart={cart} onCartChange={setCart} onOrdered={(id) => { refreshCart(); setView({ kind: 'order', id }) }}
          onBrowse={home} />
      )}
      {view.kind === 'orders' && <OrdersView onOpen={(id) => setView({ kind: 'order', id })} />}
      {view.kind === 'order' && <OrderDetails orderId={view.id} onBack={() => setView({ kind: 'orders' })} />}
    </section>
  )
}
