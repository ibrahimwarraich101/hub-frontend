// File purpose: Pieces shared by the store home and the shop pages: the product card, the product card grid with paging,
// grey placeholder cards while products load, and a shop's logo (its initials in a coloured circle when the shop has no logo).
import { mediaUrl } from '../../shared/api/client'
import { formatPrice } from './api'
import type { ProductPage, ProductSummary } from './api'
import { RatingLine } from './Reviews'

// Percentage saved when a product has a lower sale price, e.g. 20 for "-20%".
function discountPercent(product: ProductSummary): number | null {
  if (product.salePrice === null || product.salePrice >= product.price || product.price <= 0) return null
  const percent = Math.round((1 - product.salePrice / product.price) * 100)
  return percent >= 1 ? percent : null
}

export function ProductCard({ product, onOpen, showShop = true }: { product: ProductSummary; onOpen: (id: string) => void; showShop?: boolean }) {
  const image = mediaUrl(product.imageUrl)
  const discount = discountPercent(product)
  return (
    <button type="button" className={product.inStock ? 'mp-card' : 'mp-card sold-out'} onClick={() => onOpen(product.id)}>
      <span className="mp-card-photo">
        {image ? <img src={image} alt="" loading="lazy" /> : <span className="mp-noimage">No photo</span>}
        {discount !== null && <span className="mp-discount">-{discount}%</span>}
        {!product.inStock && <span className="mp-badge">Out of stock</span>}
      </span>
      <span className="mp-card-body">
        <span className="mp-name">{product.name}</span>
        <span className="mp-price">
          {formatPrice(product.salePrice ?? product.price, product.currency)}
          {product.salePrice !== null && <s>{formatPrice(product.price, product.currency)}</s>}
        </span>
        {product.reviewCount > 0 && <RatingLine average={product.ratingAverage} count={product.reviewCount} />}
        {showShop && <span className="mp-seller">{product.merchantName}</span>}
      </span>
    </button>
  )
}

// Grey cards in the shape of product cards, shown while the first page of products loads.
export function ProductSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="mp-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="mp-skeleton">
          <span className="mp-skeleton-photo" />
          <span className="mp-skeleton-line" />
          <span className="mp-skeleton-line short" />
        </li>
      ))}
    </ul>
  )
}

export function ProductGrid({ result, pageSize, page, onPage, onOpenProduct, showShop = true, busy = false }: {
  result: ProductPage
  pageSize: number
  page: number
  onPage: (page: number) => void
  onOpenProduct: (id: string) => void
  // The shop name on each card (not needed on a shop's own page).
  showShop?: boolean
  // The next page is loading: the current cards are dimmed instead of disappearing.
  busy?: boolean
}) {
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize))
  return (
    <>
      {result.items.length > 0 && (
        <ul className={busy ? 'mp-grid busy' : 'mp-grid'} aria-busy={busy}>
          {result.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onOpen={onOpenProduct} showShop={showShop} />
            </li>
          ))}
        </ul>
      )}
      {result.total > pageSize && (
        <div className="mp-pager">
          <button type="button" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages || busy} onClick={() => onPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  )
}

const logoColours = ['#004D3B', '#0F766E', '#1D4ED8', '#7C3AED', '#B45309', '#BE123C', '#047857', '#4338CA']

export function ShopLogo({ name, logoUrl, size = 'normal' }: { name: string; logoUrl: string | null; size?: 'normal' | 'large' }) {
  const image = mediaUrl(logoUrl)
  const className = size === 'large' ? 'mp-shop-logo large' : 'mp-shop-logo'
  if (image) return <img className={className} src={image} alt="" />
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join('')
  const colour = logoColours[[...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % logoColours.length]
  return <span className={className} style={{ background: colour }} aria-hidden="true">{initials}</span>
}
