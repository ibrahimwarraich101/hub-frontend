// File purpose: Entry point of the E-Commerce store on the website: store home, product page and cart, with the cart
// button (and its item count) in the header. Simple in-page navigation until the common app shell arrives.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { CartPage } from './CartPage'
import { cartPaths } from './cartApi'
import { ProductPage } from './ProductPage'
import { StoreHome } from './StoreHome'
import './marketplace.css'

type Props = {
  onExit?: () => void
}

type View = { page: 'store' } | { page: 'product'; productId: string } | { page: 'cart' }

export function MarketplaceApp({ onExit }: Props) {
  const { authFetch } = useAuth()
  const [view, setView] = useState<View>({ page: 'store' })
  const [cartCount, setCartCount] = useState(0)

  // The number on the cart button; a failure here is not worth an error message.
  useEffect(() => {
    let current = true
    authFetch<{ itemCount: number }>(cartPaths.count).then((data) => { if (current) setCartCount(data.itemCount) }).catch(() => {})
    return () => { current = false }
  }, [authFetch])

  const open = useCallback((next: View) => {
    setView(next)
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <section className="mp-app" aria-label="HUB Store">
      <header className="mp-header">
        {onExit && <button type="button" className="mp-back" onClick={onExit}>Back to HUB</button>}
        <h1>HUB Store</h1>
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
        <CartPage onBack={() => open({ page: 'store' })} onOpenProduct={(id) => open({ page: 'product', productId: id })} onCount={setCartCount} />
      )}
      {/* The store stays mounted (just hidden) so "Back" keeps the customer's search, category and page. */}
      <div hidden={view.page !== 'store'}>
        <StoreHome onOpenProduct={(id) => open({ page: 'product', productId: id })} />
      </div>
    </section>
  )
}
