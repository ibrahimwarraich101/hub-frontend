// File purpose: The approved owner manages menu sections and dishes: add, rename and hide sections; add and edit dishes
// (the form opens right where the owner clicked), dish photos, mark sold out and hide from the menu in one click.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { foodPaths, money } from '../foodApi'
import type { MenuItem, OwnerMenu, OwnerMenuCategory } from '../foodApi'
import { PhotoButton } from './PhotoButton'

// anchor: where the form is shown - the dish being edited, or "new:<section id>" at the top of a section.
type Draft = {
  anchor: string; id: string | null; categoryId: string; name: string; description: string; price: string; available: boolean;
  archived: boolean; version: number | null
}

const newDraft = (categoryId: string): Draft => ({
  anchor: `new:${categoryId}`, id: null, categoryId, name: '', description: '', price: '', available: true, archived: false, version: null,
})
const editDraft = (item: MenuItem): Draft => ({
  anchor: item.id, id: item.id, categoryId: item.categoryId, name: item.name, description: item.description, price: String(item.price),
  available: item.available, archived: item.archived, version: item.version,
})

export function MenuManager() {
  const { authFetch } = useAuth()
  const [menu, setMenu] = useState<OwnerMenu | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sectionName, setSectionName] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const draftForm = useRef<HTMLFormElement>(null)
  const anchor = draft?.anchor

  // Bring the dish form into view where it opened.
  useEffect(() => { if (anchor) draftForm.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [anchor])

  const load = useCallback(() => {
    authFetch<OwnerMenu>(foodPaths.menu)
      .then((data) => { setMenu(data); setError(null) })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Could not load your menu.'))
  }, [authFetch])

  useEffect(() => { load() }, [load])

  // Saves and shows the result; problems go to onProblem (the page banner, or the dish form's own message).
  async function save(path: string, method: string, body: unknown, done?: string, onProblem: (text: string) => void = setError): Promise<boolean> {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      setMenu(await authFetch<OwnerMenu>(path, method, body))
      if (done) setNotice(done)
      return true
    } catch (reason) {
      onProblem(reason instanceof ApiError ? reason.message : 'Could not save. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addSection(event: FormEvent) {
    event.preventDefault()
    const name = sectionName.trim()
    if (!name || name.length > 60) return setError('Section names need 1 to 60 characters.')
    if (await save(foodPaths.categories, 'POST', { name, sortOrder: menu?.categories.length ?? 0, archived: false }, `Added the section "${name}".`))
      setSectionName('')
  }

  async function renameSection(event: FormEvent, category: OwnerMenuCategory) {
    event.preventDefault()
    const name = renaming?.name.trim() ?? ''
    if (!name || name.length > 60) return setError('Section names need 1 to 60 characters.')
    if (await save(foodPaths.category(category.id), 'PUT', { name, sortOrder: category.sortOrder, archived: category.archived }, `Renamed to "${name}".`))
      setRenaming(null)
  }

  async function saveDish(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    setFormError(null)
    const price = Number(draft.price)
    if (!draft.name.trim() || draft.name.trim().length > 100) return setFormError('Dish names need 1 to 100 characters.')
    if (!Number.isFinite(price) || price < 1 || price > 100000) return setFormError('Price must be between Rs 1 and Rs 100,000.')
    if (draft.description.length > 500) return setFormError('Descriptions can be at most 500 characters.')
    const body = {
      categoryId: draft.categoryId, name: draft.name.trim(), description: draft.description.trim() || null, price,
      available: draft.available, archived: draft.archived, sortOrder: 0, expectedVersion: draft.version,
    }
    const done = draft.id ? `Saved "${draft.name.trim()}".` : `Added "${draft.name.trim()}". You can now add its photo.`
    const ok = draft.id ? await save(foodPaths.item(draft.id), 'PUT', body, done, setFormError)
      : await save(foodPaths.items, 'POST', body, done, setFormError)
    if (ok) setDraft(null)
  }

  // Quick switches (sold out / hide) save straight away.
  const toggle = (item: MenuItem, change: Partial<Pick<MenuItem, 'available' | 'archived'>>) => void save(foodPaths.item(item.id), 'PUT', {
    categoryId: item.categoryId, name: item.name, description: item.description || null, price: item.price,
    available: change.available ?? item.available, archived: change.archived ?? item.archived, sortOrder: item.sortOrder, expectedVersion: item.version,
  })

  const openDraft = (next: Draft) => { setFormError(null); setDraft(next) }

  if (!menu) return error ? <div className="fd-message error" role="alert">{error}</div> : <div className="fd-message">Loading…</div>

  const dishForm = draft && (
    <form ref={draftForm} className="fd-form fd-draft" onSubmit={saveDish} aria-label={draft.id ? 'Edit dish' : 'New dish'}>
      <h3>{draft.id ? `Edit ${draft.name || 'dish'}` : 'New dish'}</h3>
      {!draft.id && <p className="fd-meta">Save the dish first, then use “Add photo” on it.</p>}
      <label className="auth-field">
        Section
        <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
          {menu.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="auth-field">
        Dish name
        <input value={draft.name} maxLength={100} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
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
      {formError && <p className="fd-message error" role="alert">{formError}</p>}
      <div className="fd-actions">
        <button type="submit" className="fd-primary" disabled={busy}>{busy ? 'Saving…' : 'Save dish'}</button>
        <button type="button" className="fd-secondary" onClick={() => setDraft(null)}>Cancel</button>
      </div>
    </form>
  )

  return (
    <>
      {error && <div className="fd-message error" role="alert">{error}</div>}
      {notice && <div className="fd-message" role="status">{notice}</div>}
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
            {renaming?.id === category.id ? (
              <form className="fd-cat-edit" onSubmit={(e) => void renameSection(e, category)}>
                <input aria-label="Section name" value={renaming.name} maxLength={60} autoFocus
                  onChange={(e) => setRenaming({ id: category.id, name: e.target.value })} />
                <button type="submit" className="fd-primary" disabled={busy}>Save</button>
                <button type="button" className="fd-link" onClick={() => setRenaming(null)}>Cancel</button>
              </form>
            ) : (
              <h3>{category.name}{category.archived && <span className="fd-meta"> · hidden from customers</span>}</h3>
            )}
            <span className="fd-actions">
              {renaming?.id !== category.id && (
                <button type="button" className="fd-link" onClick={() => setRenaming({ id: category.id, name: category.name })}>Rename</button>
              )}
              <button type="button" className="fd-link" disabled={busy}
                onClick={() => void save(foodPaths.category(category.id), 'PUT', { name: category.name, sortOrder: category.sortOrder, archived: !category.archived },
                  category.archived ? `"${category.name}" is shown again.` : `"${category.name}" is hidden from customers.`)}>
                {category.archived ? 'Show section' : 'Hide section'}
              </button>
              <button type="button" className="fd-secondary" onClick={() => openDraft(newDraft(category.id))}>Add dish</button>
            </span>
          </div>
          {anchor === `new:${category.id}` && dishForm}
          {category.items.length === 0 && anchor !== `new:${category.id}` && <p className="fd-meta">No dishes yet. Use “Add dish”.</p>}
          {category.items.map((item) => anchor === item.id ? <div key={item.id}>{dishForm}</div> : (
            <div key={item.id} className={item.archived ? 'fd-menu-item archived' : 'fd-menu-item'}>
              <span className="fd-menu-photo">
                {item.imageUrl ? <img src={mediaUrl(item.imageUrl) ?? ''} alt="" loading="lazy" /> : <span className="fd-noimage">No photo</span>}
              </span>
              <span className="fd-menu-text">
                <strong>{item.name}</strong> · {money(item.price)}
                {!item.available && <span className="fd-soldout"> · Sold out</span>}
                {item.archived && <span className="fd-meta"> · Hidden from customers</span>}
                {item.description && <><br /><span className="fd-meta">{item.description}</span></>}
                <span className="fd-actions fd-photo-actions">
                  <PhotoButton<OwnerMenu> path={foodPaths.itemPhoto(item.id)} label={item.imageUrl ? 'Change photo' : 'Add photo'}
                    className="fd-link" onUploaded={(result) => { setMenu(result); setNotice(`New photo for "${item.name}".`) }} onError={setError} />
                  {item.imageUrl && (
                    <button type="button" className="fd-link" disabled={busy}
                      onClick={() => void save(foodPaths.itemPhoto(item.id), 'DELETE', undefined, `Removed the photo of "${item.name}".`)}>Remove photo</button>
                  )}
                </span>
              </span>
              <span className="fd-actions">
                <button type="button" className={item.available ? 'fd-chip' : 'fd-chip on'} disabled={busy} aria-pressed={!item.available}
                  onClick={() => toggle(item, { available: !item.available })}>
                  {item.available ? 'Mark sold out' : 'Sold out · make available'}
                </button>
                <button type="button" className={item.archived ? 'fd-chip on' : 'fd-chip'} disabled={busy} aria-pressed={item.archived}
                  onClick={() => toggle(item, { archived: !item.archived })}>
                  {item.archived ? 'Hidden · show again' : 'Hide from menu'}
                </button>
                <button type="button" className="fd-link" onClick={() => openDraft(editDraft(item))}>Edit</button>
              </span>
            </div>
          ))}
        </section>
      ))}
    </>
  )
}
