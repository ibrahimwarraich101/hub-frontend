// File purpose: E-Commerce store home: category buttons, search, sorting, product grid and paging.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { fetchCategories, fetchProducts, formatPrice } from './api'
import type { Category, ProductPage, ProductSort } from './api'
import { RatingLine } from './Reviews'

type Props = {
  onOpenProduct: (id: string) => void
}

const PAGE_SIZE = 12

export function StoreHome({ onOpenProduct }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
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

  // Load the category tree once.
  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal).then(setCategories).catch(() => setCategories([]))
    return () => controller.abort()
  }, [])

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

  // Choosing a top-level category shows its subcategories; choosing it again (or "All") clears the filter.
  function chooseRoot(id: string | null) {
    setRootId(id)
    setCategoryId(id)
    setPage(1)
  }

  function chooseChild(id: string) {
    setCategoryId(id === categoryId ? rootId : id)
    setPage(1)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchText)
    setPage(1)
  }

  const root = categories.find((category) => category.id === rootId)
  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1

  return (
    <div className="mp-home">
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

      <div className="mp-chips" aria-label="Categories">
        <button type="button" className={rootId === null ? 'mp-chip active' : 'mp-chip'} onClick={() => chooseRoot(null)}>
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={rootId === category.id ? 'mp-chip active' : 'mp-chip'}
            onClick={() => chooseRoot(rootId === category.id ? null : category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
      {root && root.children.length > 0 && (
        <div className="mp-chips sub" aria-label={`${root.name} subcategories`}>
          {root.children.map((child) => (
            <button
              key={child.id}
              type="button"
              className={categoryId === child.id ? 'mp-chip active' : 'mp-chip'}
              onClick={() => chooseChild(child.id)}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      <div className="mp-toolbar">
        <span>{result ? `${result.total} product${result.total === 1 ? '' : 's'}` : ''}</span>
        <label>
          Sort{' '}
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as ProductSort)
              setPage(1)
            }}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="mp-message error" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setReload((count) => count + 1)}>
            Try again
          </button>
        </div>
      )}
      {!error && loading && <div className="mp-message">Loading products…</div>}
      {!error && !loading && result && result.items.length === 0 && (
        <div className="mp-message">No products found. Try another category or search.</div>
      )}

      {!error && result && result.items.length > 0 && (
        <ul className="mp-grid">
          {result.items.map((product) => {
            const image = mediaUrl(product.imageUrl)
            return (
              <li key={product.id}>
                <button type="button" className="mp-card" onClick={() => onOpenProduct(product.id)}>
                  {image ? <img src={image} alt="" loading="lazy" /> : <div className="mp-noimage">No photo</div>}
                  <span className="mp-name">{product.name}</span>
                  <span className="mp-price">
                    {formatPrice(product.salePrice ?? product.price, product.currency)}
                    {product.salePrice !== null && <s>{formatPrice(product.price, product.currency)}</s>}
                  </span>
                  {product.reviewCount > 0 && <RatingLine average={product.ratingAverage} count={product.reviewCount} />}
                  <span className="mp-seller">{product.merchantName}</span>
                  {!product.inStock && <span className="mp-badge">Out of stock</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {result && result.total > PAGE_SIZE && (
        <div className="mp-pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
