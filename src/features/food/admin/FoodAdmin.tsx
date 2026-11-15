// File purpose: Admin portal (HUB Food part): one page with two areas - restaurant approvals and all food orders.
// Only shown to Administrators; the backend checks the role again on every request.
import { useState } from 'react'
import { AdminOrders } from './AdminOrders'
import { RestaurantApprovals } from './RestaurantApprovals'
import '../food.css'
import '../../../shared/auth/auth.css'

type Props = { onExit: () => void }
type Area = 'restaurants' | 'orders'

export function FoodAdmin({ onExit }: Props) {
  const [area, setArea] = useState<Area>('restaurants')
  return (
    <section className="fd-app" aria-label="HUB Food admin">
      <header className="fd-header">
        <button type="button" className="fd-back" onClick={onExit}>← HUB</button>
        <h1>Admin portal · HUB Food</h1>
      </header>
      <div className="fd-admin-areas" role="tablist" aria-label="Admin area">
        <button type="button" role="tab" aria-selected={area === 'restaurants'} className={area === 'restaurants' ? 'active' : undefined}
          onClick={() => setArea('restaurants')}>Restaurants</button>
        <button type="button" role="tab" aria-selected={area === 'orders'} className={area === 'orders' ? 'active' : undefined}
          onClick={() => setArea('orders')}>All orders</button>
      </div>
      {area === 'restaurants' ? <RestaurantApprovals /> : <AdminOrders />}
    </section>
  )
}
