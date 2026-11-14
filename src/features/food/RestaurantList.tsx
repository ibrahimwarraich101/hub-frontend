// File purpose: The HUB Food home: search restaurants by name, cuisine or dish, filter by city and "open now".
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, getJson, mediaUrl } from '../../shared/api/client'
import { foodPaths, money } from './foodApi'
import type { RestaurantList as RestaurantPage } from './foodApi'

type Props = { onOpen: (restaurantId: string) => void }
type Query = { search: string; city: string; openOnly: boolean; page: number }

export function RestaurantList({ onOpen }: Props) {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [query, setQuery] = useState<Query>({ search: '', city: '', openOnly: false, page: 1 })
  const [data, setData] = useState<RestaurantPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getJson<RestaurantPage>(foodPaths.restaurants(query.search, query.city, query.openOnly, query.page), controller.signal)
      .then((result) => { setData(result); setError(null) })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof ApiError ? reason.message : 'Could not load restaurants.')
      })
    return () => controller.abort()
  }, [query])

  function submit(event: FormEvent) {
    event.preventDefault()
    setQuery({ ...query, search, city, page: 1 })
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <>
      <form className="fd-search" onSubmit={submit} role="search">
        <input aria-label="Search restaurants or dishes" placeholder="Search restaurants, cuisines or dishes" value={search}
          maxLength={100} onChange={(e) => setSearch(e.target.value)} />
        <input aria-label="City" placeholder="City" value={city} maxLength={60} onChange={(e) => setCity(e.target.value)} />
        <label>
          <input type="checkbox" checked={query.openOnly} onChange={(e) => setQuery({ ...query, openOnly: e.target.checked, page: 1 })} />
          Open now
        </label>
        <button type="submit" className="fd-primary">Search</button>
      </form>

      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !data && <div className="fd-message">Loading…</div>}
      {data && data.items.length === 0 && (
        <div className="fd-message">No restaurants found. Try another search or city.</div>
      )}

      {data && data.items.length > 0 && (
        <ul className="fd-grid">
          {data.items.map((restaurant) => (
            <li key={restaurant.id}>
              <button type="button" className={restaurant.open ? 'fd-card' : 'fd-card closed'} onClick={() => onOpen(restaurant.id)}>
                <span className="fd-cover">
                  {restaurant.coverUrl ? <img src={mediaUrl(restaurant.coverUrl) ?? ''} alt="" loading="lazy" /> : <span className="fd-cover-empty" />}
                  {restaurant.logoUrl && <img className="fd-logo" src={mediaUrl(restaurant.logoUrl) ?? ''} alt="" />}
                  <span className="fd-time">{restaurant.deliveryMinutes} min</span>
                </span>
                <span className="fd-card-top">
                  <strong>{restaurant.name}</strong>
                  <span className="fd-rating">{restaurant.rating === null ? 'New' : `★ ${restaurant.rating} (${restaurant.ratingCount})`}</span>
                </span>
                <span className="fd-meta">{restaurant.cuisine} · {restaurant.city}</span>
                <span className="fd-meta">
                  {restaurant.deliveryMinutes} min · Delivery {restaurant.deliveryFee === 0 ? 'free' : money(restaurant.deliveryFee)}
                  {restaurant.minimumOrder > 0 && ` · Min ${money(restaurant.minimumOrder)}`}
                </span>
                <span className={restaurant.open ? 'fd-tag' : 'fd-tag closed'}>{restaurant.open ? 'Open' : 'Closed'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <nav className="fd-pager" aria-label="Pages">
          <button type="button" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button>
          <span>Page {query.page} of {totalPages}</span>
          <button type="button" disabled={query.page >= totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button>
        </nav>
      )}
    </>
  )
}
