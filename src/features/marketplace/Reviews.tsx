// File purpose: Product reviews on the website: star display, the reviews section of the product page, and the
// "Rate your items" panel on a delivered order (write or change a review, all errors shown on the page).
import { useEffect, useState } from 'react'
import { ApiError, mediaUrl } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import type { Order, OrderItem } from './ordersApi'
import { fetchProductReviews, ratingWords, reviewPaths, validateReview } from './reviewsApi'
import type { MyReview, ProductReviewPage } from './reviewsApi'

// Read-only stars; partly filled for averages like 4.5.
export function Stars({ value, size = 'normal' }: { value: number; size?: 'normal' | 'large' }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span className={`mp-stars ${size}`} role="img" aria-label={`${value} out of 5 stars`}>
      <span className="mp-stars-empty" aria-hidden="true">★★★★★</span>
      <span className="mp-stars-full" aria-hidden="true" style={{ width: `${percent}%` }}>★★★★★</span>
    </span>
  )
}

// Small "4.5 (12)" line for product cards and the product title.
export function RatingLine({ average, count }: { average: number | null; count: number }) {
  if (!count || average === null) return <span className="mp-rating-line mp-hint">No reviews yet</span>
  return (
    <span className="mp-rating-line">
      <Stars value={average} /> <strong>{average.toFixed(1)}</strong> <span className="mp-hint">({count} review{count === 1 ? '' : 's'})</span>
    </span>
  )
}

const shortDate = (value: string) => new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

// The reviews section at the bottom of the product page.
export function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductReviewPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchProductReviews(productId, 1, controller.signal)
      .then((page) => { setData(page); setError(null) })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof ApiError ? failure.message : 'Could not load reviews.') })
    return () => controller.abort()
  }, [productId])

  async function more() {
    if (!data) return
    setLoadingMore(true)
    try {
      const next = await fetchProductReviews(productId, data.page + 1)
      setData({ ...next, items: [...data.items, ...next.items] })
    } catch {
      setError('Could not load more reviews. Please try again.')
    } finally { setLoadingMore(false) }
  }

  return (
    <section className="mp-reviews" id="reviews" aria-label="Customer reviews">
      <h2>Customer reviews</h2>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {!data && !error && <p className="mp-hint">Loading reviews…</p>}
      {data && data.summary.count === 0 && <p className="mp-hint">No reviews yet. Reviews come from customers who bought and received this product.</p>}
      {data && data.summary.count > 0 && (
        <>
          <div className="mp-review-summary">
            <div className="mp-review-score">
              <strong>{data.summary.average?.toFixed(1)}</strong>
              <Stars value={data.summary.average ?? 0} size="large" />
              <span className="mp-hint">{data.summary.count} review{data.summary.count === 1 ? '' : 's'}</span>
            </div>
            <div className="mp-review-bars">
              {data.summary.starCounts.map((count, index) => {
                const stars = 5 - index
                return (
                  <div key={stars} className="mp-review-bar">
                    <span>{stars} star{stars === 1 ? '' : 's'}</span>
                    <span className="mp-bar" aria-hidden="true"><span style={{ width: `${(count / data.summary.count) * 100}%` }} /></span>
                    <span className="mp-hint">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <ul className="mp-review-list">
            {data.items.map((review) => (
              <li key={review.id}>
                <div className="mp-review-head">
                  <Stars value={review.rating} />
                  <strong>{ratingWords[review.rating]}</strong>
                </div>
                {review.comment && <p>{review.comment}</p>}
                <p className="mp-hint">
                  {review.authorName} · {shortDate(review.createdAt)}{review.edited ? ' · edited' : ''}
                  {(review.color || review.size) && ` · Bought: ${[review.color, review.size].filter(Boolean).join(', ')}`}
                </p>
              </li>
            ))}
          </ul>
          {data.items.length < data.total && (
            <button type="button" className="mp-link" disabled={loadingMore} onClick={() => void more()}>
              {loadingMore ? 'Loading…' : 'Show more reviews'}
            </button>
          )}
        </>
      )}
    </section>
  )
}

// "Rate your items" on a delivered order.
export function OrderReviews({ order, onSaved }: { order: Order; onSaved: (itemId: string, review: MyReview) => void }) {
  return (
    <section className="mp-panel" aria-label="Rate your items">
      <h3>Rate your items</h3>
      <p className="mp-hint">Your stars and words help other customers. Only your first name and the first letter of your last name are shown.</p>
      {order.items.map((item) => <ItemReview key={item.id} orderId={order.id} item={item} onSaved={(review) => onSaved(item.id, review)} />)}
    </section>
  )
}

function ItemReview({ orderId, item, onSaved }: { orderId: string; item: OrderItem; onSaved: (review: MyReview) => void }) {
  const { authFetch } = useAuth()
  const review = item.review
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [comment, setComment] = useState(review?.comment ?? '')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const errors = tried ? validateReview(rating, comment) : {}

  function open() {
    setRating(review?.rating ?? 0)
    setComment(review?.comment ?? '')
    setTried(false)
    setError(null)
    setSaved(false)
    setEditing(true)
  }

  async function save() {
    setTried(true)
    setError(null)
    if (Object.keys(validateReview(rating, comment)).length > 0) return
    setBusy(true)
    try {
      const result = await authFetch<MyReview>(reviewPaths.write(orderId, item.id), 'PUT', { rating, comment: comment.trim() || null })
      onSaved(result)
      setEditing(false)
      setSaved(true)
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Your review could not be saved. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="mp-item-review">
      <div className="mp-item-review-head">
        {item.imageUrl ? <img src={mediaUrl(item.imageUrl) ?? ''} alt="" /> : <span className="mp-noimage">No photo</span>}
        <div>
          <strong>{item.name}</strong>
          {(item.color || item.size) && <span className="mp-hint"> ({[item.color, item.size].filter(Boolean).join(', ')})</span>}
          {review && !editing && (
            <div className="mp-my-review">
              <Stars value={review.rating} /> <strong>{ratingWords[review.rating]}</strong>
              {review.comment && <p>{review.comment}</p>}
              {review.hiddenByHub && <p className="mp-message error">HUB has hidden this review from the product page. Reason: {review.hiddenReason}</p>}
            </div>
          )}
        </div>
        {!editing && (
          <button type="button" className={review ? 'mp-link' : 'mp-primary'} onClick={open}>
            {review ? 'Edit review' : 'Write a review'}
          </button>
        )}
      </div>
      {saved && !editing && <p className="mp-message" role="status">Thank you! Your review is saved.</p>}
      {editing && (
        <div className="mp-form">
          <div className={errors.rating ? 'mp-choice invalid' : 'mp-choice'}>
            <span id={`stars-${item.id}`}>How many stars?</span>
            <div className="mp-chips" role="radiogroup" aria-labelledby={`stars-${item.id}`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" role="radio" aria-checked={rating === value}
                  className={rating === value ? 'mp-chip active' : 'mp-chip'} onClick={() => setRating(value)}>
                  {value} {ratingWords[value]}
                </button>
              ))}
            </div>
            {errors.rating && <span className="auth-field-error">{errors.rating}</span>}
          </div>
          <label className={errors.comment ? 'auth-field invalid' : 'auth-field'}>
            Your review (optional)
            <textarea rows={3} value={comment} maxLength={1100} onChange={(event) => setComment(event.target.value)}
              placeholder="What did you like or not like?" aria-invalid={errors.comment ? true : undefined} />
            {errors.comment ? <span className="auth-field-error">{errors.comment}</span> : <span className="mp-hint">{comment.trim().length} / 1000</span>}
          </label>
          {error && <p className="mp-message error" role="alert">{error}</p>}
          <div className="mp-actions">
            <button type="button" className="mp-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save review'}</button>
            <button type="button" className="mp-link" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
