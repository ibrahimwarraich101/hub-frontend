// File purpose: The HUB Food home: green search banner, food categories, filter and sort chips, and restaurant photo cards
// (same layout as the app's Food home). Categories come from HUB's list (managed by administrators); a category shows the
// restaurants that chose it. Searching matches restaurant name, cuisine or dish; the city filter, category and "open now"
// run on the server, the other filters and sorting on the loaded page.
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, getJson, mediaUrl } from '../../shared/api/client'
import { foodPaths, money } from './foodApi'
import type { FoodCategory, RestaurantList as RestaurantPage } from './foodApi'
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
type Query = { search: string; city: string; openOnly: boolean; page: number; categoryId: string }
// One round shortcut: a HUB category (filters by category) or, if the server has none yet, a built-in search shortcut.
type Shortcut = { key: string; label: string; photo: string | null; categoryId: string; search: string }
type SortKey = 'recommended' | 'fastest' | 'rating' | 'fee'

// Built-in shortcuts, used only while HUB has no categories (each runs a search). Photos are generic food photos
// (Wikimedia Commons, credits in ./cuisines/CREDITS.json) bundled with the website; they also stand in for a category
// of the same name that has no photo yet.
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

const bundledPhoto = (name: string) => {
  const key = name.toLowerCase()
  return cuisines.find((cuisine) => cuisine.label.toLowerCase() === key || key.startsWith(cuisine.label.toLowerCase() + ' '))?.photo ?? null
}

const sortLabels: Record<SortKey, string> = {
  recommended: 'Recommended', fastest: 'Fastest delivery', rating: 'Top rated', fee: 'Lowest delivery fee',
}

export function RestaurantList({ onOpen }: Props) {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [query, setQuery] = useState<Query>({ search: '', city: '', openOnly: false, page: 1, categoryId: '' })
  const [categories, setCategories] = useState<FoodCategory[] | null>(null)
  const [freeDelivery, setFreeDelivery] = useState(false)
  const [noMinimum, setNoMinimum] = useState(false)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [data, setData] = useState<RestaurantPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getJson<FoodCategory[]>(foodPaths.foodCategories, controller.signal)
      .then(setCategories)
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setCategories([]) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getJson<RestaurantPage>(foodPaths.restaurants(query.search, query.city, query.openOnly, query.page, query.categoryId), controller.signal)
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

  function pick(shortcut: Shortcut) {
    if (shortcut.categoryId) {
      setQuery({ ...query, categoryId: query.categoryId === shortcut.categoryId ? '' : shortcut.categoryId, page: 1 })
      return
    }
    const next = query.search === shortcut.search ? '' : shortcut.search
    setSearch(next)
    setQuery({ ...query, search: next, page: 1 })
  }

  function clearAll() {
    setSearch('')
    setCity('')
    setFreeDelivery(false)
    setNoMinimum(false)
    setSort('recommended')
    setQuery({ search: '', city: '', openOnly: false, page: 1, categoryId: '' })
  }

  const items = useMemo(() => {
    if (!data) return null
    const list = data.items.filter((r) => (!freeDelivery || r.deliveryFee === 0) && (!noMinimum || r.minimumOrder === 0))
    if (sort === 'fastest') list.sort((a, b) => a.deliveryMinutes - b.deliveryMinutes)
    else if (sort === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    else if (sort === 'fee') list.sort((a, b) => a.deliveryFee - b.deliveryFee)
    return list
  }, [data, freeDelivery, noMinimum, sort])

  const filtered = query.search !== '' || query.city !== '' || query.categoryId !== '' || query.openOnly || freeDelivery || noMinimum
    || sort !== 'recommended'
  // HUB's categories once loaded; the built-in shortcuts only when the server has none.
  const shortcuts: Shortcut[] = categories === null ? []
    : categories.length > 0
      ? categories.map((category) => ({ key: category.id, label: category.name, photo: mediaUrl(category.imageUrl) ?? bundledPhoto(category.name),
        categoryId: category.id, search: '' }))
      : cuisines.map((cuisine) => ({ key: cuisine.label, label: cuisine.label, photo: cuisine.photo, categoryId: '', search: cuisine.search }))
  const activeCategory = categories?.find((category) => category.id === query.categoryId)
  const isOn = (shortcut: Shortcut) => shortcut.categoryId ? query.categoryId === shortcut.categoryId : query.search === shortcut.search
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <>
      <div className="fd-hero-search">
        <h2>Hungry? Order from restaurants near you</h2>
        <p>Search by restaurant, cuisine or dish, and choose your city.</p>
        <form className="fd-search" onSubmit={submit} role="search">
          <input aria-label="Search restaurants, cuisines or dishes" placeholder="Search restaurants or dishes" value={search}
            maxLength={100} onChange={(e) => setSearch(e.target.value)} />
          <input className="fd-city" aria-label="City" placeholder="City, e.g. Lahore" value={city} maxLength={60} onChange={(e) => setCity(e.target.value)} />
          <button type="submit" className="fd-primary">Search</button>
        </form>
      </div>

      <div className="fd-sheet">
        <div className="fd-cuisines" role="list" aria-label="Cuisines">
          {shortcuts.map((shortcut) => (
            <button key={shortcut.key} type="button" role="listitem" className={isOn(shortcut) ? 'fd-cuisine active' : 'fd-cuisine'}
              aria-pressed={isOn(shortcut)} onClick={() => pick(shortcut)}>
              <span className="fd-cuisine-photo">
                {shortcut.photo ? <img src={shortcut.photo} alt="" loading="lazy" /> : <span className="fd-pick-empty">{shortcut.label.slice(0, 1)}</span>}
              </span>
              <span className="fd-cuisine-label">{shortcut.label}</span>
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
          {activeCategory && ` · ${activeCategory.name}`}
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
