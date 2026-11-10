// File purpose: Entry point of the E-Commerce store on the website: store home, product page, cart, checkout and orders,
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
import { StoreHome } from './StoreHome'
import './marketplace.css'

type Props = {
  onExit?: () => void
}

type View =
  | { page: 'store' }
  | { page: 'product'; productId: string }
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
  const [view, setView] = useState<View>(firstView)
  const [cartCount, setCartCount] = useState(0)
  const [countVersion, setCountVersion] = useState(0)

  // The number on the cart button; a failure here is not worth an error message.
  useEffect(() => {
    let current = true
    authFetch<{ itemCount: number }>(cartPaths.count).then((data) => { if (current) setCartCount(data.itemCount) }).catch(() => {})
    return () => { current = false }
  }, [authFetch, countVersion])

  const open = useCallback((next: View) => {
    setView(next)
    window.scrollTo({ top: 0 })
  }, [])

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
        <ProductPage key={view.productId} productId={view.productId} onBack={() => open({ page: 'store' })}
          onCount={setCartCount} onOpenCart={() => open({ page: 'cart' })} />
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
      {/* The store stays mounted (just hidden) so "Back" keeps the customer's search, category and page. */}
      <div hidden={view.page !== 'store'}>
        <StoreHome onOpenProduct={(id) => open({ page: 'product', productId: id })} />
      </div>
    </section>
  )
}
