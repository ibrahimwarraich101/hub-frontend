// File purpose: Admin "Categories": add main categories and subcategories, rename, reorder, and show or hide them.
// Categories are never deleted (products point at them); hiding one hides its products from customers.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { useAdminData } from '../../admin/useAdminData'
import { categoryNameError, storeAdminPaths } from './storeAdminApi'
import type { AdminCategory } from './storeAdminApi'

type Save = (path: string, method: string, body: unknown, done: string) => Promise<boolean>

export function CategoriesPage() {
  const { authFetch } = useAuth()
  const { data, error, replace } = useAdminData<AdminCategory[]>(storeAdminPaths.categories)
  const [notice, setNotice] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  // Every change returns the whole updated tree.
  const save: Save = async (path, method, body, done) => {
    setNotice(null)
    setFailure(null)
    try {
      replace(await authFetch<AdminCategory[]>(path, method, body))
      setNotice(done)
      return true
    } catch (reason) {
      // Things only the server knows, e.g. the name is already used.
      setFailure(reason instanceof ApiError ? reason.message : 'That did not work. Please try again.')
      return false
    }
  }

  const move = (list: AdminCategory[], index: number, by: number, parentId: string | null) => {
    const ids = list.map((item) => item.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    void save(storeAdminPaths.categoryOrder, 'PUT', { parentId, categoryIds: ids }, 'Order saved.')
  }

  return (
    <div className="adm-stack">
      <section className="hub-card adm-panel">
        <h2>Add a main category</h2>
        <NameForm label="Main category name" button="Add category" placeholder="e.g. Beauty"
          onSubmit={(name) => save(storeAdminPaths.categories, 'POST', { name }, `Added "${name}".`)} />
      </section>

      {notice && <p className="adm-alert success" role="status">{notice}</p>}
      {(failure ?? error) && <p className="adm-alert error" role="alert">{failure ?? error}</p>}
      {!data && !error && <p className="adm-muted">Loading…</p>}
      {data && data.length === 0 && <p className="adm-empty">No categories yet. Add the first one above.</p>}

      {data && data.map((root, index) => (
        <section key={root.id} className="hub-card adm-panel st-category">
          <CategoryRow category={root} first={index === 0} last={index === data.length - 1} save={save}
            onMove={(by) => move(data, index, by, null)} />
          <div className="st-children">
            {root.children.map((child, childIndex) => (
              <CategoryRow key={child.id} category={child} parentHidden={!root.active} first={childIndex === 0}
                last={childIndex === root.children.length - 1} save={save} onMove={(by) => move(root.children, childIndex, by, root.id)} />
            ))}
            <AddSubcategory parent={root} save={save} />
          </div>
        </section>
      ))}
    </div>
  )
}

function CategoryRow({ category, parentHidden, first, last, save, onMove }:
  { category: AdminCategory; parentHidden?: boolean; first: boolean; last: boolean; save: Save; onMove: (by: number) => void }) {
  const [renaming, setRenaming] = useState(false)
  const [confirmHide, setConfirmHide] = useState(false)
  const isMain = category.parentId === null
  const hiddenCount = isMain ? category.productCount + category.children.reduce((sum, child) => sum + child.productCount, 0) : category.productCount

  const setActive = (active: boolean) => {
    setConfirmHide(false)
    void save(storeAdminPaths.category(category.id), 'PUT', { name: category.name, active }, `${active ? 'Showing' : 'Hid'} "${category.name}".`)
  }

  if (renaming) {
    return (
      <div className={isMain ? 'st-row main' : 'st-row'}>
        <NameForm label={`New name for "${category.name}"`} button="Save name" initial={category.name} onCancel={() => setRenaming(false)}
          onSubmit={async (name) => {
            const saved = await save(storeAdminPaths.category(category.id), 'PUT', { name, active: category.active }, `Renamed to "${name}".`)
            if (saved) setRenaming(false)
            return saved
          }} />
      </div>
    )
  }

  return (
    <div className={isMain ? 'st-row main' : 'st-row'}>
      <div className="st-name">
        <strong>{category.name}</strong>
        <span className="adm-muted">/{category.slug} · {category.productCount} product{category.productCount === 1 ? '' : 's'}</span>
      </div>
      <span className={`hub-pill ${category.active ? (parentHidden ? 'warning' : 'success') : 'muted'}`}>
        {!category.active ? 'Hidden' : parentHidden ? 'Hidden with main category' : 'Visible'}
      </span>
      <div className="adm-actions">
        <button type="button" className="hub-button secondary small" disabled={first} onClick={() => onMove(-1)} aria-label={`Move ${category.name} up`}>↑</button>
        <button type="button" className="hub-button secondary small" disabled={last} onClick={() => onMove(1)} aria-label={`Move ${category.name} down`}>↓</button>
        <button type="button" className="hub-button secondary small" onClick={() => setRenaming(true)} aria-label={`Rename ${category.name}`}>Rename</button>
        {category.active ? (
          confirmHide ? (
            <>
              <span className="adm-muted">{hiddenCount > 0 ? `${hiddenCount} product${hiddenCount === 1 ? '' : 's'} will be hidden from customers.` : 'Customers will not see it.'}</span>
              <button type="button" className="hub-button danger small" onClick={() => setActive(false)}>Sure? Hide</button>
              <button type="button" className="hub-button secondary small" onClick={() => setConfirmHide(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" className="hub-button secondary small" onClick={() => setConfirmHide(true)} aria-label={`Hide ${category.name}`}>Hide</button>
          )
        ) : (
          <button type="button" className="hub-button small" onClick={() => setActive(true)} aria-label={`Show ${category.name}`}>Show</button>
        )}
      </div>
    </div>
  )
}

function AddSubcategory({ parent, save }: { parent: AdminCategory; save: Save }) {
  const [open, setOpen] = useState(false)
  if (!open) return <button type="button" className="adm-link st-add" onClick={() => setOpen(true)}>+ Add a subcategory to {parent.name}</button>
  return (
    <div className="st-row">
      <NameForm label={`New subcategory in ${parent.name}`} button="Add subcategory" placeholder="e.g. Shoes" onCancel={() => setOpen(false)}
        onSubmit={async (name) => {
          const saved = await save(storeAdminPaths.categories, 'POST', { name, parentId: parent.id }, `Added "${name}" to ${parent.name}.`)
          if (saved) setOpen(false)
          return saved
        }} />
    </div>
  )
}

function NameForm({ label, button, placeholder, initial = '', onSubmit, onCancel }:
  { label: string; button: string; placeholder?: string; initial?: string; onSubmit: (name: string) => Promise<boolean>; onCancel?: () => void }) {
  const [name, setName] = useState(initial)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const problem = tried ? categoryNameError(name) : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    if (categoryNameError(name)) return
    setBusy(true)
    const saved = await onSubmit(name.trim())
    setBusy(false)
    if (saved) { setName(''); setTried(false) }
  }

  return (
    <form className="st-name-form" onSubmit={(event) => void submit(event)} noValidate>
      <label className={problem ? 'adm-field invalid' : 'adm-field'}>
        {label}
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} maxLength={100} aria-invalid={problem ? true : undefined} />
        {problem && <span className="adm-field-error">{problem}</span>}
      </label>
      <div className="adm-actions">
        <button type="submit" className="hub-button small" disabled={busy}>{busy ? 'Saving…' : button}</button>
        {onCancel && <button type="button" className="hub-button secondary small" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
