// File purpose: The public HUB website, shown before logging in: what HUB is, its services, real restaurants and products,
// why people use it and how businesses can join. "Sign in" and "Sign up" sit at the top left next to the logo.
// Visitors can open HUB Store and HUB Food without an account (onBrowse); Bills and ordering need one.
// Uses the same sections and styles as the home page after logging in (home.css) and the HUB footer style (shell.css).
import { ReasonList, ServiceGrid } from './HomePage'
import { ProductShowcase, RestaurantShowcase } from './Showcase'
import '../layout/shell.css'
import './home.css'

type Props = {
  onSignIn: () => void
  onSignUp: () => void
  // Opens the store or Food for browsing; path is a page inside it (e.g. "product/<id>").
  onBrowse: (place: 'ecommerce' | 'food', path?: string) => void
}

const YEAR = new Date().getFullYear()

// Scrolls to a section of this page, below the sticky top bar.
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function LandingPage({ onSignIn, onSignUp, onBrowse }: Props) {
  return (
    <div className="sh lp">
      <header className="sh-top">
        <div className="sh-top-inner">
          <div className="lp-left">
            <button type="button" className="sh-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="HUB, back to top">HUB</button>
            <div className="lp-auth">
              <button type="button" className="lp-signin" onClick={onSignIn}>Sign in</button>
              <button type="button" className="lp-signup" onClick={onSignUp}>Sign up</button>
            </div>
          </div>
          <nav className="lp-links" aria-label="On this page">
            <button type="button" onClick={() => onBrowse('food')}>Food</button>
            <button type="button" onClick={() => onBrowse('ecommerce')}>Store</button>
            <button type="button" onClick={() => scrollToSection('lp-services')}>Services</button>
            <button type="button" onClick={() => scrollToSection('lp-why')}>Why HUB</button>
            <button type="button" onClick={() => scrollToSection('lp-partner')}>For businesses</button>
          </nav>
        </div>
      </header>

      <main className="hm">
        <section className="hm-hero">
          <div className="hm-wrap hm-hero-inner">
            <div className="hm-hero-text">
              <p className="hm-kicker light">Welcome to HUB</p>
              <h1>Everyday services, in one place.</h1>
              <p className="hm-lead">Order food, shop from trusted sellers and pay your bills with one HUB account. Rides are coming soon.</p>
              <div className="hm-actions">
                <button type="button" className="hm-button primary" onClick={() => onBrowse('food')}>Order food</button>
                <button type="button" className="hm-button ghost" onClick={() => onBrowse('ecommerce')}>Visit the store</button>
              </div>
            </div>
            <div className="hm-hero-art" aria-hidden="true">
              <div className="hm-art-card food"><span>HUB Food</span><strong>Order on its way</strong><i /></div>
              <div className="hm-art-card shop"><span>HUB Store</span><strong>Order delivered</strong><i /></div>
              <div className="hm-art-card bills"><span>HUB Bills</span><strong>Bill paid</strong><i /></div>
            </div>
          </div>
        </section>

        <section className="hm-section lp-anchor" id="lp-services" aria-labelledby="lp-services-title">
          <div className="hm-wrap">
            <header className="hm-section-head">
              <p className="hm-kicker">Our services</p>
              <h2 id="lp-services-title">Everything you need, every day</h2>
              <p>Look around the store and the restaurants without an account. Sign in when you are ready to order or pay a bill.</p>
            </header>
            <ServiceGrid onOpen={(id) => { if (id === 'bills') onSignIn(); else onBrowse(id) }} actionLabels={{ bills: 'Sign in to pay a bill' }} />
          </div>
        </section>

        {/* Real restaurants and products, so visitors see what HUB has before signing up. */}
        <RestaurantShowcase onBrowse={onBrowse} />
        <ProductShowcase onBrowse={onBrowse} />

        <section className="hm-section muted lp-anchor" id="lp-why" aria-labelledby="lp-why-title">
          <div className="hm-wrap">
            <header className="hm-section-head">
              <p className="hm-kicker">Why HUB</p>
              <h2 id="lp-why-title">Simple, safe and all in one account</h2>
            </header>
            <ReasonList />
          </div>
        </section>

        {/* How to start: three steps. */}
        <section className="hm-section" aria-labelledby="lp-steps-title">
          <div className="hm-wrap">
            <header className="hm-section-head">
              <p className="hm-kicker">Getting started</p>
              <h2 id="lp-steps-title">Start in three steps</h2>
            </header>
            <ol className="lp-steps">
              <li><strong>Create your account</strong><span>Sign up with your name, email and phone number, then confirm your email.</span></li>
              <li><strong>Choose a service</strong><span>Order food, shop in the store or look up a bill. You can look around before signing up.</span></li>
              <li><strong>Pay and follow it</strong><span>Pay with JazzCash and follow every order and receipt in your account.</span></li>
            </ol>
          </div>
        </section>

        <section className="hm-section lp-anchor" id="lp-partner" aria-labelledby="lp-partner-title">
          <div className="hm-wrap">
            <div className="hm-partner">
              <div>
                <p className="hm-kicker light">For businesses</p>
                <h2 id="lp-partner-title">Grow your business with HUB</h2>
                <p>Sell your products on HUB Store or bring your restaurant to HUB Food. Sign up as a business and apply online.</p>
              </div>
              <div className="hm-actions">
                <button type="button" className="hm-button primary" onClick={onSignUp}>Sign up as a business</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="sh-footer">
        <div className="sh-footer-inner">
          <div className="sh-footer-brand">
            <p className="sh-logo light lp-footer-logo">HUB</p>
            <p>Everyday services in one place: food, shopping and bills with one account.</p>
          </div>
          <nav className="sh-footer-col" aria-label="Services">
            <h2>Services</h2>
            <button type="button" onClick={() => onBrowse('food')}>HUB Food</button>
            <button type="button" onClick={() => onBrowse('ecommerce')}>HUB Store</button>
            <button type="button" onClick={onSignIn}>HUB Bills</button>
            <span>HUB Drive (coming soon)</span>
          </nav>
          <nav className="sh-footer-col" aria-label="Account">
            <h2>Account</h2>
            <button type="button" onClick={onSignIn}>Sign in</button>
            <button type="button" onClick={onSignUp}>Sign up</button>
            <button type="button" onClick={() => scrollToSection('lp-partner')}>For businesses</button>
          </nav>
          <div className="sh-footer-col">
            <h2>Payments</h2>
            <span>Payments are made with JazzCash. You approve every payment, and HUB never sees your card number.</span>
          </div>
        </div>
        <div className="sh-footer-legal">
          <span>&copy; {YEAR} HUB. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
