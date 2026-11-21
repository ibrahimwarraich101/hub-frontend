// File purpose: Live previews on the public website: real restaurants from HUB Food and real products from HUB Store,
// loaded from the public catalog endpoints (no login needed). A click opens that restaurant or product (browsing needs no account).
// If the server cannot be reached or there is nothing to show yet, the row is simply left out.
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getJson, mediaUrl } from '../api/client'
import { fetchProducts } from '../../features/marketplace/api'
import type { ProductSummary } from '../../features/marketplace/api'
import { foodPaths } from '../../features/food/foodApi'
import type { RestaurantList, RestaurantSummary } from '../../features/food/foodApi'

const SHOWN = 8

type Load<T> = { state: 'loading' } | { state: 'ready'; items: T[] } | { state: 'hidden' }

function useList<T>(load: (signal: AbortSignal) => Promise<T[]>): Load<T> {
  const [result, setResult] = useState<Load<T>>({ state: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((items) => setResult(items.length > 0 ? { state: 'ready', items: items.slice(0, SHOWN) } : { state: 'hidden' }))
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setResult({ state: 'hidden' }) })
    return () => controller.abort()
  }, [load])
  return result
}

const loadRestaurants = (signal: AbortSignal) => getJson<RestaurantList>(foodPaths.restaurants('', '', false, 1), signal).then((list) => list.items)
const loadProducts = (signal: AbortSignal) => fetchProducts({ sort: 'newest', page: 1, pageSize: SHOWN }, signal).then((page) => page.items)

function money(amount: number, currency: string) {
  return `${currency === 'PKR' ? 'Rs' : currency} ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

type RowProps = { onBrowse: (place: 'ecommerce' | 'food', path?: string) => void }

// "Restaurants on HUB Food": a row of restaurant cards.
export function RestaurantShowcase({ onBrowse }: RowProps) {
  const list = useList<RestaurantSummary>(loadRestaurants)
  if (list.state === 'hidden') return null
  return (
    <ShowcaseSection kicker="HUB Food" title="Restaurants on HUB" text="A few of the restaurants taking orders on HUB Food. Open one to see its menu."
      onAll={() => onBrowse('food')} action="See all restaurants">
      {list.state === 'loading' ? <Placeholders /> : list.items.map((restaurant) => (
        <li key={restaurant.id}>
          <button type="button" className={restaurant.open ? 'sc-card' : 'sc-card closed'} onClick={() => onBrowse('food', `restaurant/${encodeURIComponent(restaurant.id)}`)}>
            <span className="sc-photo wide">
              {restaurant.coverUrl ? <img src={mediaUrl(restaurant.coverUrl) ?? ''} alt="" loading="lazy" /> : <span className="sc-noimage">{restaurant.name.charAt(0)}</span>}
              {!restaurant.open && <span className="sc-badge">Closed now</span>}
            </span>
            <span className="sc-body">
              <strong>{restaurant.name}</strong>
              <span className="sc-meta">{[restaurant.cuisine, restaurant.city].filter(Boolean).join(' · ')}</span>
              <span className="sc-facts">
                {restaurant.rating !== null && <span>{restaurant.rating.toFixed(1)} rating</span>}
                <span>{restaurant.deliveryMinutes} min</span>
                <span>{restaurant.deliveryFee > 0 ? `${money(restaurant.deliveryFee, restaurant.currency)} delivery` : 'Free delivery'}</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ShowcaseSection>
  )
}

// "Products on HUB Store": a row of product cards.
export function ProductShowcase({ onBrowse }: RowProps) {
  const list = useList<ProductSummary>(loadProducts)
  if (list.state === 'hidden') return null
  return (
    <ShowcaseSection kicker="HUB Store" title="New in the store" text="The latest products from approved HUB sellers. Open one to see the details."
      onAll={() => onBrowse('ecommerce')} action="Visit the store">
      {list.state === 'loading' ? <Placeholders /> : list.items.map((product) => (
        <li key={product.id}>
          <button type="button" className={product.inStock ? 'sc-card' : 'sc-card closed'} onClick={() => onBrowse('ecommerce', `product/${encodeURIComponent(product.id)}`)}>
            <span className="sc-photo">
              {product.imageUrl ? <img src={mediaUrl(product.imageUrl) ?? ''} alt="" loading="lazy" /> : <span className="sc-noimage">{product.name.charAt(0)}</span>}
              {product.salePrice !== null && <span className="sc-badge sale">Sale</span>}
              {!product.inStock && <span className="sc-badge">Sold out</span>}
            </span>
            <span className="sc-body">
              <strong className="sc-two-lines">{product.name}</strong>
              <span className="sc-price">
                {money(product.salePrice ?? product.price, product.currency)}
                {product.salePrice !== null && <s>{money(product.price, product.currency)}</s>}
              </span>
              <span className="sc-meta">{product.merchantName}</span>
            </span>
          </button>
        </li>
      ))}
    </ShowcaseSection>
  )
}

type SectionProps = { kicker: string; title: string; text: string; action: string; onAll: () => void; children: ReactNode }

function ShowcaseSection({ kicker, title, text, action, onAll, children }: SectionProps) {
  return (
    <section className="hm-section" aria-label={title}>
      <div className="hm-wrap">
        <header className="sc-head">
          <div className="hm-section-head">
            <p className="hm-kicker">{kicker}</p>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <button type="button" className="sc-all" onClick={onAll}>{action}</button>
        </header>
        <ul className="sc-row">{children}</ul>
      </div>
    </section>
  )
}

function Placeholders() {
  return Array.from({ length: 4 }, (_, index) => (
    <li key={index} aria-hidden="true"><span className="sc-card sc-skeleton"><span className="sc-photo" /><span className="sc-line" /><span className="sc-line short" /></span></li>
  ))
}
