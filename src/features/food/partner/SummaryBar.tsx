// File purpose: Today's numbers at the top of the Restaurant Center (refreshes every 20 seconds with the orders list).
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../shared/auth/AuthContext'
import { foodPaths, money } from '../foodApi'
import type { RestaurantSummaryStats } from '../foodApi'

type Props = { onStats?: (stats: RestaurantSummaryStats) => void }

export function SummaryBar({ onStats }: Props) {
  const { authFetch } = useAuth()
  const [stats, setStats] = useState<RestaurantSummaryStats | null>(null)

  const load = useCallback(() => {
    authFetch<RestaurantSummaryStats>(foodPaths.summary)
      .then((data) => { setStats(data); onStats?.(data) })
      .catch(() => undefined)
  }, [authFetch, onStats])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 20000)
    return () => window.clearInterval(timer)
  }, [load])

  if (!stats) return null
  const tiles = [
    { label: 'Orders today', value: String(stats.todayOrders), tone: '' },
    { label: 'Sales today', value: money(stats.todaySales), tone: '' },
    { label: 'New, waiting for you', value: String(stats.waitingOrders), tone: stats.waitingOrders > 0 ? 'alert' : '' },
    { label: 'Active orders', value: String(stats.activeOrders), tone: '' },
    { label: 'Delivered', value: String(stats.deliveredOrders), tone: '' },
    { label: 'Rating', value: stats.rating === null ? 'New' : `★ ${stats.rating} (${stats.ratingCount})`, tone: '' },
  ]
  return (
    <div className="fd-stats" aria-label="Today at your restaurant">
      {tiles.map((tile) => (
        <div key={tile.label} className={tile.tone ? `fd-stat ${tile.tone}` : 'fd-stat'}>
          <strong>{tile.value}</strong>
          <span>{tile.label}</span>
        </div>
      ))}
    </div>
  )
}
