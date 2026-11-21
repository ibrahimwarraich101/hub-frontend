// File purpose: TEMPORARY HUB home with login, until the shared app shell (navigation) is merged.
// Logged out: login / sign-up. Logged in: greeting, the service tiles and business tools. Modules plug their entry screens in here.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminPortal } from './features/admin/AdminPortal'
import { MarketplaceApp } from './features/marketplace/MarketplaceApp'
import { SellerCenter } from './features/marketplace/seller/SellerCenter'
import { FoodApp } from './features/food/FoodApp'
import { RestaurantCenter } from './features/food/partner/RestaurantCenter'
import { FoodAdmin } from './features/food/admin/FoodAdmin'
import { BillsApp } from './features/bills/BillsApp'
import { PaymentMethodsPage } from './shared/payments/PaymentMethods'
import { AuthScreens } from './shared/auth/AuthScreens'
import { useAuth } from './shared/auth/AuthContext'
import { GuestProvider } from './shared/auth/GuestContext'
import { hasUnsavedChanges } from './shared/forms/unsavedChanges'
import { useBusinessAccounts } from './shared/business/useBusinessAccounts'
import { AppShell } from './shared/layout/AppShell'
import type { HubPlace } from './shared/layout/AppShell'
import { leaveSection } from './shared/layout/sectionRoute'
import { HomePage } from './shared/home/HomePage'
import { LandingPage } from './shared/home/LandingPage'
import './App.css'

type Service = 'home' | 'ecommerce' | 'sell' | 'admin' | 'food' | 'restaurant' | 'food-admin' | 'bills' | 'payment-methods'

// Business types whose application form this website already provides (E-Commerce connects "seller", HUB Food "restaurant").
const AVAILABLE_BUSINESS = ['seller', 'restaurant']

function App() {
  const { restoring, user, hasRole, businessIntent, setBusinessIntent } = useAuth()
  // Whether this person has applied to sell or to run a restaurant, so the home page only shows them business tools they use.
  // The service state is declared first so the answers reload every time the person returns to the home page.
  const [service, setService] = useState<Service>(initialService)
  const business = useBusinessAccounts(service === 'home' && businessIntent !== 'seller' && businessIntent !== 'restaurant')

  // The browser's Back/Forward buttons: an address like #store/... or #food/... opens that service; an empty address is the home page.
  // (Inside a service, the service follows its own addresses.)
  useEffect(() => {
    // With unsaved changes the open page keeps the screen; it puts its address back and asks first (unsavedChanges.ts).
    const follow = () => {
      if (hasUnsavedChanges()) return
      setService((current) => serviceFromAddress() ?? (ADDRESSED.includes(current) ? 'home' : current))
    }
    window.addEventListener('popstate', follow)
    return () => window.removeEventListener('popstate', follow)
  }, [])

  // Logged out: which form is open, kept in the address so the browser's Back button returns to the website.
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(authFromAddress)
  useEffect(() => {
    const follow = () => setAuthMode(authFromAddress())
    window.addEventListener('popstate', follow)
    return () => window.removeEventListener('popstate', follow)
  }, [])
  // A visitor browsing the store or Food returns to the same page after signing in (returnTo is that page's address).
  const returnTo = useRef<string | null>(null)
  // Whether the form's address was added by this page, so "Back to HUB" can simply go back one step.
  const pushedAuth = useRef(false)
  const openAuth = useCallback((mode: 'login' | 'signup', back?: string) => {
    const hash = window.location.hash
    returnTo.current = back ?? (hash.startsWith('#store') || hash.startsWith('#food') ? hash : null)
    if (authFromAddress()) history.replaceState(null, '', mode === 'login' ? '#signin' : '#signup')
    else { history.pushState(null, '', mode === 'login' ? '#signin' : '#signup'); pushedAuth.current = true }
    setAuthMode(mode)
    window.scrollTo({ top: 0 })
  }, [])
  const closeAuth = () => {
    if (pushedAuth.current) { pushedAuth.current = false; history.back(); return }
    if (authFromAddress()) history.replaceState(null, '', window.location.pathname + window.location.search)
    setAuthMode(null)
  }
  // After logging in: replace #signin / #signup with the page the visitor was browsing (or the home page),
  // before any service screen opens, so it reads the right address.
  useEffect(() => {
    if (!user || !authMode) return
    const back = returnTo.current
    returnTo.current = null
    pushedAuth.current = false
    history.replaceState(back ? { hubDepth: 1 } : null, '', back ?? window.location.pathname + window.location.search)
    // Follows the address just changed above (the browser history is outside React).
    // oxlint-disable-next-line react/set-state-in-effect
    setService(serviceFromAddress() ?? 'home')
    setAuthMode(null)
  }, [user, authMode])

  // Moving with the top bar or the phone tab bar: leave the current service's address, then open the new one.
  // Set while a seller or restaurant owner looks at their own store or restaurant from their center; any top-bar move ends it.
  const [preview, setPreview] = useState<'ecommerce' | 'food' | null>(null)
  const navigate = useCallback((place: HubPlace) => {
    setPreview(null)
    leaveSection()
    setService(place)
    window.scrollTo({ top: 0 })
  }, [])
  // Visitors open the store or Food from the public website; path is a page inside it (e.g. "product/<id>").
  const browse = useCallback((place: 'ecommerce' | 'food', path = '') => {
    const section = place === 'ecommerce' ? 'store' : 'food'
    history.pushState({ hubDepth: 1 }, '', '#' + (path ? `${section}/${path}` : section))
    setService(place)
    window.scrollTo({ top: 0 })
  }, [])
  const signIn = useCallback(() => openAuth('login'), [openAuth])

  if (restoring || (user && authMode)) return <main className="hub-home"><p className="hub-loading">Loading…</p></main>
  // Logged out: the public HUB website; "Sign in" / "Sign up" open the forms (#signin, #signup, so Back returns to the website).
  // Visitors can also browse HUB Store and HUB Food; adding to a cart, checkout and orders ask them to sign in.
  if (!user) {
    if (authMode) return <AuthScreens key={authMode} initialMode={authMode} availableBusiness={AVAILABLE_BUSINESS} onBack={closeAuth} />
    if (service === 'ecommerce' || service === 'food') {
      // Bills and payment methods need an account; after signing in, the visitor lands on that page.
      const guestNavigate = (place: HubPlace) => {
        if (place === 'bills' || place === 'payment-methods') openAuth('login', place === 'bills' ? '#bills' : '#payment-methods')
        else navigate(place)
      }
      return (
        <GuestProvider value={signIn}>
          <AppShell active={service} onNavigate={guestNavigate} onSignIn={signIn} onSignUp={() => openAuth('signup')}>
            {service === 'ecommerce' ? <MarketplaceApp onExit={() => setService('home')} /> : <FoodApp onExit={() => setService('home')} />}
          </AppShell>
        </GuestProvider>
      )
    }
    return <LandingPage onSignIn={signIn} onSignUp={() => openAuth('signup')} onBrowse={browse} />
  }

  // Someone who chose "E-Commerce store seller" at sign-up goes straight to the seller application.
  const view: Service = service === 'home' && businessIntent === 'seller' ? 'sell'
    : service === 'home' && businessIntent === 'restaurant' ? 'restaurant' : service
  const home = () => setService('home')
  // Business tools and admin pages keep their own full-screen layout.
  if (view === 'sell') return <SellerCenter onExit={() => { setBusinessIntent(null); home() }} onViewStore={() => { setPreview('ecommerce'); setService('ecommerce') }} />
  if (view === 'admin' && hasRole('Administrator')) return <AdminPortal onExit={home} />
  if (view === 'restaurant') return <RestaurantCenter onExit={() => { setBusinessIntent(null); home() }} onViewRestaurant={() => { setPreview('food'); setService('food') }} />
  if (view === 'food-admin' && hasRole('Administrator')) return <FoodAdmin onExit={home} />

  // Customer screens share the HUB frame: top bar with the services and account menu, and the phone tab bar.
  const place: HubPlace = view === 'ecommerce' || view === 'food' || view === 'bills' || view === 'payment-methods' ? view : 'home'
  // Business pages leave the customer section's address, so a refresh does not reopen the store under them.
  const openTool = (target: Service) => () => { setPreview(null); leaveSection(); setService(target); window.scrollTo({ top: 0 }) }
  const isAdmin = hasRole('Administrator')
  const tools = [
    ...(business.seller ? [{ label: 'Seller Center', onClick: openTool('sell') }] : []),
    ...(business.restaurant ? [{ label: 'Restaurant Center', onClick: openTool('restaurant') }] : []),
    ...(isAdmin ? [{ label: 'Admin portal', onClick: openTool('admin') }, { label: 'HUB Food admin', onClick: openTool('food-admin') }] : []),
  ]
  return (
    <AppShell active={place} onNavigate={navigate} tools={tools}
      preview={preview === 'ecommerce' && place === 'ecommerce'
        ? { text: 'You are seeing your store the way customers see it.', action: 'Back to Seller Center', onAction: openTool('sell') }
        : preview === 'food' && place === 'food'
        ? { text: 'You are seeing your restaurant the way customers see it.', action: 'Back to Restaurant Center', onAction: openTool('restaurant') }
        : undefined}>
      {place === 'ecommerce' && <MarketplaceApp onExit={home} onSellerCenter={business.seller ? openTool('sell') : undefined} />}
      {place === 'food' && <FoodApp onExit={home} />}
      {place === 'bills' && <BillsApp onExit={home} />}
      {place === 'payment-methods' && <PaymentMethodsPage onExit={home} />}
      {place === 'home' && <HomePage open={setService} business={business} availableBusiness={AVAILABLE_BUSINESS} />}
    </AppShell>
  )
}

// Services whose screens are kept in the address bar (#store/..., #food/..., #bills/..., ...).
const ADDRESSED: Service[] = ['sell', 'ecommerce', 'food', 'bills', 'payment-methods', 'restaurant', 'food-admin']

// The service an address belongs to (refresh, Back/Forward), or null for the home page.
function serviceFromAddress(): Service | null {
  const hash = window.location.hash
  const is = (section: string) => hash === '#' + section || hash.startsWith('#' + section + '/')
  // An admin address (#admin/...) reopens the admin portal after a refresh.
  return hash.startsWith('#admin') ? 'admin'
    : is('food-admin') ? 'food-admin'
    : is('food') ? 'food'
    : is('restaurant') ? 'restaurant'
    : is('store') ? 'ecommerce'
    : is('seller') ? 'sell'
    : is('bills') ? 'bills'
    : is('payment-methods') ? 'payment-methods' : null
}

// The login or sign-up form named in the address (#signin, #signup), or null for the public website.
function authFromAddress(): 'login' | 'signup' | null {
  return window.location.hash === '#signin' ? 'login' : window.location.hash === '#signup' ? 'signup' : null
}

// The first screen after loading the page.
function initialService(): Service {
  return serviceFromAddress()
    // Coming back from JazzCash: ?bill=...&payment=... opens that bill; ?order=...&payment=... opens the store on that order.
    ?? (new URLSearchParams(window.location.search).has('bill') ? 'bills'
      : new URLSearchParams(window.location.search).has('payment') ? 'ecommerce' : 'home')
}

export default App
