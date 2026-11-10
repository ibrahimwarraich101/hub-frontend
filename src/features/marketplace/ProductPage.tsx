// File purpose: E-Commerce product page: photos (open big with left/right), price, colour/size choice, quantity,
// stock, seller, description, specifications and the "Add to cart" button.
import { useEffect, useRef, useState } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { fetchProduct, formatPrice } from './api'
import type { ProductDetails, ProductVariant } from './api'
import { cartPaths } from './cartApi'
import type { Cart } from './cartApi'

type Props = {
  productId: string
  onBack: () => void
  // New number of items in the cart after adding.
  onCount: (count: number) => void
  onOpenCart: () => void
}

// Most units one order line can ask for when stock is not tracked.
const MaxQuantity = 99

export function ProductPage({ productId, onBack, onCount, onOpenCart }: Props) {
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load the product. The parent gives each product its own key, so state starts fresh for every product.
  useEffect(() => {
    const controller = new AbortController()
    fetchProduct(productId, controller.signal)
      .then(setProduct)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof ApiError && reason.status === 404
          ? 'This product is no longer available.'
          : reason instanceof ApiError ? reason.message : 'Something went wrong while loading this product.')
      })
    return () => controller.abort()
  }, [productId])

  return (
    <div className="mp-product">
      <button type="button" className="mp-back" onClick={onBack}>
        Back to store
      </button>

      {error && <div className="mp-message error" role="alert">{error}</div>}
      {!error && !product && <div className="mp-message">Loading product…</div>}
      {product && <ProductBody product={product} onCount={onCount} onOpenCart={onOpenCart} />}
    </div>
  )
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))]
}

function ProductBody({ product, onCount, onOpenCart }: { product: ProductDetails; onCount: (count: number) => void; onOpenCart: () => void }) {
  const { authFetch } = useAuth()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const colors = unique(product.variants.map((v) => v.color))
  const sizes = unique(product.variants.map((v) => v.size))
  // With a single choice there is nothing to pick, so it starts selected.
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0] : null)
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null)
  const [quantity, setQuantity] = useState(1)
  const [photo, setPhoto] = useState(0)
  const [viewer, setViewer] = useState(false)
  const [choiceError, setChoiceError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const hasOptions = product.variants.length > 0
  const matches = (v: ProductVariant, c: string | null, s: string | null) =>
    (colors.length === 0 || v.color === c) && (sizes.length === 0 || v.size === s)
  const selected = hasOptions ? product.variants.find((v) => matches(v, color, size)) ?? null : null
  // A colour is greyed out when every size of it is sold out; a size is greyed out when it is sold out in the chosen colour.
  const colorAvailable = (c: string) => product.variants.some((v) => v.color === c && v.inStock)
  const sizeAvailable = (s: string) => product.variants.some((v) => v.size === s && v.inStock && (color === null || colors.length === 0 || v.color === color))

  // Units the customer can choose right now.
  const stock = hasOptions ? selected?.stockQuantity ?? null : product.stockQuantity
  const maxQuantity = Math.max(1, Math.min(stock ?? MaxQuantity, MaxQuantity))
  const soldOut = hasOptions ? (selected ? !selected.inStock : !product.inStock) : !product.inStock

  function chooseColor(value: string) {
    setColor(value)
    setChoiceError(null)
    setNotice(null)
    setQuantity(1)
    // Keep the size only if it is still available in the new colour.
    if (size !== null && !product.variants.some((v) => v.color === value && v.size === size && v.inStock)) setSize(sizes.length === 1 ? size : null)
  }

  function chooseSize(value: string) {
    setSize(value)
    setChoiceError(null)
    setNotice(null)
    setQuantity(1)
  }

  async function addToCart() {
    setNotice(null)
    setAdded(false)
    if (hasOptions && !selected) {
      const missing = [colors.length > 0 && color === null ? 'a colour' : null, sizes.length > 0 && size === null ? 'a size' : null]
        .filter(Boolean).join(' and ')
      setChoiceError(`Please choose ${missing || 'an available option'} first.`)
      return
    }
    const choice = [selected?.color, selected?.size].filter(Boolean).join(', ')
    setAdding(true)
    try {
      const cart = await authFetch<Cart>(cartPaths.items, 'POST', { productId: product.id, variantId: selected?.id ?? null, quantity })
      onCount(cart.itemCount)
      setAdded(true)
      setNotice(`Added ${quantity} × ${product.name}${choice ? ` (${choice})` : ''} to your cart.`)
    } catch (reason) {
      // Only what the page cannot know (stock changed a moment ago, your own store, server down) comes from the server.
      setChoiceError(reason instanceof ApiError ? reason.message : 'Could not add to your cart. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const stockText = soldOut ? (selected ? 'This option is sold out' : 'Out of stock')
    : stock !== null ? (selected || !hasOptions ? `${stock} in stock` : 'In stock')
      : 'In stock'

  return (
    <div className="mp-product-body">
      <div className="mp-gallery">
        {product.imageUrls.length > 0 ? (
          <>
            <button type="button" className="mp-main-button" onClick={() => setViewer(true)} aria-label="Open photo full size">
              <img className="mp-main-photo" src={mediaUrl(product.imageUrls[photo]) ?? ''} alt={product.name} />
            </button>
            {product.imageUrls.length > 1 && (
              <div className="mp-thumbs">
                {product.imageUrls.map((url, index) => (
                  <button key={url} type="button" className={index === photo ? 'active' : ''} onClick={() => setPhoto(index)}
                    aria-label={`Photo ${index + 1}`}>
                    <img src={mediaUrl(url) ?? ''} alt="" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="mp-noimage large">No photo</div>
        )}
      </div>

      <div className="mp-info">
        <p className="mp-breadcrumb">{product.category.name}</p>
        <h1>{product.name}</h1>
        <p className="mp-price large">
          {formatPrice(product.salePrice ?? product.price, product.currency)}
          {product.salePrice !== null && <s>{formatPrice(product.price, product.currency)}</s>}
        </p>

        {colors.length > 0 && (
          <div className="mp-choice">
            <span>Colour: <strong>{color ?? 'choose one'}</strong></span>
            <div className="mp-chips" role="radiogroup" aria-label="Colour">
              {colors.map((value) => (
                <button key={value} type="button" role="radio" aria-checked={color === value} disabled={!colorAvailable(value)}
                  className={color === value ? 'mp-chip active' : 'mp-chip'} onClick={() => chooseColor(value)}
                  title={colorAvailable(value) ? undefined : 'Sold out'}>
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="mp-choice">
            <span>Size: <strong>{size ?? 'choose one'}</strong></span>
            <div className="mp-chips" role="radiogroup" aria-label="Size">
              {sizes.map((value) => (
                <button key={value} type="button" role="radio" aria-checked={size === value} disabled={!sizeAvailable(value)}
                  className={size === value ? 'mp-chip active' : 'mp-chip'} onClick={() => chooseSize(value)}
                  title={sizeAvailable(value) ? undefined : 'Sold out'}>
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}
        {choiceError && <p className="mp-choice-error" role="alert">{choiceError}</p>}

        <p className={soldOut ? 'mp-stock out' : 'mp-stock'}>{stockText}</p>

        <div className="mp-choice">
          <span>Quantity</span>
          <div className="mp-quantity">
            <button type="button" onClick={() => setQuantity(quantity - 1)} disabled={soldOut || quantity <= 1} aria-label="One less">−</button>
            <output aria-live="polite" aria-label="Quantity">{quantity}</output>
            <button type="button" onClick={() => setQuantity(quantity + 1)} disabled={soldOut || quantity >= maxQuantity} aria-label="One more">+</button>
          </div>
          {!soldOut && quantity >= maxQuantity && stock !== null && <span className="mp-hint">Only {stock} available.</span>}
        </div>

        <p className="mp-seller">Sold by {product.merchant.name}</p>
        <button type="button" className="mp-primary" disabled={soldOut || adding} onClick={() => void addToCart()}>{adding ? 'Adding…' : 'Add to cart'}</button>
        {notice && (
          <div className="mp-message mp-added" role="status">
            <span>{notice}</span>
            {added && <button type="button" className="mp-primary" onClick={onOpenCart}>Go to cart</button>}
          </div>
        )}

        {product.description && (
          <>
            <h2>Description</h2>
            <p className="mp-description">{product.description}</p>
          </>
        )}
        {product.specs.length > 0 && (
          <>
            <h2>Specifications</h2>
            <table className="mp-specs">
              <tbody>
                {product.specs.map((spec) => (
                  <tr key={spec.name}><th scope="row">{spec.name}</th><td>{spec.value}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {viewer && (
        <PhotoViewer urls={product.imageUrls} index={photo} name={product.name} onIndex={setPhoto} onClose={() => setViewer(false)} />
      )}
    </div>
  )
}

type ViewerProps = { urls: string[]; index: number; name: string; onIndex: (index: number) => void; onClose: () => void }

// Full-screen photo viewer: Previous/Next buttons or the left/right arrow keys move between photos, Esc or clicking outside closes it.
function PhotoViewer({ urls, index, name, onIndex, onClose }: ViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const go = (by: number) => onIndex((index + by + urls.length) % urls.length)
  // Latest values for the key handler without re-attaching it on every change.
  const goRef = useRef(go)
  const closeHandler = useRef(onClose)
  useEffect(() => {
    goRef.current = go
    closeHandler.current = onClose
  })

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeHandler.current()
      else if (event.key === 'ArrowLeft') goRef.current(-1)
      else if (event.key === 'ArrowRight') goRef.current(1)
    }
    document.addEventListener('keydown', onKey)
    // Stop the page behind from scrolling while the viewer is open.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div className="mp-viewer" role="dialog" aria-modal="true" aria-label={`${name} photos`} onClick={onClose}>
      <button ref={closeRef} type="button" className="mp-viewer-close" onClick={onClose} aria-label="Close">Close</button>
      {urls.length > 1 && (
        <button type="button" className="mp-viewer-nav prev" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Previous photo">Previous</button>
      )}
      <img src={mediaUrl(urls[index]) ?? ''} alt={`${name}, photo ${index + 1} of ${urls.length}`} onClick={(e) => e.stopPropagation()} />
      {urls.length > 1 && (
        <button type="button" className="mp-viewer-nav next" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Next photo">Next</button>
      )}
      <p className="mp-viewer-count">{index + 1} / {urls.length}</p>
    </div>
  )
}
