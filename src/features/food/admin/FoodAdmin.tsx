// File purpose: Admin portal (HUB Food part): one page with four areas - restaurant approvals, all food orders, customer
// complaints and the food categories customers browse by. Only shown to Administrators; the backend checks the role
// again on every request. The open area is kept in the address (#food-admin/<area>), so Refresh stays on it.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../shared/auth/AuthContext'
import { foodPaths } from '../foodApi'
import type { AdminOrderTotals } from '../foodApi'
import { enterSection, goTo, leaveSection, sectionPath, useSectionHistory } from '../foodRoute'
import { AdminCategories } from './AdminCategories'
import { AdminComplaints } from './AdminComplaints'
import { AdminOrders } from './AdminOrders'
import { RestaurantApprovals } from './RestaurantApprovals'
import '../food.css'
import '../../../shared/auth/auth.css'

type Props = { onExit: () => void }
type Area = 'restaurants' | 'orders' | 'complaints' | 'categories'
const AREAS: Area[] = ['restaurants', 'orders', 'complaints', 'categories']
const SECTION = 'food-admin'
const readArea = (path: string | null): Area => (AREAS as string[]).includes(path ?? '') ? path as Area : 'restaurants'

export function FoodAdmin({ onExit: leave }: Props) {
  const { authFetch } = useAuth()
  const [area, setAreaState] = useState<Area>(() => readArea(sectionPath(SECTION)))
  useEffect(() => { enterSection(SECTION, readArea(sectionPath(SECTION))) }, [])
  const onExit = useCallback(() => { leaveSection(); leave() }, [leave])
  useSectionHistory(SECTION, useCallback((path: string | null) => {
    if (path === null) leave()
    else setAreaState(readArea(path))
  }, [leave]))
  // Switching areas replaces the address, so Back still leaves the admin area in one step.
  const setArea = (next: Area) => { goTo(SECTION, next, true); setAreaState(next) }
  // An order opened from a complaint ("Open the full order").
  const [orderId, setOrderId] = useState<string | null>(null)
  const [openComplaints, setOpenComplaints] = useState(0)

  const count = useCallback(() => {
    authFetch<AdminOrderTotals>(foodPaths.adminOrderTotals).then((totals) => setOpenComplaints(totals.openComplaints)).catch(() => undefined)
  }, [authFetch])

  useEffect(() => {
    count()
    const timer = window.setInterval(count, 30000)
    return () => window.clearInterval(timer)
  }, [count])

  const areas: { value: Area; label: string }[] = [
    { value: 'restaurants', label: 'Restaurants' },
    { value: 'orders', label: 'All orders' },
    { value: 'complaints', label: 'Complaints' },
    { value: 'categories', label: 'Categories' },
  ]

  return (
    <section className="fd-app" aria-label="HUB Food admin">
      <header className="fd-header">
        <button type="button" className="fd-back" onClick={onExit}>← HUB</button>
        <h1>Admin portal · HUB Food</h1>
      </header>
      <div className="fd-admin-areas" role="tablist" aria-label="Admin area">
        {areas.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={area === item.value} className={area === item.value ? 'active' : undefined}
            onClick={() => { setArea(item.value); setOrderId(null) }}>
            {item.label}
            {item.value === 'complaints' && openComplaints > 0 && <span className="fd-tab-badge">{openComplaints}</span>}
          </button>
        ))}
      </div>
      {area === 'restaurants' && <RestaurantApprovals />}
      {area === 'orders' && <AdminOrders key={orderId ?? 'list'} initialOrderId={orderId} />}
      {area === 'categories' && <AdminCategories />}
      {area === 'complaints' && (
        <AdminComplaints onChanged={count} onOpenOrder={(id) => { setOrderId(id); setArea('orders') }} />
      )}
    </section>
  )
}
