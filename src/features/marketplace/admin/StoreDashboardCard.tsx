// File purpose: E-Commerce numbers on the admin dashboard; each number opens the matching admin page.
import { Stat } from '../../admin/DashboardPage'
import type { AdminRoute } from '../../admin/sections'
import { useAdminData } from '../../admin/useAdminData'
import { storeAdminPaths } from './storeAdminApi'
import type { StoreSummary } from './storeAdminApi'

export function StoreDashboardCard({ go }: { go: (route: AdminRoute) => void }) {
  const { data, error } = useAdminData<StoreSummary>(storeAdminPaths.summary)
  return (
    <section className="hub-card adm-panel" aria-label="E-Commerce store">
      <h2>E-Commerce store</h2>
      {error && <p className="adm-alert error" role="alert">{error}</p>}
      {!data && !error && <p className="adm-muted">Loading…</p>}
      {data && (
        <>
          {data.sellersPending > 0 && (
            <p className="adm-alert warning">
              {data.sellersPending} seller application{data.sellersPending === 1 ? ' is' : 's are'} waiting for your decision.
            </p>
          )}
          <h3>Sellers</h3>
          <div className="adm-stats">
            <Stat label="Waiting for approval" value={data.sellersPending} tone={data.sellersPending > 0 ? 'warning' : undefined}
              onClick={() => go({ section: 'sellers', id: 'Pending' })} />
            <Stat label="Approved stores" value={data.sellersApproved} tone="success" onClick={() => go({ section: 'sellers', id: 'Approved' })} />
            <Stat label="Suspended" value={data.sellersSuspended} onClick={() => go({ section: 'sellers', id: 'Suspended' })} />
            <Stat label="Rejected" value={data.sellersRejected} onClick={() => go({ section: 'sellers', id: 'Rejected' })} />
          </div>
          <h3>Products and categories</h3>
          <div className="adm-stats">
            <Stat label="Products in the store" value={data.productsInStore} tone="success" onClick={() => go({ section: 'products', id: null })} />
            <Stat label="Hidden by sellers" value={data.productsHiddenBySeller} onClick={() => go({ section: 'products', id: null })} />
            <Stat label="Hidden by HUB" value={data.productsHiddenByAdmin} tone={data.productsHiddenByAdmin > 0 ? 'error' : undefined}
              onClick={() => go({ section: 'products', id: null })} />
            <Stat label={`Categories (${data.categoriesHidden} hidden)`} value={data.categories} onClick={() => go({ section: 'categories', id: null })} />
          </div>
        </>
      )}
    </section>
  )
}
