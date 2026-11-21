// File purpose: Entry point of the E-Commerce store on the website: store home, shop pages, product page, cart, checkout and orders,
// shown inside the HUB frame with the store's bar (Back, "HUB Store", Shop, My orders, Cart). Coming back from the payment page opens the paid order.
// The current page is kept in the address (#store, #store/product/<id>, #store/shop/<id>, #store/cart, #store/checkout/<shop id>,
// #store/orders, #store/order/<id>), so Refresh and the browser's Back button work.
// Visitors who are not logged in can browse the store and products; the cart, checkout and orders ask them to sign in.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useSignInRequest } from '../../shared/auth/GuestContext'
import { SignInNeeded } from '../../shared/auth/SignInNeeded'
import { confirmLeave, hasUnsavedChanges } from '../../shared/forms/unsavedChanges'
import { ModuleBar } from '../../shared/layout/AppShell'
import { enterSection, goTo, sectionDepth, sectionPath, useSectionHistory } from '../../shared/layout/sectionRoute'
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
  // Only for sellers: opens their Seller Center from the store's bar.
  onSellerCenter?: () => void
}

type View =
  | { page: 'store' }
  | { page: 'product'; productId: string }
  | { page: 'shop'; merchantId: string }
  | { page: 'cart' }
  | { page: 'checkout'; merchantId: string }
  | { page: 'orders' }
  | { page: 'order'; orderId: string; paymentResult: string | null; message: string | null }

const SECTION = 'store'

// "product/<id>" -> the product page; anything unknown -> the store home.
function readView(path: string | null): View {
  const [page, rawId] = (path ?? '').split('/')
  const id = rawId ? decodeURIComponent(rawId) : ''
  if (page === 'product' && id) return { page: 'product', productId: id }
  if (page === 'shop' && id) return { page: 'shop', merchantId: id }
  if (page === 'checkout' && id) return { page: 'checkout', merchantId: id }
  if (page === 'order' && id) return { page: 'order', orderId: id, paymentResult: null, message: null }
  if (page === 'cart') return { page: 'cart' }
  if (page === 'orders') return { page: 'orders' }
  return { page: 'store' }
}

function pathOf(view: View): string {
  switch (view.page) {
    case 'product': return `product/${encodeURIComponent(view.productId)}`
    case 'shop': return `shop/${encodeURIComponent(view.merchantId)}`
    case 'checkout': return `checkout/${encodeURIComponent(view.merchantId)}`
    case 'order': return `order/${encodeURIComponent(view.orderId)}`
    case 'store': return ''
    default: return view.page
  }
}

// Where Back goes when there is no earlier store page to return to (e.g. the page was opened by Refresh).
function parentOf(view: View): View {
  if (view.page === 'checkout') return { page: 'cart' }
  if (view.page === 'order') return { page: 'orders' }
  return { page: 'store' }
}

function sameView(a: View, b: View) {
  return pathOf(a) === pathOf(b)
}

function firstView(): View {
  // The payment page sends the customer back with ?order=...&payment=...
  const back = readPaymentReturn()
  if (!back) return readView(sectionPath(SECTION))
  clearPaymentReturn()
  return { page: 'order', orderId: back.orderId, paymentResult: back.result, message: null }
}

export function MarketplaceApp({ onExit, onSellerCenter }: Props) {
  const { authFetch, user } = useAuth()
  const askSignIn = useSignInRequest()
  // Pages visited since the store home, so the shop page can stay mounted (keeping its search) under a product opened from it.
  const [history, setHistory] = useState<View[]>(() => [firstView()])
  const view = history[history.length - 1]!
  const [cartCount, setCartCount] = useState(0)
  const [countVersion, setCountVersion] = useState(0)

  // Put the first page in the address bar when the store opens.
  const [startPath] = useState(() => pathOf(history[0]!))
  useEffect(() => {
    enterSection(SECTION, startPath)
    if (sectionPath(SECTION) !== startPath) goTo(SECTION, startPath, true)
  }, [startPath])

  // The number on the Cart tab; a failure here is not worth an error message.
  useEffect(() => {
    if (!user) return
    let current = true
    authFetch<{ itemCount: number }>(cartPaths.count).then((data) => { if (current) setCartCount(data.itemCount) }).catch(() => {})
    return () => { current = false }
  }, [authFetch, user, countVersion])

  // The browser's Back/Forward buttons.
  useSectionHistory(SECTION, useCallback((path: string | null) => {
    // The browser's Back with unsaved changes (checkout): put this page back in the address and ask first.
    if (hasUnsavedChanges()) {
      goTo(SECTION, pathOf(view))
      confirmLeave(() => window.history.back())
      return
    }
    if (path === null) { onExit?.(); return }
    const next = readView(path)
    setHistory((pages) => {
      if (pages.length > 1 && sameView(pages[pages.length - 2]!, next)) return pages.slice(0, -1)
      return next.page === 'store' ? [next] : [...pages.slice(-19), next]
    })
    window.scrollTo({ top: 0 })
  }, [onExit, view]))

  // replace: swap the current page instead of adding a step (used after placing an order, so Back skips checkout).
  // Asks first when a form on the current page (checkout) has unsaved changes.
  const open = useCallback((next: View, replace = false) => confirmLeave(() => {
    goTo(SECTION, pathOf(next), replace)
    // Opening the store home starts over; anything else is added on top.
    setHistory((pages) => next.page === 'store' ? [next] : replace ? [...pages.slice(0, -1), next] : [...pages.slice(-19), next])
    window.scrollTo({ top: 0 })
  }), [])

  // Back: one step back in the browser while that stays inside the store, otherwise up to the parent page.
  const back = useCallback(() => {
    if (sectionDepth() > 1) confirmLeave(() => window.history.back())
    else open(parentOf(view), true)
  }, [open, view])

  // The shop page stays mounted while a product opened from it is shown, so "Back" keeps its search and page.
  // Pages that belong to an account; a visitor browsing as a guest is asked to sign in instead.
  const needsAccount = !user && (view.page === 'cart' || view.page === 'checkout' || view.page === 'orders' || view.page === 'order')
  const accountPage = (next: View) => () => { if (user) open(next); else askSignIn() }
  const shopView = [...history].reverse().find((page): page is { page: 'shop'; merchantId: string } => page.page === 'shop')
  return (
    <section className="mp-app mp-store" aria-label="HUB Store">
      <ModuleBar title="HUB Store" onTitle={() => open({ page: 'store' })} onBack={view.page === 'store' ? undefined : back}
        tabs={[
          { label: 'Shop', active: view.page === 'store', onClick: () => open({ page: 'store' }) },
          { label: 'My orders', active: view.page === 'orders' || view.page === 'order', onClick: accountPage({ page: 'orders' }) },
          { label: 'Cart', count: user ? cartCount : undefined, active: view.page === 'cart' || view.page === 'checkout', onClick: accountPage({ page: 'cart' }) },
          ...(onSellerCenter ? [{ label: 'Seller Center', onClick: onSellerCenter }] : []),
        ]} />
      <div className="mp-store-body">
      {needsAccount && (
        <SignInNeeded title={view.page === 'cart' || view.page === 'checkout' ? 'Sign in to see your cart' : 'Sign in to see your orders'}
          text="Your cart and orders are kept in your HUB account. Sign in, or create a free account, and you will come back to this page."
          onBrowse={() => open({ page: 'store' })} />
      )}
      {view.page === 'product' && (
        <ProductPage key={view.productId} productId={view.productId}
          onCount={setCartCount} onOpenCart={() => open({ page: 'cart' })} onOpenShop={(merchantId) => open({ page: 'shop', merchantId })} />
      )}
      {!needsAccount && view.page === 'cart' && (
        <CartPage onBack={() => open({ page: 'store' })} onOpenProduct={(id) => open({ page: 'product', productId: id })} onCount={setCartCount}
          onCheckout={(merchantId) => open({ page: 'checkout', merchantId })} />
      )}
      {!needsAccount && view.page === 'checkout' && (
        <CheckoutPage merchantId={view.merchantId}
          onOrder={(orderId, message) => { setCountVersion((value) => value + 1); open({ page: 'order', orderId, paymentResult: null, message }, true) }} />
      )}
      {!needsAccount && view.page === 'orders' && <OrdersList onOpen={(id) => open({ page: 'order', orderId: id, paymentResult: null, message: null })} />}
      {!needsAccount && view.page === 'order' && (
        <OrderDetails key={view.orderId} orderId={view.orderId} paymentResult={view.paymentResult} startMessage={view.message} />
      )}
      {shopView && (
        <div hidden={view.page !== 'shop'}>
          <ShopPage key={shopView.merchantId} merchantId={shopView.merchantId}
            onOpenProduct={(id) => open({ page: 'product', productId: id })} />
        </div>
      )}
      {/* The store stays mounted (just hidden) so "Back" keeps the customer's search, category and page. */}
      <div hidden={view.page !== 'store'}>
        <StoreHome onOpenProduct={(id) => open({ page: 'product', productId: id })} onOpenShop={(merchantId) => open({ page: 'shop', merchantId })} />
      </div>
      </div>
    </section>
  )
}
