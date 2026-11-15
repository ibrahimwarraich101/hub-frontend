// File purpose: Admin portal (HUB Food part): the food categories customers browse by (Pizza, Biryani...). Add a category,
// rename it, change its order, give it a photo, or hide it. Categories are never deleted, only hidden.
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { foodPaths } from '../foodApi'
import type { AdminCategory } from '../foodApi'
import { PhotoButton } from '../partner/PhotoButton'

export function AdminCategories() {
  const { authFetch } = useAuth()
  const [items, setItems] = useState<AdminCategory[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    authFetch<AdminCategory[]>(foodPaths.adminCategories)
      .then((result) => { setItems(result); setError(null) })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Could not load categories.'))
  }, [authFetch])

  useEffect(() => { load() }, [load])

  async function add(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) return setError('Write a name of 2 to 40 characters.')
    setBusy(true)
    setError(null)
    try {
      // New categories go to the end of the list.
      const last = Math.max(0, ...(items ?? []).map((item) => item.sortOrder))
      const made = await authFetch<AdminCategory>(foodPaths.adminCategories, 'POST', { name: name.trim(), sortOrder: Math.min(10000, last + 10) })
      setName('')
      setNotice(`Added "${made.name}". Add a photo so it looks good on the Food home.`)
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not add the category.')
    } finally {
      setBusy(false)
    }
  }

  function saved(updated: AdminCategory, text?: string) {
    setItems((current) => current && current.map((item) => item.id === updated.id ? updated : item))
    if (text) setNotice(text)
  }

  const active = items?.filter((item) => item.active) ?? []
  const hidden = items?.filter((item) => !item.active) ?? []
  return (
    <>
      <form className="fd-admin-filters" onSubmit={add}>
        <input aria-label="New category name" placeholder="New category, for example Halwa Puri" value={name} maxLength={40}
          onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="fd-primary" disabled={busy}>{busy ? 'Adding…' : 'Add category'}</button>
      </form>
      <p className="fd-meta">Customers see active categories on the Food home, in this order. Each restaurant picks up to 3 in its settings.</p>
      {notice && <div className="fd-message" role="status">{notice}</div>}
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {!error && !items && <div className="fd-message">Loading…</div>}
      {items && items.length === 0 && <div className="fd-message">No categories yet. Add the first one above.</div>}
      {active.length > 0 && <h2 className="fd-results">Shown to customers ({active.length})</h2>}
      <ul className="fd-cat-list">
        {active.map((item, index) => (
          <CategoryRow key={item.id} item={item} up={active[index - 1]} down={active[index + 1]} onSaved={saved} onError={setError} />
        ))}
      </ul>
      {hidden.length > 0 && <h2 className="fd-results">Hidden ({hidden.length})</h2>}
      <ul className="fd-cat-list">
        {hidden.map((item) => <CategoryRow key={item.id} item={item} onSaved={saved} onError={setError} />)}
      </ul>
    </>
  )
}

type RowProps = {
  item: AdminCategory
  up?: AdminCategory
  down?: AdminCategory
  onSaved: (item: AdminCategory, text?: string) => void
  onError: (text: string | null) => void
}

function CategoryRow({ item, up, down, onSaved, onError }: RowProps) {
  const { authFetch } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [busy, setBusy] = useState(false)

  async function update(change: Partial<Pick<AdminCategory, 'name' | 'sortOrder' | 'active'>>, text?: string) {
    setBusy(true)
    onError(null)
    try {
      const result = await authFetch<AdminCategory>(foodPaths.adminCategory(item.id), 'PUT', {
        name: change.name ?? item.name, sortOrder: change.sortOrder ?? item.sortOrder, active: change.active ?? item.active,
        expectedVersion: item.version,
      })
      onSaved(result, text)
      setEditing(false)
      return result
    } catch (reason) {
      onError(reason instanceof ApiError ? reason.message : 'Could not save the category.')
      return null
    } finally {
      setBusy(false)
    }
  }

  // Moving swaps the order number with the neighbour (both are saved).
  async function move(other: AdminCategory) {
    const mine = item.sortOrder === other.sortOrder ? other.sortOrder + (other === up ? -1 : 1) : other.sortOrder
    const theirs = item.sortOrder
    setBusy(true)
    onError(null)
    try {
      const a = await authFetch<AdminCategory>(foodPaths.adminCategory(item.id), 'PUT',
        { name: item.name, sortOrder: Math.max(0, mine), active: item.active, expectedVersion: item.version })
      const b = await authFetch<AdminCategory>(foodPaths.adminCategory(other.id), 'PUT',
        { name: other.name, sortOrder: theirs, active: other.active, expectedVersion: other.version })
      onSaved(a)
      onSaved(b)
    } catch (reason) {
      onError(reason instanceof ApiError ? reason.message : 'Could not move the category. Reload and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto() {
    setBusy(true)
    try { onSaved(await authFetch<AdminCategory>(foodPaths.adminCategoryPhoto(item.id), 'DELETE')) }
    catch (reason) { onError(reason instanceof ApiError ? reason.message : 'Could not remove the photo.') }
    finally { setBusy(false) }
  }

  return (
    <li className={item.active ? 'fd-cat-row' : 'fd-cat-row hidden'}>
      <span className="fd-cuisine-photo fd-cat-photo">
        {item.imageUrl ? <img src={mediaUrl(item.imageUrl) ?? ''} alt="" /> : <span className="fd-pick-empty">{item.name.slice(0, 1)}</span>}
      </span>
      <div className="fd-cat-main">
        {editing ? (
          <form className="fd-cat-edit" onSubmit={(e) => { e.preventDefault(); void update({ name: name.trim() }, `Renamed to "${name.trim()}".`) }}>
            <input aria-label="Category name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
            <button type="submit" className="fd-primary" disabled={busy || name.trim().length < 2}>Save</button>
            <button type="button" className="fd-link" onClick={() => { setEditing(false); setName(item.name) }}>Cancel</button>
          </form>
        ) : (
          <>
            <strong>{item.name}</strong>
            <span className="fd-meta">{item.restaurantCount} {item.restaurantCount === 1 ? 'restaurant' : 'restaurants'}{!item.imageUrl && ' · no photo yet'}</span>
          </>
        )}
      </div>
      <div className="fd-cat-actions">
        {item.active && (
          <>
            <button type="button" className="fd-icon-button" aria-label={`Move ${item.name} up`} disabled={busy || !up} onClick={() => up && void move(up)}>↑</button>
            <button type="button" className="fd-icon-button" aria-label={`Move ${item.name} down`} disabled={busy || !down} onClick={() => down && void move(down)}>↓</button>
          </>
        )}
        {!editing && <button type="button" className="fd-link" onClick={() => setEditing(true)}>Rename</button>}
        <PhotoButton<AdminCategory> path={foodPaths.adminCategoryPhoto(item.id)} label={item.imageUrl ? 'Change photo' : 'Add photo'} className="fd-link"
          onUploaded={(result) => onSaved(result, `New photo for "${result.name}".`)} onError={onError} />
        {item.imageUrl && <button type="button" className="fd-link" disabled={busy} onClick={() => void removePhoto()}>Remove photo</button>}
        <button type="button" className={item.active ? 'fd-danger' : 'fd-secondary'} disabled={busy}
          onClick={() => void update({ active: !item.active }, item.active ? `"${item.name}" is hidden from customers.` : `"${item.name}" is shown again.`)}>
          {item.active ? 'Hide' : 'Show again'}
        </button>
      </div>
    </li>
  )
}
