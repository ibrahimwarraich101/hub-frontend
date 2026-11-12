// File purpose: Pieces shared by the store home and the shop pages: the product card grid with paging, and a shop's
// logo (its initials in a coloured circle when the shop has no logo).
import { mediaUrl } from '../../shared/api/client'
import { formatPrice } from './api'
import type { ProductPage } from './api'
import { RatingLine } from './Reviews'

export function ProductGrid({ result, pageSize, page, onPage, onOpenProduct, showShop = true }: {
  result: ProductPage
  pageSize: number
  page: number
  onPage: (page: number) => void
  onOpenProduct: (id: string) => void
  // The shop name on each card (not needed on a shop's own page).
  showShop?: boolean
}) {
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize))
  return (
    <>
      {result.items.length > 0 && (
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
                  {showShop && <span className="mp-seller">{product.merchantName}</span>}
                  {!product.inStock && <span className="mp-badge">Out of stock</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {result.total > pageSize && (
        <div className="mp-pager">
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
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
