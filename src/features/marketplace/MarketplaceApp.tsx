// File purpose: Entry point of the E-Commerce store on the website: store home, shop pages, product page, cart, checkout and orders,
// with "My orders" and "Cart" in the header. Coming back from JazzCash opens the paid order with its result.
// Simple in-page navigation until the common app shell arrives.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { CartPage } from './CartPage'
import { cartPaths } from './cartApi'
import { CheckoutPage } from './CheckoutPage'
import { OrderDetails, OrdersList } from './OrdersPage'
import { clearPaymentReturn, readPaymentReturn } from './payment'
import { ProductPage } from './ProductPage'
import { ShopPage } from './ShopPage'
import { StoreHome } from './StoreHome'
import './marketplace.css'

type Props = {
  onExit?: () => void
}

type View =
  | { page: 'store' }
  | { page: 'product'; productId: string }
  | { page: 'shop'; merchantId: string }
  | { page: 'cart' }
  | { page: 'checkout'; merchantId: string }
  | { page: 'orders' }
  | { page: 'order'; orderId: string; paymentResult: string | null; message: string | null }

function firstView(): View {
  // JazzCash sends the customer back with ?order=...&payment=...
  const back = readPaymentReturn()
  if (!back) return { page: 'store' }
  clearPaymentReturn()
  return { page: 'order', orderId: back.orderId, paymentResult: back.result, message: null }
}

export function MarketplaceApp({ onExit }: Props) {
  const { authFetch } = useAuth()
  // Pages visited since the store home, so "Back" returns to where the customer came from (e.g. a shop).
  const [history, setHistory] = useState<View[]>(() => [firstView()])
  const view = history[history.length - 1]!
  const [cartCount, setCartCount] = useState(0)
  const [countVersion, setCountVersion] = useState(0)

  // The number on the cart button; a failure here is not worth an error message.
  useEffect(() => {
    let current = true
    authFetch<{ itemCount: number }>(cartPaths.count).then((data) => { if (current) setCartCount(data.itemCount) }).catch(() => {})
    return () => { current = false }
  }, [authFetch, countVersion])

  const open = useCallback((next: View) => {
    // Opening the store home starts over; anything else is added on top.
    setHistory((pages) => next.page === 'store' ? [next] : [...pages.slice(-19), next])
    window.scrollTo({ top: 0 })
  }, [])

  const back = useCallback(() => {
    setHistory((pages) => pages.length > 1 ? pages.slice(0, -1) : [{ page: 'store' }])
    window.scrollTo({ top: 0 })
  }, [])

  // The shop page stays mounted while a product opened from it is shown, so "Back" keeps its search and page.
  const shopView = [...history].reverse().find((page): page is { page: 'shop'; merchantId: string } => page.page === 'shop')
  const previous = history[history.length - 2]

  return (
    <section className="mp-app" aria-label="HUB Store">
      <header className="mp-header">
        {onExit && <button type="button" className="mp-back" onClick={onExit}>Back to HUB</button>}
        <h1>HUB Store</h1>
        <button type="button" className="mp-back mp-header-link" onClick={() => open({ page: 'orders' })}>My orders</button>
        <button type="button" className={view.page === 'cart' ? 'mp-cart-button active' : 'mp-cart-button'} onClick={() => open({ page: 'cart' })}
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
          Cart<span className="mp-cart-count">{cartCount}</span>
        </button>
      </header>
      {view.page === 'product' && (
        <ProductPage key={view.productId} productId={view.productId} onBack={back}
          backLabel={previous?.page === 'shop' ? 'Back to shop' : previous?.page === 'cart' ? 'Back to cart' : 'Back to store'}
          onCount={setCartCount} onOpenCart={() => open({ page: 'cart' })} onOpenShop={(merchantId) => open({ page: 'shop', merchantId })} />
      )}
      {view.page === 'cart' && (
        <CartPage onBack={() => open({ page: 'store' })} onOpenProduct={(id) => open({ page: 'product', productId: id })} onCount={setCartCount}
          onCheckout={(merchantId) => open({ page: 'checkout', merchantId })} />
      )}
      {view.page === 'checkout' && (
        <CheckoutPage merchantId={view.merchantId} onBack={() => open({ page: 'cart' })}
          onOrder={(orderId, message) => { setCountVersion((value) => value + 1); open({ page: 'order', orderId, paymentResult: null, message }) }} />
      )}
      {view.page === 'orders' && <OrdersList onBack={() => open({ page: 'store' })} onOpen={(id) => open({ page: 'order', orderId: id, paymentResult: null, message: null })} />}
      {view.page === 'order' && (
        <OrderDetails key={view.orderId} orderId={view.orderId} paymentResult={view.paymentResult} startMessage={view.message} onBack={() => open({ page: 'orders' })} />
      )}
      {shopView && (
        <div hidden={view.page !== 'shop'}>
          <ShopPage key={shopView.merchantId} merchantId={shopView.merchantId} onBack={back}
            onOpenProduct={(id) => open({ page: 'product', productId: id })} />
        </div>
      )}
      {/* The store stays mounted (just hidden) so "Back" keeps the customer's search, category and page. */}
      <div hidden={view.page !== 'store'}>
        <StoreHome onOpenProduct={(id) => open({ page: 'product', productId: id })} onOpenShop={(merchantId) => open({ page: 'shop', merchantId })} />
      </div>
    </section>
  )
}
