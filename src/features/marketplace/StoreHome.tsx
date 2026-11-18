// File purpose: E-Commerce store home: a banner with search, category tiles with photos, the shops on HUB, a "Top rated"
// row, and all products with category filters, sorting and paging. While the customer searches or filters, the banner,
// tiles and rows step aside so the results come first.
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { fetchCategories, fetchProducts, fetchShops } from './api'
import type { Category, ProductPage, ProductSort, ProductSummary, Shop } from './api'
import { ProductCard, ProductGrid, ProductSkeleton, ShopLogo } from './ProductGrid'

type Props = {
  onOpenProduct: (id: string) => void
  onOpenShop: (id: string) => void
}

const PAGE_SIZE = 12

// Tile colours for categories without a photo (the HUB service tile colours).
const tileColours = [
  ['var(--hub-shop-bg)', 'var(--hub-shop)'],
  ['var(--hub-drive-bg)', 'var(--hub-drive)'],
  ['var(--hub-food-bg)', 'var(--hub-food)'],
  ['var(--hub-bills-bg)', 'var(--hub-bills)'],
  ['var(--hub-fitness-bg)', 'var(--hub-fitness)'],
]

export function StoreHome({ onOpenProduct, onOpenShop }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  // One product photo per top-level category, for its tile.
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, string | null>>({})
  const [shops, setShops] = useState<Shop[]>([])
  const [topRated, setTopRated] = useState<ProductSummary[]>([])
  const [rootId, setRootId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ProductSort>('newest')
  const [page, setPage] = useState(1)
  // The last finished request: which filters it was for, and its data or error.
  const [loaded, setLoaded] = useState<{ key: string; data?: ProductPage; error?: string }>({ key: '' })
  // Bumped by "Try again" to repeat the last request.
  const [reload, setReload] = useState(0)
  const productsRef = useRef<HTMLElement>(null)

  // Load the category tree, the shops and the top rated row once. The extras are optional: if they fail the store still works.
  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal).then(setCategories).catch(() => setCategories([]))
    fetchShops(controller.signal).then(setShops).catch(() => setShops([]))
    fetchProducts({ sort: 'rating', pageSize: 10 }, controller.signal)
      .then((data) => setTopRated(data.items.filter((item) => item.reviewCount > 0)))
      .catch(() => setTopRated([]))
    return () => controller.abort()
  }, [])

  // The best rated product photo of each top-level category becomes that category's tile picture.
  useEffect(() => {
    if (categories.length === 0) return
    const controller = new AbortController()
    for (const category of categories) {
      fetchProducts({ categoryId: category.id, sort: 'rating', pageSize: 1 }, controller.signal)
        .then((data) => setCategoryPhotos((photos) => ({ ...photos, [category.id]: data.items[0]?.imageUrl ?? null })))
        .catch(() => {})
    }
    return () => controller.abort()
  }, [categories])

  // Reload products whenever a filter, the sort or the page changes. State is only set when the request finishes.
  const requestKey = JSON.stringify([categoryId, search, sort, page, reload])
  useEffect(() => {
    const controller = new AbortController()
    fetchProducts({ categoryId, search, sort, page, pageSize: PAGE_SIZE }, controller.signal)
      .then((data) => setLoaded({ key: requestKey, data }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setLoaded({ key: requestKey, error: reason instanceof ApiError ? reason.message : 'Something went wrong while loading products.' })
      })
    return () => controller.abort()
  }, [categoryId, search, sort, page, reload, requestKey])
  const loading = loaded.key !== requestKey
  const error = loading ? null : loaded.error ?? null
  // Keep showing the previous page while the next one loads, so the grid does not flash empty.
  const result = loaded.data ?? null

  // Searching or filtering by category: show the results first.
  const browsing = rootId !== null || search !== ''

  function showProducts() {
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Choosing a top-level category shows its subcategories; choosing it again (or "All") clears the filter.
  function chooseRoot(id: string | null) {
    setRootId(id)
    setCategoryId(id)
    setPage(1)
    window.scrollTo({ top: 0 })
  }

  function chooseChild(id: string) {
    setCategoryId(id === categoryId ? rootId : id)
    setPage(1)
  }

  function choosePage(next: number) {
    setPage(next)
    showProducts()
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchText.trim())
    setPage(1)
    window.scrollTo({ top: 0 })
  }

  function clearFilters() {
    setSearchText('')
    setSearch('')
    chooseRoot(null)
  }

  const root = categories.find((category) => category.id === rootId)
  const heading = search ? `Results for "${search}"` : root ? root.name : 'All products'

  return (
    <div className="mp-home">
      <section className={browsing ? 'mp-hero compact' : 'mp-hero'} aria-label="Search the store">
        {!browsing && (
          <div className="mp-hero-text">
            <h2>Shop from trusted local sellers</h2>
            <p>
              {shops.length > 0 ? `${shops.length} shops on HUB. ` : ''}
              Every order is delivered by the seller, and you pay safely online with JazzCash.
            </p>
          </div>
        )}
        <form className="mp-search" onSubmit={submitSearch} role="search">
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search products"
            maxLength={100}
            aria-label="Search products"
          />
          <button type="submit">Search</button>
        </form>
      </section>

      {!browsing && categories.length > 0 && (
        <section className="mp-section" aria-label="Categories">
          <h2 className="mp-section-title">Shop by category</h2>
          <ul className="mp-cat-tiles">
            {categories.map((category, index) => {
              const photo = mediaUrl(categoryPhotos[category.id] ?? null)
              const [background, colour] = tileColours[index % tileColours.length]!
              return (
                <li key={category.id}>
                  <button type="button" className={photo ? 'mp-cat-tile has-photo' : 'mp-cat-tile'} onClick={() => chooseRoot(category.id)} style={{ background, color: colour }}>
                    {photo ? <img src={photo} alt="" loading="lazy" /> : <span className="mp-cat-letter" aria-hidden="true">{category.name[0]}</span>}
                    <span className="mp-cat-name">{category.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!browsing && shops.length > 0 && (
        <section className="mp-section mp-shops" aria-label="Shops on HUB">
          <h2 className="mp-section-title">Shops on HUB</h2>
          <ul className="mp-rail">
            {shops.map((shop) => (
              <li key={shop.id}>
                <button type="button" className="mp-shop-card" onClick={() => onOpenShop(shop.id)}>
                  <ShopLogo name={shop.name} logoUrl={shop.logoUrl} />
                  <span className="mp-shop-card-name">{shop.name}</span>
                  <span className="mp-hint">
                    {shop.ratingAverage !== null && shop.reviewCount > 0 ? <><strong className="mp-shop-star">★ {shop.ratingAverage.toFixed(1)}</strong> · </> : null}
                    {shop.productCount} product{shop.productCount === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!browsing && topRated.length >= 3 && (
        <section className="mp-section" aria-label="Top rated">
          <div className="mp-section-head">
            <h2 className="mp-section-title">Top rated</h2>
            <button type="button" className="mp-link" onClick={() => { setSort('rating'); setPage(1); showProducts() }}>See all</button>
          </div>
          <ul className="mp-rail mp-product-rail">
            {topRated.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} onOpen={onOpenProduct} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mp-section mp-products" ref={productsRef} aria-label={heading}>
        {browsing && (
          <div className="mp-filter-bar">
            <div className="mp-scroll-chips" aria-label="Categories">
              <button type="button" className={rootId === null ? 'mp-chip active' : 'mp-chip'} onClick={() => chooseRoot(null)}>All</button>
              {categories.map((category) => (
                <button key={category.id} type="button" className={rootId === category.id ? 'mp-chip active' : 'mp-chip'}
                  onClick={() => chooseRoot(rootId === category.id ? null : category.id)}>
                  {category.name}
                </button>
              ))}
            </div>
            {root && root.children.length > 0 && (
              <div className="mp-scroll-chips sub" aria-label={`${root.name} subcategories`}>
                {root.children.map((child) => (
                  <button key={child.id} type="button" className={categoryId === child.id ? 'mp-chip active' : 'mp-chip'} onClick={() => chooseChild(child.id)}>
                    {child.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mp-toolbar">
          <div>
            <h2 className="mp-section-title">{heading}</h2>
            {result && <span className="mp-hint">{result.total} product{result.total === 1 ? '' : 's'}</span>}
          </div>
          <label className="mp-sort">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as ProductSort)
                setPage(1)
              }}
            >
              <option value="newest">Newest</option>
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="mp-message error" role="alert">
            {error}{' '}
            <button type="button" className="mp-link" onClick={() => setReload((count) => count + 1)}>
              Try again
            </button>
          </div>
        )}
        {!error && loading && !result && <ProductSkeleton />}
        {!error && !loading && result && result.items.length === 0 && (
          <div className="mp-empty">
            <h3>{browsing ? 'No products found' : 'No products on sale yet'}</h3>
            <p>{search ? 'Try a different word, or look in another category.' : browsing ? 'There is nothing in this category yet.' : 'Shops are getting ready. Please check back soon.'}</p>
            {browsing && <button type="button" className="mp-primary" onClick={clearFilters}>Show all products</button>}
          </div>
        )}

        {!error && result && (
          <ProductGrid result={result} pageSize={PAGE_SIZE} page={page} onPage={choosePage} onOpenProduct={onOpenProduct} busy={loading} />
        )}
      </section>
    </div>
  )
}
