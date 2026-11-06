// File purpose: E-Commerce product page: photos, price, stock, seller, description and the "Add to cart" button.
import { useEffect, useState } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { fetchProduct, formatPrice } from './api'
import type { ProductDetails } from './api'

type Props = {
  productId: string
  onBack: () => void
}

export function ProductPage({ productId, onBack }: Props) {
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

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
        ← Back to store
      </button>

      {error && <div className="mp-message error" role="alert">{error}</div>}
      {!error && !product && <div className="mp-message">Loading product…</div>}

      {product && (
        <div className="mp-product-body">
          <div className="mp-gallery">
            {product.imageUrls.length > 0 ? (
              <>
                <img className="mp-main-photo" src={mediaUrl(product.imageUrls[photo]) ?? ''} alt={product.name} />
                {product.imageUrls.length > 1 && (
                  <div className="mp-thumbs">
                    {product.imageUrls.map((url, index) => (
                      <button
                        key={url}
                        type="button"
                        className={index === photo ? 'active' : ''}
                        onClick={() => setPhoto(index)}
                        aria-label={`Photo ${index + 1}`}
                      >
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
            <p className={product.inStock ? 'mp-stock' : 'mp-stock out'}>
              {!product.inStock ? 'Out of stock' : product.stockQuantity !== null ? `${product.stockQuantity} in stock` : 'In stock'}
            </p>
            <p className="mp-seller">Sold by {product.merchant.name}</p>
            <button
              type="button"
              className="mp-primary"
              disabled={!product.inStock}
              onClick={() => setNotice('The cart is the next E-Commerce feature. This button will add the product to your cart.')}
            >
              Add to cart
            </button>
            {notice && <p className="mp-message" role="status">{notice}</p>}
            <h2>Description</h2>
            <p className="mp-description">{product.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
