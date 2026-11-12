// File purpose: Admin "Products": find any seller's product, see everything about it, and hide it from the store
// with a reason (the seller is told why and cannot show it again until an administrator allows it).
import { useState } from 'react'
import { mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { dateTime } from '../../admin/adminApi'
import { Pager } from '../../admin/Pager'
import { ReasonAction } from '../../admin/ReasonAction'
import type { AdminRoute } from '../../admin/sections'
import { useAdminData } from '../../admin/useAdminData'
import { formatPrice } from '../api'
import { productStatusFilters, statusTone, storeAdminPaths } from './storeAdminApi'
import type { AdminCategory, AdminProductDetails, AdminProductPage } from './storeAdminApi'

export function ProductsPage({ productId, go }: { productId: string | null; go: (route: AdminRoute) => void }) {
  return productId ? <ProductDetailsView productId={productId} /> : <ProductList go={go} />
}

function ProductList({ go }: { go: (route: AdminRoute) => void }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '', categoryId: '', page: 1 })
  const categories = useAdminData<AdminCategory[]>(storeAdminPaths.categories)
  const { data, error, loading } = useAdminData<AdminProductPage>(storeAdminPaths.products(filters))
  const open = (id: string) => go({ section: 'products', id })

  return (
    <div className="adm-stack">
      <div className="hub-card adm-panel">
        <form className="adm-filters" role="search" onSubmit={(event) => { event.preventDefault(); setFilters({ ...filters, search: search.trim(), page: 1 }) }}>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100}
            placeholder="Search product or store name" aria-label="Search products" />
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })} aria-label="Status">
            {productStatusFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value, page: 1 })} aria-label="Category">
            <option value="">All categories</option>
            {(categories.data ?? []).flatMap((root) => [
              <option key={root.id} value={root.id}>{root.name}</option>,
              ...root.children.map((child) => <option key={child.id} value={child.id}>{root.name} › {child.name}</option>),
            ])}
          </select>
          <button type="submit" className="hub-button small">Search</button>
        </form>
      </div>

      {error && <p className="adm-alert error" role="alert">{error}</p>}
      <div className="hub-card adm-panel">
        <p className="adm-muted">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : 'Loading…'}{loading && data ? ' · updating…' : ''}</p>
        {data && data.items.length === 0 && <p className="adm-empty">No products match these filters.</p>}
        {data && data.items.length > 0 && (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th></th><th>Product</th><th>Store</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="adm-row-link" onClick={() => open(item.id)}>
                    <td>{item.imageUrl ? <img className="adm-thumb" src={mediaUrl(item.imageUrl) ?? ''} alt="" /> : <span className="adm-thumb" />}</td>
                    <td><button type="button" className="adm-link" onClick={(event) => { event.stopPropagation(); open(item.id) }}>{item.name}</button></td>
                    <td>{item.merchantName}</td>
                    <td>{item.categoryName}</td>
                    <td className="adm-nowrap">{formatPrice(item.salePrice ?? item.price, 'PKR')}</td>
                    <td>{item.totalStock ?? '—'}</td>
                    <td><span className={`hub-pill ${statusTone(item.status)}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={filters.page} total={data.total} pageSize={data.pageSize} onPage={(page) => setFilters({ ...filters, page })} />}
      </div>
    </div>
  )
}

function ProductDetailsView({ productId }: { productId: string }) {
  const { authFetch } = useAuth()
  const { data, error, replace } = useAdminData<AdminProductDetails>(storeAdminPaths.product(productId))
  const [notice, setNotice] = useState<string | null>(null)

  const act = async (hide: boolean, reason: string) => {
    replace(await authFetch<AdminProductDetails>(hide ? storeAdminPaths.hide(productId) : storeAdminPaths.unhide(productId), 'POST', { reason }))
    setNotice(hide ? 'The product is hidden from customers. The seller has been told why.' : 'The product is allowed in the store again. The seller has been told.')
  }

  return (
    <div className="adm-stack">
      {error && <p className="adm-alert error" role="alert">{error}</p>}
      {!data && !error && <p className="adm-muted">Loading…</p>}
      {data && (() => {
        const { product, summary } = data
        return (
          <>
            <section className="hub-card adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>{product.name}</h2>
                  <span className={`hub-pill ${statusTone(summary.status)}`}>{summary.status}</span>
                </div>
              </div>
              {product.adminHidden && (
                <p className="adm-alert error">
                  Hidden by {data.adminHiddenByName ?? 'an administrator'}{data.adminHiddenAt ? ` on ${dateTime(data.adminHiddenAt)}` : ''}. Reason: {product.adminHiddenReason}
                </p>
              )}
              <dl className="adm-facts">
                <dt>Store</dt><dd>{summary.merchantName} ({summary.merchantStatus})</dd>
                <dt>Category</dt><dd>{summary.categoryName}</dd>
                <dt>Price</dt>
                <dd>{formatPrice(product.salePrice ?? product.price, product.currency)}{product.salePrice !== null && ` (normal price ${formatPrice(product.price, product.currency)})`}</dd>
                <dt>Stock</dt><dd>{summary.totalStock ?? 'Not tracked'}</dd>
                <dt>Seller's switch</dt><dd>{product.active ? 'Shown in store' : 'Hidden by the seller'}</dd>
                <dt>Last changed</dt><dd>{dateTime(product.updatedAt)}</dd>
              </dl>
              {notice && <p className="adm-alert success" role="status">{notice}</p>}
              {product.adminHidden ? (
                <ReasonAction label="Allow in store again" onConfirm={(reason) => act(false, reason)}
                  explanation="The product goes back to the store (if the seller has it switched on). The seller is notified." />
              ) : (
                <ReasonAction label="Hide from store" tone="danger" onConfirm={(reason) => act(true, reason)}
                  explanation="Customers stop seeing this product at once. The seller sees your reason and cannot show it again until an administrator allows it." />
              )}
            </section>

            {product.images.length > 0 && (
              <section className="hub-card adm-panel">
                <h2>Photos</h2>
                <div className="st-photos">
                  {product.images.map((image, index) => <img key={image.id} src={mediaUrl(image.url) ?? ''} alt={`Photo ${index + 1}`} />)}
                </div>
              </section>
            )}

            <section className="hub-card adm-panel">
              <h2>Description</h2>
              <p className="st-description">{product.description || <span className="adm-muted">No description.</span>}</p>
              {product.variants.length > 0 && (
                <>
                  <h3>Options</h3>
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead><tr><th>Colour</th><th>Size</th><th>Stock</th></tr></thead>
                      <tbody>
                        {product.variants.map((variant) => (
                          <tr key={variant.id}><td>{variant.color ?? '—'}</td><td>{variant.size ?? '—'}</td><td>{variant.stockQuantity}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {product.specs.length > 0 && (
                <>
                  <h3>Specifications</h3>
                  <dl className="adm-facts">
                    {product.specs.map((spec) => <SpecPair key={spec.name} name={spec.name} value={spec.value} />)}
                  </dl>
                </>
              )}
            </section>
          </>
        )
      })()}
    </div>
  )
}

function SpecPair({ name, value }: { name: string; value: string }) {
  return <><dt>{name}</dt><dd>{value}</dd></>
}
