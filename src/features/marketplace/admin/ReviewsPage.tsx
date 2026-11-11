// File purpose: Admin "Reviews": read every product review, filter by shown/hidden and stars, and hide a bad review
// with a reason (the buyer is told; it is written to the activity log). Hidden reviews can be shown again.
import { useState } from 'react'
import { useAuth } from '../../../shared/auth/AuthContext'
import { dateTime } from '../../admin/adminApi'
import { Pager } from '../../admin/Pager'
import { ReasonAction } from '../../admin/ReasonAction'
import type { AdminRoute } from '../../admin/sections'
import { useAdminData } from '../../admin/useAdminData'
import { Stars } from '../Reviews'
import { ratingWords, reviewPaths } from '../reviewsApi'
import type { AdminReview, AdminReviewPage } from '../reviewsApi'

const visibilityFilters = [
  { value: 'all', label: 'All reviews' },
  { value: 'visible', label: 'Shown to customers' },
  { value: 'hidden', label: 'Hidden by HUB' },
]

export function ReviewsPage({ tab, go }: { tab: string | null; go: (route: AdminRoute) => void }) {
  const { authFetch } = useAuth()
  const filter = visibilityFilters.some((option) => option.value === tab) ? tab! : 'all'
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ search: '', rating: '', page: 1 })
  const { data, error, loading, reload } = useAdminData<AdminReviewPage>(reviewPaths.admin({ ...filters, filter }))
  const [notice, setNotice] = useState<string | null>(null)

  const act = async (review: AdminReview, hide: boolean, reason: string) => {
    await authFetch<AdminReview>(hide ? reviewPaths.hide(review.id) : reviewPaths.unhide(review.id), 'POST', { reason })
    setNotice(hide ? `The review of "${review.productName}" is hidden. The buyer has been told why.`
      : `The review of "${review.productName}" is shown again. The buyer has been told.`)
    reload()
  }

  return (
    <div className="adm-stack">
      <div className="hub-card adm-panel">
        <form className="adm-filters" role="search" onSubmit={(event) => { event.preventDefault(); setFilters({ ...filters, search: search.trim(), page: 1 }) }}>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100}
            placeholder="Search words, product, store or buyer" aria-label="Search reviews" />
          <select value={filter} onChange={(event) => { setFilters({ ...filters, page: 1 }); go({ section: 'reviews', id: event.target.value === 'all' ? null : event.target.value }) }}
            aria-label="Shown or hidden">
            {visibilityFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={filters.rating} onChange={(event) => setFilters({ ...filters, rating: event.target.value, page: 1 })} aria-label="Stars">
            <option value="">Any stars</option>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>)}
          </select>
          <button type="submit" className="hub-button small">Search</button>
        </form>
      </div>

      {error && <p className="adm-alert error" role="alert">{error}</p>}
      {notice && <p className="adm-alert success" role="status">{notice}</p>}
      <div className="hub-card adm-panel">
        <p className="adm-muted">{data ? `${data.total} review${data.total === 1 ? '' : 's'}` : 'Loading…'}{loading && data ? ' · updating…' : ''}</p>
        {data && data.items.length === 0 && <p className="adm-empty">No reviews match these filters.</p>}
        {data && data.items.map((review) => (
          <article key={review.id} className="sa-review">
            <div className="sa-review-head">
              <Stars value={review.rating} />
              <strong>{ratingWords[review.rating]}</strong>
              <span className={`hub-pill ${review.visibility === 'Hidden' ? 'error' : 'success'}`}>
                {review.visibility === 'Hidden' ? 'Hidden by HUB' : 'Shown'}
              </span>
            </div>
            {review.comment ? <p className="sa-review-text">{review.comment}</p> : <p className="adm-muted">Stars only, no text.</p>}
            <p className="adm-muted">
              <button type="button" className="adm-link" onClick={() => go({ section: 'products', id: review.productId })}>{review.productName}</button>
              {' '}from {review.merchantName} · by{' '}
              <button type="button" className="adm-link" onClick={() => go({ section: 'users', id: review.authorUserId })}>{review.authorName}</button>
              {' '}· order {review.orderNumber} · {dateTime(review.createdAt)}{review.updatedAt !== review.createdAt ? ' (edited)' : ''}
            </p>
            {review.visibility === 'Hidden' && (
              <p className="adm-alert error">
                Hidden by {review.hiddenByName ?? 'an administrator'}{review.hiddenAt ? ` on ${dateTime(review.hiddenAt)}` : ''}. Reason: {review.hiddenReason}
              </p>
            )}
            {review.visibility === 'Hidden' ? (
              <ReasonAction label="Show again" onConfirm={(reason) => act(review, false, reason)}
                explanation="The review goes back on the product page and counts in the rating again. The buyer is notified." />
            ) : (
              <ReasonAction label="Hide review" tone="danger" onConfirm={(reason) => act(review, true, reason)}
                explanation="Customers stop seeing this review and it no longer counts in the product's rating. The buyer sees your reason." />
            )}
          </article>
        ))}
        {data && <Pager page={filters.page} total={data.total} pageSize={data.pageSize} onPage={(page) => setFilters({ ...filters, page })} />}
      </div>
    </div>
  )
}
