// File purpose: TEMPORARY HUB home with login, until the shared app shell (navigation) is merged.
// Logged out: login / sign-up. Logged in: greeting, the service tiles and business tools. Modules plug their entry screens in here.
import { useEffect, useRef, useState } from 'react'
import { AdminPortal } from './features/admin/AdminPortal'
import { MarketplaceApp } from './features/marketplace/MarketplaceApp'
import { SellerCenter } from './features/marketplace/seller/SellerCenter'
import { FoodApp } from './features/food/FoodApp'
import { RestaurantCenter } from './features/food/partner/RestaurantCenter'
import { FoodAdmin } from './features/food/admin/FoodAdmin'
import { AuthScreens } from './shared/auth/AuthScreens'
import { useAuth } from './shared/auth/AuthContext'
import { businessOptions } from './shared/auth/businessOptions'
import { useBusinessAccounts } from './shared/business/useBusinessAccounts'
import type { BusinessStatus } from './shared/business/useBusinessAccounts'
import './App.css'

type Service = 'home' | 'ecommerce' | 'sell' | 'admin' | 'food' | 'restaurant' | 'food-admin'

// Business types whose application form this website already provides (E-Commerce connects "seller", HUB Food "restaurant").
const AVAILABLE_BUSINESS = ['seller', 'restaurant']

function App() {
  const { restoring, user, logout, hasRole, businessIntent, setBusinessIntent } = useAuth()
  // Whether this person has applied to sell or to run a restaurant, so the home page only shows them business tools they use.
  // The service state is declared first so the answers reload every time the person returns to the home page.
  const [service, setService] = useState<Service>(initialService)
  const business = useBusinessAccounts(service === 'home' && businessIntent !== 'seller' && businessIntent !== 'restaurant')
  if (restoring) return <main className="hub-home"><p className="hub-loading">Loading…</p></main>
  if (!user) return <AuthScreens availableBusiness={AVAILABLE_BUSINESS} />

  // Someone who chose "E-Commerce store seller" at sign-up goes straight to the seller application.
  const view: Service = service === 'home' && businessIntent === 'seller' ? 'sell'
    : service === 'home' && businessIntent === 'restaurant' ? 'restaurant' : service
  const home = () => setService('home')
  if (view === 'ecommerce') return <MarketplaceApp onExit={home} />
  if (view === 'sell') return <SellerCenter onExit={() => { setBusinessIntent(null); home() }} />
  if (view === 'admin' && hasRole('Administrator')) return <AdminPortal onExit={home} />
  if (view === 'food') return <FoodApp onExit={home} />
  if (view === 'restaurant') return <RestaurantCenter onExit={() => { setBusinessIntent(null); home() }} />
  if (view === 'food-admin' && hasRole('Administrator')) return <FoodAdmin onExit={home} />

  const intent = businessOptions.find((option) => option.id === businessIntent)
  const isAdmin = hasRole('Administrator')
  const firstName = user.fullName.split(' ')[0]
  return (
    <main className="hub-home">
      <header className="hub-top">
        <p className="hub-logo">HUB</p>
        <UserMenu fullName={user.fullName} onLogout={() => void logout()} />
      </header>

      <section className="hub-hero">
        <p>Hello, {firstName}</p>
        <h1>Everyday Services in One App</h1>
        <p className="hub-hero-sub">Ride. Eat. Shop. Stay fit. Pay bills. All with HUB.</p>
        <p className="hub-roles">Your roles: {user.roles.join(', ')}</p>
      </section>

      {intent && !AVAILABLE_BUSINESS.includes(intent.id) && (
        <div className="hub-intent" role="status">
          <span>You chose <strong>{intent.label}</strong> at sign-up. The application form is provided by the {intent.module} module.</span>
          <button type="button" className="hub-button secondary small" onClick={() => setBusinessIntent(null)}>Dismiss</button>
        </div>
      )}

      <h2>Choose a service</h2>
      <div className="hub-services">
        <button type="button" className="hub-tile shop" onClick={() => setService('ecommerce')}>
          <strong>E-Commerce</strong>
          <span>Everything you need</span>
        </button>
        <button type="button" className="hub-tile drive" disabled title="Built by the HUB Drive module">
          <strong>HUB Drive</strong>
          <span>Coming soon</span>
        </button>
        <button type="button" className="hub-tile food" onClick={() => setService('food')}>
          <strong>HUB Food</strong>
          <span>Order from restaurants near you</span>
        </button>
      </div>

      {/* Business tools: only for people who have applied (named after their tool, e.g. "Seller Center") and administrators. */}
      {(business.seller || business.restaurant || isAdmin) && (
        <>
          <h2>Business</h2>
          <div className="hub-services">
            {business.seller && (
              <button type="button" className="hub-tile business" onClick={() => setService('sell')}>
                <strong>Seller Center</strong>
                <span>{statusLine(business.seller, 'Manage your store, products and orders')}</span>
              </button>
            )}
            {business.restaurant && (
              <button type="button" className="hub-tile business" onClick={() => setService('restaurant')}>
                <strong>Restaurant Center</strong>
                <span>{statusLine(business.restaurant, 'Manage your restaurant, menu and orders')}</span>
              </button>
            )}
            {isAdmin && (
              <button type="button" className="hub-tile admin" onClick={() => setService('admin')}>
                <strong>Admin portal</strong>
                <span>Users, sellers, categories and products</span>
              </button>
            )}
            {isAdmin && (
              <button type="button" className="hub-tile admin" onClick={() => setService('food-admin')}>
                <strong>HUB Food admin</strong>
                <span>Restaurant approvals and all food orders</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Everyone else: one small invitation at the bottom, offering only what they have not applied for yet. */}
      {business.loaded && (!business.seller || !business.restaurant) && (
        <section className="hub-partner" aria-label="Partner with HUB">
          <div>
            <strong>Partner with HUB</strong>
            <span>Sell your products or open your restaurant to HUB customers.</span>
          </div>
          <div className="hub-partner-actions">
            {!business.seller && <button type="button" className="hub-button secondary small" onClick={() => setService('sell')}>Sell on HUB Store</button>}
            {!business.restaurant && <button type="button" className="hub-button secondary small" onClick={() => setService('restaurant')}>Open a restaurant</button>}
          </div>
        </section>
      )}
    </main>
  )
}

// The line under a business tile: the normal description once approved, otherwise where the application stands.
function statusLine(status: BusinessStatus, approved: string): string {
  if (status === 'Approved') return approved
  if (status === 'Pending') return 'Your application is being reviewed'
  if (status === 'Rejected') return 'Your application was not approved. See why'
  return 'Your account is suspended. See why'
}

// The first screen after loading the page.
function initialService(): Service {
  // An admin address (#admin/...) reopens the admin portal after a refresh.
  return window.location.hash.startsWith('#admin') ? 'admin'
    // HUB Food addresses (#food-admin..., #food..., #restaurant...) reopen that screen after a refresh.
    : /^#food-admin(\/|$)/.test(window.location.hash) ? 'food-admin'
    : /^#food(\/|$)/.test(window.location.hash) ? 'food'
    : /^#restaurant(\/|$)/.test(window.location.hash) ? 'restaurant'
    // Coming back from JazzCash (?order=...&payment=...) opens the store on that order.
    : new URLSearchParams(window.location.search).has('payment') ? 'ecommerce' : 'home'
}

// The person's name in the top corner. "Log out" is not shown on the page; it is inside the menu that opens from the name.
function UserMenu({ fullName, onLogout }: { fullName: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the menu on a click outside it or with the Escape key.
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="hub-user" ref={menuRef}>
      <button type="button" className="hub-user-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="hub-avatar" aria-hidden="true">{initials(fullName)}</span>
        <span className="hub-user-name">{fullName}</span>
      </button>
      {open && (
        <div className="hub-user-menu" role="menu">
          <button type="button" role="menuitem" className="hub-button secondary small" onClick={onLogout}>Log out</button>
        </div>
      )}
    </div>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}

export default App
