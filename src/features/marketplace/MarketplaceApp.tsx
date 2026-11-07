// File purpose: Entry point of the E-Commerce store on the website: switches between the store home and a product page.
// Simple in-page navigation for now; it will move to the shared router when the common app shell arrives.
import { useState } from 'react'
import { ProductPage } from './ProductPage'
import { StoreHome } from './StoreHome'
import './marketplace.css'

type Props = {
  onExit?: () => void
}

export function MarketplaceApp({ onExit }: Props) {
  const [productId, setProductId] = useState<string | null>(null)

  return (
    <section className="mp-app" aria-label="HUB Store">
      <header className="mp-header">
        {onExit && (
          <button type="button" className="mp-back" onClick={onExit}>
            ← HUB
          </button>
        )}
        <h1>HUB Store</h1>
      </header>
      {productId && <ProductPage key={productId} productId={productId} onBack={() => setProductId(null)} />}
      {/* The store stays mounted (just hidden) so "Back" keeps the customer's search, category and page. */}
      <div hidden={productId !== null}>
        <StoreHome onOpenProduct={(id) => {
          setProductId(id)
          window.scrollTo({ top: 0 })
        }} />
      </div>
    </section>
  )
}
