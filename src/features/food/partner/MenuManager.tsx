// File purpose: The approved owner manages menu sections and dishes: add, edit price/name, mark sold out, archive.
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { foodPaths, money } from '../foodApi'
import type { MenuItem, OwnerMenu } from '../foodApi'

type Draft = { id: string | null; categoryId: string; name: string; description: string; price: string; available: boolean; archived: boolean; version: number | null }

const emptyDraft = (categoryId: string): Draft => ({ id: null, categoryId, name: '', description: '', price: '', available: true, archived: false, version: null })

export function MenuManager() {
  const { authFetch } = useAuth()
  const [menu, setMenu] = useState<OwnerMenu | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sectionName, setSectionName] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(() => {
    authFetch<OwnerMenu>(foodPaths.menu)
      .then((data) => { setMenu(data); setError(null) })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Could not load your menu.'))
  }, [authFetch])

  useEffect(() => { load() }, [load])

  async function save(path: string, method: string, body: unknown): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      setMenu(await authFetch<OwnerMenu>(path, method, body))
      return true
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not save. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addSection(event: FormEvent) {
    event.preventDefault()
    const name = sectionName.trim()
    if (!name || name.length > 60) return setError('Section names need 1 to 60 characters.')
    if (await save(foodPaths.categories, 'POST', { name, sortOrder: menu?.categories.length ?? 0, archived: false })) setSectionName('')
  }

  async function saveDish(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const price = Number(draft.price)
    if (!draft.name.trim() || draft.name.trim().length > 100) return setError('Dish names need 1 to 100 characters.')
    if (!Number.isFinite(price) || price < 1 || price > 100000) return setError('Price must be between Rs 1 and Rs 100,000.')
    if (draft.description.length > 500) return setError('Descriptions can be at most 500 characters.')
    const body = {
      categoryId: draft.categoryId, name: draft.name.trim(), description: draft.description.trim() || null, price,
      available: draft.available, archived: draft.archived, sortOrder: 0, expectedVersion: draft.version,
    }
    const ok = draft.id ? await save(foodPaths.item(draft.id), 'PUT', body) : await save(foodPaths.items, 'POST', body)
    if (ok) setDraft(null)
  }

  // Quick switches (sold out / archive) save straight away.
  const toggle = (item: MenuItem, change: Partial<Pick<MenuItem, 'available' | 'archived'>>) => void save(foodPaths.item(item.id), 'PUT', {
    categoryId: item.categoryId, name: item.name, description: item.description || null, price: item.price,
    available: change.available ?? item.available, archived: change.archived ?? item.archived, sortOrder: item.sortOrder, expectedVersion: item.version,
  })

  if (!menu) return error ? <div className="fd-message error" role="alert">{error}</div> : <div className="fd-message">Loading…</div>

  return (
    <>
      {error && <div className="fd-message error" role="alert">{error}</div>}
      <form className="fd-panel fd-form" onSubmit={addSection}>
        <h3>Add a menu section</h3>
        <div className="fd-actions">
          <input className="fd-grow" aria-label="Section name" placeholder="For example: Burgers, Drinks" value={sectionName}
            maxLength={60} onChange={(e) => setSectionName(e.target.value)} />
          <button type="submit" className="fd-primary" disabled={busy}>Add section</button>
        </div>
      </form>

      {menu.categories.length === 0 && <div className="fd-message">Start by adding a menu section, then add dishes to it.</div>}

      {menu.categories.map((category) => (
        <section key={category.id} className="fd-panel" aria-label={category.name}>
          <div className="fd-card-top">
            <h3>{category.name}{category.archived && ' (hidden)'}</h3>
            <span className="fd-actions">
              <button type="button" className="fd-link" disabled={busy}
                onClick={() => void save(foodPaths.category(category.id), 'PUT', { name: category.name, sortOrder: category.sortOrder, archived: !category.archived })}>
                {category.archived ? 'Show section' : 'Hide section'}
              </button>
              <button type="button" className="fd-secondary" onClick={() => setDraft(emptyDraft(category.id))}>Add dish</button>
            </span>
          </div>
          {category.items.length === 0 && <p className="fd-meta">No dishes yet.</p>}
          {category.items.map((item) => (
            <div key={item.id} className={item.archived ? 'fd-menu-item archived' : 'fd-menu-item'}>
              <span>
                <strong>{item.name}</strong> · {money(item.price)}
                {!item.available && <span className="fd-soldout"> · Sold out</span>}
                {item.archived && <span className="fd-meta"> · Removed from menu</span>}
                {item.description && <><br /><span className="fd-meta">{item.description}</span></>}
              </span>
              <span className="fd-actions">
                <button type="button" className="fd-link" disabled={busy} onClick={() => toggle(item, { available: !item.available })}>
                  {item.available ? 'Mark sold out' : 'Back in stock'}
                </button>
                <button type="button" className="fd-link" disabled={busy} onClick={() => toggle(item, { archived: !item.archived })}>
                  {item.archived ? 'Restore' : 'Remove'}
                </button>
                <button type="button" className="fd-link" onClick={() => setDraft({
                  id: item.id, categoryId: item.categoryId, name: item.name, description: item.description, price: String(item.price),
                  available: item.available, archived: item.archived, version: item.version,
                })}>Edit</button>
              </span>
            </div>
          ))}
        </section>
      ))}

      {draft && (
        <form className="fd-panel fd-form" onSubmit={saveDish} aria-label={draft.id ? 'Edit dish' : 'New dish'}>
          <h3>{draft.id ? 'Edit dish' : 'New dish'}</h3>
          <label className="auth-field">
            Section
            <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
              {menu.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="auth-field">
            Dish name
            <input value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="auth-field">
            Description (optional)
            <textarea rows={2} maxLength={500} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <label className="auth-field">
            Price (Rs)
            <input type="number" min={1} max={100000} step="any" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </label>
          <label className="fd-check">
            <input type="checkbox" checked={draft.available} onChange={(e) => setDraft({ ...draft, available: e.target.checked })} />
            Available to order
          </label>
          <div className="fd-actions">
            <button type="submit" className="fd-primary" disabled={busy}>{busy ? 'Saving…' : 'Save dish'}</button>
            <button type="button" className="fd-secondary" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  )
}
