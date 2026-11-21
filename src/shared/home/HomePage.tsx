// File purpose: The HUB home page after logging in, laid out like a formal company website:
// a full-width welcome banner with the main actions, the services as large cards, why people use HUB,
// the business tools (for people who use them), and an invitation to partner with HUB.
// Buttons are text only, like every HUB button. No made-up numbers: every line describes something the website really does.
import { useAuth } from '../auth/AuthContext'
import { businessOptions } from '../auth/businessOptions'
import type { BusinessStatus, useBusinessAccounts } from '../business/useBusinessAccounts'
import './home.css'

export type HomeTarget = 'ecommerce' | 'food' | 'bills' | 'sell' | 'restaurant' | 'admin' | 'food-admin' | 'payment-methods'

type Props = {
  open: (target: HomeTarget) => void
  business: ReturnType<typeof useBusinessAccounts>
  // Business types whose application form this website provides.
  availableBusiness: string[]
}

type ServiceCard = {
  id: 'ecommerce' | 'food' | 'bills' | 'drive'
  name: string
  tag: string
  text: string
  action: string
  // Optional photo for the top of the card (e.g. import storePhoto from '../../assets/home/store.jpg').
  photo?: string
}

const SERVICES: ServiceCard[] = [
  { id: 'food', name: 'HUB Food', tag: 'Dining', text: 'Order from restaurants near you and follow your order until it reaches your door.', action: 'Order food' },
  { id: 'ecommerce', name: 'HUB Store', tag: 'Shopping', text: 'Shop products from approved sellers, pay safely and track every order.', action: 'Start shopping' },
  { id: 'bills', name: 'HUB Bills', tag: 'Payments', text: 'Pay electricity, gas, water, internet and school fees, and keep every receipt.', action: 'Pay a bill' },
  { id: 'drive', name: 'HUB Drive', tag: 'Mobility', text: 'Book a ride to wherever you need to go. Coming soon to HUB.', action: 'Coming soon' },
]

const REASONS = [
  { title: 'One account', text: 'Use the same HUB account for food, shopping and bills. No new sign-up for each service.' },
  { title: 'Safe payments', text: 'Pay with your JazzCash wallet. You approve every payment, and HUB never sees your card number.' },
  { title: 'Every order in one place', text: 'Follow your food orders, store orders and paid bills, with a receipt for each one.' },
]

export function HomePage({ open, business, availableBusiness }: Props) {
  const { user, hasRole, businessIntent, setBusinessIntent } = useAuth()
  if (!user) return null

  const intent = businessOptions.find((option) => option.id === businessIntent)
  const isAdmin = hasRole('Administrator')
  const firstName = user.fullName.split(' ')[0]
  const hasTools = Boolean(business.seller || business.restaurant || isAdmin)
  const canApply = business.loaded && (!business.seller || !business.restaurant)

  return (
    <main className="hm">
      {/* Welcome banner */}
      <section className="hm-hero">
        <div className="hm-wrap hm-hero-inner">
          <div className="hm-hero-text">
            <p className="hm-kicker light">Welcome back, {firstName}</p>
            <h1>Everyday services, in one place.</h1>
            <p className="hm-lead">Order food, shop from trusted sellers and pay your bills with one HUB account.</p>
            <div className="hm-actions">
              <button type="button" className="hm-button primary" onClick={() => open('food')}>Order food</button>
              <button type="button" className="hm-button ghost" onClick={() => open('ecommerce')}>Visit the store</button>
            </div>
          </div>
          {/* A picture of the HUB services, made from text; screen readers skip it. */}
          <div className="hm-hero-art" aria-hidden="true">
            <div className="hm-art-card food"><span>HUB Food</span><strong>Order on its way</strong><i /></div>
            <div className="hm-art-card shop"><span>HUB Store</span><strong>Order delivered</strong><i /></div>
            <div className="hm-art-card bills"><span>HUB Bills</span><strong>Bill paid</strong><i /></div>
          </div>
        </div>
      </section>

      {intent && !availableBusiness.includes(intent.id) && (
        <div className="hm-wrap">
          <div className="hm-notice" role="status">
            <span>You chose <strong>{intent.label}</strong> at sign-up. The application form is provided by the {intent.module} module.</span>
            <button type="button" className="hub-button secondary small" onClick={() => setBusinessIntent(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Services */}
      <section className="hm-section" aria-labelledby="hm-services">
        <div className="hm-wrap">
          <header className="hm-section-head">
            <p className="hm-kicker">Our services</p>
            <h2 id="hm-services">Everything you need, every day</h2>
            <p>Choose a service to get started. Your account, payment methods and orders work across all of them.</p>
          </header>
          <ServiceGrid onOpen={(id) => open(id)} />
        </div>
      </section>

      {/* Business tools: only for people who have applied, and administrators. */}
      {hasTools && (
        <section className="hm-section muted" aria-labelledby="hm-tools">
          <div className="hm-wrap">
            <header className="hm-section-head">
              <p className="hm-kicker">Your business</p>
              <h2 id="hm-tools">Business tools</h2>
            </header>
            <ul className="hm-tools">
              {business.seller && (
                <ToolCard title="Seller Center" text={statusLine(business.seller, 'Manage your store, products and orders')} onOpen={() => open('sell')} />
              )}
              {business.restaurant && (
                <ToolCard title="Restaurant Center" text={statusLine(business.restaurant, 'Manage your restaurant, menu and orders')} onOpen={() => open('restaurant')} />
              )}
              {isAdmin && <ToolCard title="Admin portal" text="Users, sellers, categories and products" dark onOpen={() => open('admin')} />}
              {isAdmin && <ToolCard title="HUB Food admin" text="Restaurant approvals and all food orders" dark onOpen={() => open('food-admin')} />}
            </ul>
          </div>
        </section>
      )}

      {/* Why HUB */}
      <section className="hm-section" aria-labelledby="hm-why">
        <div className="hm-wrap">
          <header className="hm-section-head">
            <p className="hm-kicker">Why HUB</p>
            <h2 id="hm-why">Simple, safe and all in one account</h2>
          </header>
          <ReasonList />
        </div>
      </section>

      {/* Partner with HUB: only what this person has not applied for yet. */}
      {canApply && (
        <section className="hm-section" aria-labelledby="hm-partner">
          <div className="hm-wrap">
            <div className="hm-partner">
              <div>
                <p className="hm-kicker light">Partner with HUB</p>
                <h2 id="hm-partner">Grow your business with HUB</h2>
                <p>Reach HUB customers across the country. Apply online and start selling once your application is approved.</p>
              </div>
              <div className="hm-actions">
                {!business.seller && <button type="button" className="hm-button primary" onClick={() => open('sell')}>Sell on HUB Store</button>}
                {!business.restaurant && <button type="button" className="hm-button ghost" onClick={() => open('restaurant')}>Open a restaurant</button>}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

// The four service cards. onOpen gets the chosen service; HUB Drive is shown as coming soon.
// actionLabels replaces a card's action text (e.g. "Sign in to pay a bill" on the public page).
export function ServiceGrid({ onOpen, actionLabels = {} }: {
  onOpen: (id: 'ecommerce' | 'food' | 'bills') => void; actionLabels?: Partial<Record<'ecommerce' | 'food' | 'bills', string>>
}) {
  return (
    <ul className="hm-services">
      {SERVICES.map((service) => {
        const soon = service.id === 'drive'
        return (
          <li key={service.id}>
            <button type="button" className={`hm-service ${service.id}`} disabled={soon}
              onClick={() => { if (service.id !== 'drive') onOpen(service.id) }}>
              <span className="hm-service-visual">
                {service.photo ? <img src={service.photo} alt="" /> : <span className="hm-service-mark">{service.name.replace('HUB ', '')}</span>}
              </span>
              <span className="hm-service-body">
                <span className="hm-service-tag">{service.tag}</span>
                <strong>{service.name}</strong>
                <span className="hm-service-text">{service.text}</span>
                <span className="hm-service-link">{service.id === 'drive' ? service.action : actionLabels[service.id] ?? service.action}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// "Why HUB": three numbered points.
export function ReasonList() {
  return (
    <ol className="hm-reasons">
      {REASONS.map((reason, index) => (
        <li key={reason.title}>
          <span className="hm-reason-number">{String(index + 1).padStart(2, '0')}</span>
          <h3>{reason.title}</h3>
          <p>{reason.text}</p>
        </li>
      ))}
    </ol>
  )
}

function ToolCard({ title, text, dark, onOpen }: { title: string; text: string; dark?: boolean; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className={dark ? 'hm-tool dark' : 'hm-tool'} onClick={onOpen}>
        <strong>{title}</strong>
        <span>{text}</span>
        <span className="hm-service-link">Open</span>
      </button>
    </li>
  )
}

// The line under a business tool: the normal description once approved, otherwise where the application stands.
function statusLine(status: BusinessStatus, approved: string): string {
  if (status === 'Approved') return approved
  if (status === 'Pending') return 'Your application is being reviewed'
  if (status === 'Rejected') return 'Your application was not approved. See why'
  return 'Your account is suspended. See why'
}
