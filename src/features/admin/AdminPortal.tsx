// File purpose: HUB admin portal (website only, Administrators only): left menu, top bar and the selected page.
// The page is kept in the address (e.g. #admin/users/<id>) so refreshing or going Back stays in the right place.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { AdminIcon } from './AdminIcon'
import { adminSections } from './sections'
import type { AdminRoute } from './sections'
import './admin.css'

function readRoute(): AdminRoute {
  const [, section, id] = window.location.hash.replace(/^#/, '').split('/')
  return { section: adminSections.some((item) => item.id === section) ? section : 'dashboard', id: id ? decodeURIComponent(id) : null }
}

export function AdminPortal({ onExit }: { onExit: () => void }) {
  const { user, logout } = useAuth()
  const [route, setRoute] = useState<AdminRoute>(readRoute)
  const [menuOpen, setMenuOpen] = useState(false)

  // Follow the browser's Back/Forward buttons.
  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((next: AdminRoute) => {
    window.location.hash = `admin/${next.section}${next.id ? '/' + encodeURIComponent(next.id) : ''}`
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }, [])

  const exit = () => {
    // Leave the admin address so a refresh opens the HUB home.
    history.replaceState(null, '', window.location.pathname + window.location.search)
    onExit()
  }

  const current = adminSections.find((item) => item.id === route.section) ?? adminSections[0]
  const groups = [...new Set(adminSections.map((item) => item.group))]
  // Back goes up one level: an opened item -> its list, a list -> Dashboard, Dashboard -> HUB home.
  // (For sections whose address part is a tab, e.g. Sellers > Approved, the tab is not a level.)
  const back = route.id && !current.idIsTab
    ? { label: current.label, action: () => go({ section: current.id, id: null }) }
    : current.id !== 'dashboard'
      ? { label: 'Dashboard', action: () => go({ section: 'dashboard', id: null }) }
      : { label: 'HUB home', action: exit }

  return (
    <div className="adm">
      <aside className={menuOpen ? 'adm-side open' : 'adm-side'} aria-label="Admin menu">
        <div className="adm-brand">
          <p className="hub-logo">HUB</p>
          <span className="hub-pill info">Admin</span>
        </div>
        <nav>
          {groups.map((group) => (
            <div key={group} className="adm-group">
              <p className="adm-group-title">{group}</p>
              {adminSections.filter((item) => item.group === group).map((item) => (
                <button key={item.id} type="button" className={item.id === current.id ? 'adm-nav active' : 'adm-nav'}
                  aria-current={item.id === current.id ? 'page' : undefined} onClick={() => go({ section: item.id, id: null })}>
                  <AdminIcon name={item.icon} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button type="button" className="adm-nav adm-exit" onClick={exit}>← Back to HUB</button>
      </aside>
      {menuOpen && <button type="button" className="adm-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <div className="adm-main">
        <header className="adm-top">
          <button type="button" className="adm-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
          <button type="button" className="hub-button secondary small adm-back-button" onClick={back.action} aria-label={`Back to ${back.label}`}>
            ← <span className="adm-back-label">{back.label}</span>
          </button>
          <h1>{current.label}</h1>
          <div className="adm-user">
            <span className="adm-avatar" aria-hidden="true">{initials(user?.fullName ?? '')}</span>
            <span className="adm-user-name">{user?.fullName}</span>
            <button type="button" className="hub-button secondary small" onClick={() => void logout()}>Log out</button>
          </div>
        </header>
        <main className="adm-content">
          {current.render({ id: route.id, go })}
        </main>
      </div>
    </div>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A'
}
