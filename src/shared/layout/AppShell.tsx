// File purpose: The one HUB frame around every customer screen (home, Store, Food, Bills, payment methods), so moving
// around the website works the same everywhere:
// - Top bar: the HUB logo (home), the services (Home, Store, Food, Bills) and the account menu (payment methods, log out).
// - Footer: links to the services and the account, on every page.
// - On phones the services move to a tab bar at the bottom of the screen, like the mobile app.
// - ModuleBar: the bar under it inside a service: its name, a Back button and its own pages (e.g. My orders, Cart).
// - Visitors browsing without an account (Store and Food) see "Sign in" and "Sign up" instead of the account menu.
// Buttons are text only, like every HUB button.
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import './shell.css'

export type HubPlace = 'home' | 'ecommerce' | 'food' | 'bills' | 'payment-methods'

const SERVICES: { id: HubPlace; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'ecommerce', label: 'Store' },
  { id: 'food', label: 'Food' },
  { id: 'bills', label: 'Bills' },
]

// The year in the footer's copyright line.
const YEAR = new Date().getFullYear()

type ShellProps = {
  active: HubPlace
  onNavigate: (place: HubPlace) => void
  children: ReactNode
  // Only for visitors who are not logged in.
  onSignIn?: () => void
  onSignUp?: () => void
}

export function AppShell({ active, onNavigate, children, onSignIn, onSignUp }: ShellProps) {
  const { user, logout } = useAuth()
  const services = (className: string, label: string) => (
    <nav className={className} aria-label={label}>
      {SERVICES.map((service) => (
        <button key={service.id} type="button" aria-current={active === service.id ? 'page' : undefined}
          onClick={() => onNavigate(service.id)}>{service.label}</button>
      ))}
    </nav>
  )

  return (
    <div className="sh">
      <header className="sh-top">
        <div className="sh-top-inner">
          <button type="button" className="sh-logo" onClick={() => onNavigate('home')} aria-label="HUB home">HUB</button>
          {services('sh-nav', 'Services')}
          {user ? (
            <UserMenu fullName={user.fullName} active={active === 'payment-methods'}
              onPaymentMethods={() => onNavigate('payment-methods')} onLogout={() => void logout()} />
          ) : (
            <div className="sh-guest">
              <button type="button" className="sh-signin" onClick={onSignIn}>Sign in</button>
              <button type="button" className="sh-signup" onClick={onSignUp}>Sign up</button>
            </div>
          )}
        </div>
      </header>
      <div className="sh-main">{children}</div>
      <footer className="sh-footer">
        <div className="sh-footer-inner">
          <div className="sh-footer-brand">
            <button type="button" className="sh-logo light" onClick={() => onNavigate('home')} aria-label="HUB home">HUB</button>
            <p>Everyday services in one place: food, shopping and bills with one account.</p>
          </div>
          <nav className="sh-footer-col" aria-label="Services">
            <h2>Services</h2>
            <button type="button" onClick={() => onNavigate('food')}>HUB Food</button>
            <button type="button" onClick={() => onNavigate('ecommerce')}>HUB Store</button>
            <button type="button" onClick={() => onNavigate('bills')}>HUB Bills</button>
            <span>HUB Drive (coming soon)</span>
          </nav>
          <nav className="sh-footer-col" aria-label="Account">
            <h2>Account</h2>
            {user ? (
              <>
                <button type="button" onClick={() => onNavigate('payment-methods')}>Payment methods</button>
                <button type="button" onClick={() => void logout()}>Log out</button>
              </>
            ) : (
              <>
                <button type="button" onClick={onSignIn}>Sign in</button>
                <button type="button" onClick={onSignUp}>Sign up</button>
              </>
            )}
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
      {services('sh-tabs', 'Services')}
    </div>
  )
}

type Tab = { label: string; active?: boolean; count?: number; onClick: () => void }

type ModuleBarProps = {
  title: string
  // Clicking the name opens the service's first page.
  onTitle?: () => void
  // Shown on every page except the service's first page.
  onBack?: () => void
  tabs?: Tab[]
}

// The bar at the top of a service: Back, the service name and its pages. Same look in the Store, Food and Bills.
export function ModuleBar({ title, onTitle, onBack, tabs = [] }: ModuleBarProps) {
  return (
    <div className="sh-module">
      <div className="sh-module-inner">
        {onBack && <button type="button" className="sh-module-back" onClick={onBack}>Back</button>}
        <h1 className="sh-module-title">
          {onTitle ? <button type="button" onClick={onTitle}>{title}</button> : title}
        </h1>
        {tabs.length > 0 && (
          <nav className="sh-module-tabs" aria-label={title}>
            {tabs.map((tab) => (
              <button key={tab.label} type="button" aria-current={tab.active ? 'page' : undefined} onClick={tab.onClick}
                aria-label={tab.count === undefined ? undefined : `${tab.label}, ${tab.count} item${tab.count === 1 ? '' : 's'}`}>
                {tab.label}
                {tab.count !== undefined && <span className="sh-count">{tab.count}</span>}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}

// The person's initials in the top corner; "Payment methods" and "Log out" are inside the menu that opens from it.
function UserMenu({ fullName, active, onPaymentMethods, onLogout }: { fullName: string; active: boolean; onPaymentMethods: () => void; onLogout: () => void }) {
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

  const choose = (action: () => void) => { setOpen(false); action() }
  return (
    <div className="sh-user" ref={menuRef}>
      <button type="button" className={active ? 'sh-user-button active' : 'sh-user-button'} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        <span className="sh-avatar" aria-hidden="true">{initials(fullName)}</span>
        <span className="sh-user-name">{fullName}</span>
      </button>
      {open && (
        <div className="sh-user-menu" role="menu">
          <p className="sh-user-menu-name">{fullName}</p>
          <button type="button" role="menuitem" onClick={() => choose(onPaymentMethods)}>Payment methods</button>
          <button type="button" role="menuitem" className="danger" onClick={() => choose(onLogout)}>Log out</button>
        </div>
      )}
    </div>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}
