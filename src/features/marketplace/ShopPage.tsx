// File purpose: A shop's own page on the website: logo, name, description, overall rating, how long it has sold on HUB,
// delivered orders, and all its products with search, sorting and paging.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../shared/api/client'
import { fetchProducts, fetchShop, sinceText } from './api'
import type { ProductPage, ProductSort, Shop } from './api'
import { ProductGrid, ShopLogo } from './ProductGrid'
import { Stars } from './Reviews'

const PAGE_SIZE = 12

export function ShopPage({ merchantId, onBack, onOpenProduct }: { merchantId: string; onBack: () => void; onOpenProduct: (id: string) => void }) {
  const [shop, setShop] = useState<Shop | null>(null)
  const [shopError, setShopError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ProductSort>('rating')
  const [page, setPage] = useState(1)
  const [loaded, setLoaded] = useState<{ key: string; data?: ProductPage; error?: string }>({ key: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchShop(merchantId, controller.signal).then(setShop).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setShopError(reason instanceof ApiError && reason.status === 404 ? 'This shop is not on HUB Store right now.' : 'Something went wrong while loading this shop.')
    })
    return () => controller.abort()
  }, [merchantId, reload])

  const requestKey = JSON.stringify([merchantId, search, sort, page, reload])
  useEffect(() => {
    const controller = new AbortController()
    fetchProducts({ merchantId, search, sort, page, pageSize: PAGE_SIZE }, controller.signal)
      .then((data) => setLoaded({ key: requestKey, data }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setLoaded({ key: requestKey, error: reason instanceof ApiError ? reason.message : 'Something went wrong while loading products.' })
      })
    return () => controller.abort()
  }, [merchantId, search, sort, page, reload, requestKey])
  const loading = loaded.key !== requestKey
  const error = loading ? null : loaded.error ?? null
  const result = loaded.data ?? null

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchText)
    setPage(1)
  }

  const since = shop ? sinceText(shop.sellingSince) : null
  return (
    <div className="mp-shop-page">
      <button type="button" className="mp-back" onClick={onBack}>Back</button>
      {shopError && (
        <div className="mp-message error" role="alert">
          {shopError} <button type="button" onClick={() => { setShopError(null); setReload((count) => count + 1) }}>Try again</button>
        </div>
      )}
      {shop && (
        <header className="mp-shop-head">
          <ShopLogo name={shop.name} logoUrl={shop.logoUrl} size="large" />
          <div className="mp-shop-head-main">
            <h2>{shop.name}</h2>
            {shop.reviewCount > 0 && shop.ratingAverage !== null ? (
              <p className="mp-shop-rating">
                <Stars value={shop.ratingAverage} />
                <strong>{shop.ratingAverage.toFixed(1)}</strong>
                <span>from {shop.reviewCount} review{shop.reviewCount === 1 ? '' : 's'}</span>
              </p>
            ) : <p className="mp-shop-rating"><span>No reviews yet</span></p>}
            {shop.description && <p className="mp-shop-description">{shop.description}</p>}
            <ul className="mp-shop-facts">
              <li><strong>{shop.productCount}</strong> product{shop.productCount === 1 ? '' : 's'}</li>
              <li><strong>{shop.deliveredOrders}</strong> order{shop.deliveredOrders === 1 ? '' : 's'} delivered</li>
              {since && <li>{since}</li>}
            </ul>
          </div>
        </header>
      )}

      <form className="mp-search" onSubmit={submitSearch} role="search">
        <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)}
          placeholder={shop ? `Search in ${shop.name}` : 'Search in this shop'} maxLength={100} aria-label="Search in this shop" />
        <button type="submit">Search</button>
      </form>
      <div className="mp-toolbar">
        <span>{result ? `${result.total} product${result.total === 1 ? '' : 's'}` : ''}</span>
        <label>
          Sort{' '}
          <select value={sort} onChange={(event) => { setSort(event.target.value as ProductSort); setPage(1) }}>
            <option value="rating">Top rated</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </div>
      {error && (
        <div className="mp-message error" role="alert">
          {error} <button type="button" onClick={() => setReload((count) => count + 1)}>Try again</button>
        </div>
      )}
      {!error && loading && !result && <div className="mp-message">Loading products…</div>}
      {!error && !loading && result && result.items.length === 0 && (
        <div className="mp-message">{search ? 'No products in this shop match your search.' : 'This shop has no products on sale right now.'}</div>
      )}
      {!error && result && <ProductGrid result={result} pageSize={PAGE_SIZE} page={page} onPage={setPage} onOpenProduct={onOpenProduct} showShop={false} />}
    </div>
  )
}
