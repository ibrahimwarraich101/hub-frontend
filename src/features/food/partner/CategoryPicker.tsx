// File purpose: Restaurant Center settings: choose up to 3 HUB Food categories (from the list HUB's administrators keep)
// so customers find the restaurant when they browse, for example, "Biryani" or "Desserts".
import { useEffect, useState } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { foodPaths } from '../foodApi'
import type { MyRestaurantCategories } from '../foodApi'

export function CategoryPicker() {
  const { authFetch } = useAuth()
  const [data, setData] = useState<MyRestaurantCategories | null>(null)
  const [chosen, setChosen] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    authFetch<MyRestaurantCategories>(foodPaths.myCategories)
      .then((result) => { if (!cancelled) { setData(result); setChosen(result.selected) } })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof ApiError ? reason.message : 'Could not load categories.') })
    return () => { cancelled = true }
  }, [authFetch])

  function toggle(id: string) {
    setNotice(null)
    if (chosen.includes(id)) setChosen(chosen.filter((value) => value !== id))
    else if (data && chosen.length < data.maxSelected) setChosen([...chosen, id])
    else setError(`You can choose up to ${data?.maxSelected ?? 3} categories. Remove one first.`)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const result = await authFetch<MyRestaurantCategories>(foodPaths.myCategories, 'PUT', { categoryIds: chosen })
      setData(result)
      setChosen(result.selected)
      setNotice('Saved. Customers can now find you under these categories.')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not save your categories.')
    } finally {
      setBusy(false)
    }
  }

  const changed = data !== null && (chosen.length !== data.selected.length || chosen.some((id) => !data.selected.includes(id)))
  return (
    <section className="fd-panel" aria-label="Food categories">
      <h2>Food categories</h2>
      <p className="fd-meta">Where customers find you: choose up to {data?.maxSelected ?? 3}. When a customer taps one of these on the Food
        home, your restaurant is shown.</p>
      {!data && !error && <p className="fd-meta">Loading…</p>}
      {data && data.available.length === 0 && <p className="fd-meta">HUB has not added any categories yet.</p>}
      {data && data.available.length > 0 && (
        <div className="fd-pick-grid" role="group" aria-label="Categories">
          {data.available.map((category) => {
            const on = chosen.includes(category.id)
            return (
              <button key={category.id} type="button" className={on ? 'fd-pick on' : 'fd-pick'} aria-pressed={on} onClick={() => toggle(category.id)}>
                {category.imageUrl ? <img src={mediaUrl(category.imageUrl) ?? ''} alt="" /> : <span className="fd-pick-empty">{category.name.slice(0, 1)}</span>}
                <span>{category.name}</span>
              </button>
            )
          })}
        </div>
      )}
      {error && <p className="fd-message error" role="alert">{error}</p>}
      {notice && <p className="fd-message" role="status">{notice}</p>}
      {data && data.available.length > 0 && (
        <div className="fd-actions">
          <button type="button" className="fd-primary" disabled={busy || !changed} onClick={() => void save()}>{busy ? 'Saving…' : 'Save categories'}</button>
          <span className="fd-meta">{chosen.length} of {data.maxSelected} chosen</span>
        </div>
      )}
    </section>
  )
}
