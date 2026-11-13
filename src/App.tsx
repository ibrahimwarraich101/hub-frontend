// File purpose: TEMPORARY HUB home with login, until the shared app shell (theme, navigation) is merged.
// Logged out: login / sign-up. Logged in: the user's name, live roles, logout and the service buttons.
// Modules plug their own entry screens in here.
import { useState } from 'react'
import { AdminPortal } from './features/marketplace/admin/AdminPortal'
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
  const [service, setService] = useState<Service>('home')

  if (restoring) return <main className="hub-home"><p>Loading…</p></main>
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
  return (
    <main className="hub-home">
      <header className="hub-top">
        <h1>HUB</h1>
        <div className="hub-user">
          <span>Hello, {user.fullName}</span>
          <button type="button" onClick={() => void logout()}>Log out</button>
        </div>
      </header>
      <p className="hub-roles">Your roles: {user.roles.join(', ')}</p>

      {intent && !AVAILABLE_BUSINESS.includes(intent.id) && (
        <div className="hub-intent" role="status">
          You chose <strong>{intent.label}</strong> at sign-up. The application form is provided by the {intent.module} module.
          <button type="button" onClick={() => setBusinessIntent(null)}>Dismiss</button>
        </div>
      )}

      <p>Choose a service</p>
      <div className="hub-services">
        <button type="button" onClick={() => setService('ecommerce')}>E-Commerce</button>
        <button type="button" disabled title="Built by the HUB Drive module">HUB Drive</button>
        <button type="button" onClick={() => setService('food')}>HUB Food</button>
      </div>

      <p>Business</p>
      <div className="hub-services">
        <button type="button" onClick={() => setService('sell')}>Sell on HUB Store</button>
        <button type="button" onClick={() => setService('restaurant')}>Restaurant on HUB Food</button>
        {hasRole('Administrator') && (
          <button type="button" onClick={() => setService('admin')}>Admin portal</button>
        )}
        {hasRole('Administrator') && (
          <button type="button" onClick={() => setService('food-admin')}>Restaurant approvals</button>
        )}
      </div>
    </main>
  )
}

export default App
