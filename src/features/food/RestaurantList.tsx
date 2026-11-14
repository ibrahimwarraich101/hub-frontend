// File purpose: The HUB Food home: green search banner, cuisine shortcuts, filter and sort chips, and restaurant photo cards
// (same layout as the app's Food home). Searching matches restaurant name, cuisine or dish; the city filter and
// "open now" run on the server, the other filters and sorting on the loaded page.
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, getJson, mediaUrl } from '../../shared/api/client'
import { foodPaths, money } from './foodApi'
import type { RestaurantList as RestaurantPage } from './foodApi'
import bbqPhoto from './cuisines/chicken-tikka.jpg'
import biryaniPhoto from './cuisines/pulao.jpg'
import broastPhoto from './cuisines/fried-chicken.jpg'
import burgerPhoto from './cuisines/cheeseburger.jpg'
import chaiPhoto from './cuisines/chai.jpg'
import chinesePhoto from './cuisines/chow-mein.jpg'
import dessertPhoto from './cuisines/cheesecake.jpg'
import friesPhoto from './cuisines/fries.jpg'
import karahiPhoto from './cuisines/karahi.jpg'
import pizzaPhoto from './cuisines/pepperoni.jpg'
import shawarmaPhoto from './cuisines/wrap.jpg'

type Props = { onOpen: (restaurantId: string) => void }
type Query = { search: string; city: string; openOnly: boolean; page: number }
type SortKey = 'recommended' | 'fastest' | 'rating' | 'fee'

// Each shortcut runs a search that matches a cuisine or dish name. Photos are generic food photos (Wikimedia Commons,
// credits in ./cuisines/CREDITS.json) bundled with the website so the row shows instantly.
const cuisines = [
  { label: 'Fast Food', photo: friesPhoto, search: 'fries' },
  { label: 'Pizza', photo: pizzaPhoto, search: 'pizza' },
  { label: 'Burgers', photo: burgerPhoto, search: 'burger' },
  { label: 'Biryani', photo: biryaniPhoto, search: 'biryani' },
  { label: 'Broast', photo: broastPhoto, search: 'chicken' },
  { label: 'Karahi', photo: karahiPhoto, search: 'karahi' },
  { label: 'BBQ', photo: bbqPhoto, search: 'kebab' },
  { label: 'Chinese', photo: chinesePhoto, search: 'chow mein' },
  { label: 'Shawarma', photo: shawarmaPhoto, search: 'shawarma' },
  { label: 'Chai', photo: chaiPhoto, search: 'chai' },
  { label: 'Desserts', photo: dessertPhoto, search: 'cake' },
]

const sortLabels: Record<SortKey, string> = {
  recommended: 'Recommended', fastest: 'Fastest delivery', rating: 'Top rated', fee: 'Lowest delivery fee',
}

export function RestaurantList({ onOpen }: Props) {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [query, setQuery] = useState<Query>({ search: '', city: '', openOnly: false, page: 1 })
  const [freeDelivery, setFreeDelivery] = useState(false)
  const [noMinimum, setNoMinimum] = useState(false)
  const [sort, setSort] = useState<SortKey>('recommended')
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

  function pickCuisine(term: string) {
    const next = query.search === term ? '' : term
    setSearch(next)
    setQuery({ ...query, search: next, page: 1 })
  }

  function clearAll() {
    setSearch('')
    setCity('')
    setFreeDelivery(false)
    setNoMinimum(false)
    setSort('recommended')
    setQuery({ search: '', city: '', openOnly: false, page: 1 })
  }

  const items = useMemo(() => {
    if (!data) return null
    const list = data.items.filter((r) => (!freeDelivery || r.deliveryFee === 0) && (!noMinimum || r.minimumOrder === 0))
    if (sort === 'fastest') list.sort((a, b) => a.deliveryMinutes - b.deliveryMinutes)
    else if (sort === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    else if (sort === 'fee') list.sort((a, b) => a.deliveryFee - b.deliveryFee)
    return list
  }, [data, freeDelivery, noMinimum, sort])

  const filtered = query.search !== '' || query.city !== '' || query.openOnly || freeDelivery || noMinimum || sort !== 'recommended'
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <>
      <div className="fd-hero-search">
        <h2>Hungry? Order from restaurants near you</h2>
        <p>Search by restaurant, cuisine or dish, and choose your city.</p>
        <form className="fd-search" onSubmit={submit} role="search">
          <input aria-label="Search restaurants, cuisines or dishes" placeholder="🔍  Search HUB Food" value={search}
            maxLength={100} onChange={(e) => setSearch(e.target.value)} />
          <input className="fd-city" aria-label="City" placeholder="📍  City" value={city} maxLength={60} onChange={(e) => setCity(e.target.value)} />
          <button type="submit" className="fd-primary">Search</button>
        </form>
      </div>

      <div className="fd-sheet">
        <div className="fd-cuisines" role="list" aria-label="Cuisines">
          {cuisines.map((cuisine) => (
            <button key={cuisine.label} type="button" role="listitem" className={query.search === cuisine.search ? 'fd-cuisine active' : 'fd-cuisine'}
              aria-pressed={query.search === cuisine.search} onClick={() => pickCuisine(cuisine.search)}>
              <span className="fd-cuisine-photo"><img src={cuisine.photo} alt="" loading="lazy" /></span>
              <span className="fd-cuisine-label">{cuisine.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fd-toolbar" aria-label="Filters">
        <button type="button" className={query.openOnly ? 'fd-chip on' : 'fd-chip'} aria-pressed={query.openOnly}
          onClick={() => setQuery({ ...query, openOnly: !query.openOnly, page: 1 })}>Open now</button>
        <button type="button" className={freeDelivery ? 'fd-chip on' : 'fd-chip'} aria-pressed={freeDelivery}
          onClick={() => setFreeDelivery(!freeDelivery)}>Free delivery</button>
        <button type="button" className={noMinimum ? 'fd-chip on' : 'fd-chip'} aria-pressed={noMinimum}
          onClick={() => setNoMinimum(!noMinimum)}>No minimum</button>
        <label className={sort !== 'recommended' ? 'fd-chip on' : 'fd-chip'}>
          Sort:
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort restaurants">
            {(Object.keys(sortLabels) as SortKey[]).map((key) => <option key={key} value={key}>{sortLabels[key]}</option>)}
          </select>
        </label>
        {filtered && <button type="button" className="fd-link" onClick={clearAll}>Clear all</button>}
      </div>

      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !items && <div className="fd-message">Loading…</div>}

      {items && (
        <h2 className="fd-results">
          {query.search ? `${items.length} ${items.length === 1 ? 'result' : 'results'} for “${query.search}”`
            : `${items.length} ${items.length === 1 ? 'restaurant' : 'restaurants'}`}
          {query.city && ` in ${query.city}`}
        </h2>
      )}
      {items && items.length === 0 && (
        <div className="fd-message">No restaurants found. Try another search, city or filter.</div>
      )}

      {items && items.length > 0 && (
        <ul className="fd-grid">
          {items.map((restaurant) => (
            <li key={restaurant.id}>
              <button type="button" className={restaurant.open ? 'fd-card' : 'fd-card closed'} onClick={() => onOpen(restaurant.id)}
                aria-label={`Open ${restaurant.name}`}>
                <span className="fd-cover">
                  {restaurant.coverUrl ? <img src={mediaUrl(restaurant.coverUrl) ?? ''} alt="" loading="lazy" /> : <span className="fd-cover-empty" />}
                  {restaurant.logoUrl && <img className="fd-logo" src={mediaUrl(restaurant.logoUrl) ?? ''} alt="" />}
                  {!restaurant.open && <span className="fd-closed-badge">Closed now</span>}
                  <span className="fd-time">{restaurant.deliveryMinutes} min</span>
                </span>
                <span className="fd-card-top">
                  <strong>{restaurant.name}</strong>
                  <span className="fd-rating">★ {restaurant.rating === null ? 'New' : `${restaurant.rating} (${restaurant.ratingCount})`}</span>
                </span>
                <span className="fd-meta">{restaurant.cuisine} · {restaurant.city}</span>
                <span className="fd-meta">🛵 {restaurant.deliveryFee === 0 ? 'Free delivery' : `Delivery ${money(restaurant.deliveryFee)}`}</span>
                <span className={restaurant.open ? 'fd-tag' : 'fd-tag closed'}>
                  {!restaurant.open ? 'Closed now' : restaurant.minimumOrder > 0 ? `Min. order ${money(restaurant.minimumOrder)}` : 'No minimum order'}
                </span>
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
