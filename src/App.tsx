// File purpose: TEMPORARY HUB home with login, until the shared app shell (navigation) is merged.
// Logged out: login / sign-up. Logged in: greeting, the service tiles and business tools. Modules plug their entry screens in here.
import { useState } from 'react'
import { AdminPortal } from './features/admin/AdminPortal'
import { MarketplaceApp } from './features/marketplace/MarketplaceApp'
import { SellerCenter } from './features/marketplace/seller/SellerCenter'
import { FoodApp } from './features/food/FoodApp'
import { RestaurantCenter } from './features/food/partner/RestaurantCenter'
import { RestaurantApprovals } from './features/food/admin/RestaurantApprovals'
import { AuthScreens } from './shared/auth/AuthScreens'
import { useAuth } from './shared/auth/AuthContext'
import { businessOptions } from './shared/auth/businessOptions'
import './App.css'

type Service = 'home' | 'ecommerce' | 'sell' | 'admin' | 'food' | 'restaurant' | 'food-admin'

// Business types whose application form this website already provides (E-Commerce connects "seller", HUB Food "restaurant").
const AVAILABLE_BUSINESS = ['seller', 'restaurant']

function App() {
  const { restoring, user, logout, hasRole, businessIntent, setBusinessIntent } = useAuth()
  // An admin address (#admin/...) reopens the admin portal after a refresh.
  const [service, setService] = useState<Service>(() => (window.location.hash.startsWith('#admin') ? 'admin'
    // Coming back from JazzCash (?order=...&payment=...) opens the store on that order.
    : new URLSearchParams(window.location.search).has('payment') ? 'ecommerce' : 'home'))

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
  if (view === 'food-admin' && hasRole('Administrator')) return <RestaurantApprovals onExit={home} />

  const intent = businessOptions.find((option) => option.id === businessIntent)
  const firstName = user.fullName.split(' ')[0]
  return (
    <main className="hub-home">
      <header className="hub-top">
        <p className="hub-logo">HUB</p>
        <div className="hub-user">
          <span className="hub-avatar" aria-hidden="true">{initials(user.fullName)}</span>
          <span className="hub-user-name">{user.fullName}</span>
          <button type="button" className="hub-button secondary small" onClick={() => void logout()}>Log out</button>
        </div>
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

      <h2>Business</h2>
      <div className="hub-services">
        <button type="button" className="hub-tile business" onClick={() => setService('sell')}>
          <strong>Sell on HUB Store</strong>
          <span>Open your store and add products</span>
        </button>
        <button type="button" className="hub-tile business" onClick={() => setService('restaurant')}>
          <strong>Restaurant on HUB Food</strong>
          <span>Open your restaurant and add your menu</span>
        </button>
        {hasRole('Administrator') && (
          <button type="button" className="hub-tile admin" onClick={() => setService('admin')}>
            <strong>Admin portal</strong>
            <span>Users, sellers, categories and products</span>
          </button>
        )}
        {hasRole('Administrator') && (
          <button type="button" className="hub-tile admin" onClick={() => setService('food-admin')}>
            <strong>Restaurant approvals</strong>
            <span>Approve, reject or suspend restaurants</span>
          </button>
        )}
      </div>
    </main>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}

export default App
