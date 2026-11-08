// File purpose: Seller Center "My products": list the seller's products and add or edit one
// (details, price, colour/size options with stock, specifications, photos, show/hide in the store).
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Field } from '../../../shared/auth/AuthScreens'
import { fetchCategories, formatPrice } from '../api'
import {
  categoryChoices, checkPhoto, emptyForm, formFromProduct, hasColor, hasSize, limits, newKey, optionTypeLabels,
  productRequest, sellerProductPaths, validateProduct,
} from '../sellerProductsApi'
import type { OptionType, ProductErrors, ProductForm, SellerProduct, SellerProductPage } from '../sellerProductsApi'

export function SellerProducts() {
  // null = list; 'new' = add form; otherwise the product being edited.
  const [editing, setEditing] = useState<string | null>(null)
  const [listKey, setListKey] = useState(0)

  if (editing) {
    return (
      <ProductEditor
        key={editing}
        productId={editing === 'new' ? null : editing}
        onCreated={(id) => setEditing(id)}
        onClose={() => { setEditing(null); setListKey((k) => k + 1) }}
      />
    )
  }
  return <ProductList key={listKey} onAdd={() => setEditing('new')} onEdit={setEditing} />
}

function ProductList({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) {
  const { authFetch } = useAuth()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', page: 1 })
  const [data, setData] = useState<SellerProductPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    authFetch<SellerProductPage>(sellerProductPaths.list(query.search, query.page))
      .then((page) => { if (current) { setData(page); setError(null) } })
      .catch((reason: unknown) => { if (current) setError(reason instanceof ApiError ? reason.message : 'Could not load your products.') })
    return () => { current = false }
  }, [authFetch, query])

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return (
    <div className="mp-panel">
      <div className="mp-admin-head">
        <h2>My products</h2>
        <button type="button" className="mp-primary" onClick={onAdd}>+ Add product</button>
      </div>
      <form className="mp-search" role="search" onSubmit={(e) => { e.preventDefault(); setQuery({ search, page: 1 }) }}>
        <input type="search" placeholder="Search my products" value={search} onChange={(e) => setSearch(e.target.value)}
          aria-label="Search my products" maxLength={100} />
        <button type="submit">Search</button>
      </form>
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {!data && !error && <p className="mp-message">Loading…</p>}
      {data && data.items.length === 0 && (
        <p className="mp-message">{query.search ? 'No products match your search.' : 'You have no products yet. Click "Add product" to list your first one.'}</p>
      )}
      {data && data.items.length > 0 && (
        <ul className="mp-seller-list">
          {data.items.map((item) => (
            <li key={item.id}>
              <button type="button" className="mp-seller-row" onClick={() => onEdit(item.id)}>
                {item.imageUrl ? <img src={mediaUrl(item.imageUrl) ?? ''} alt="" /> : <span className="mp-noimage">No photo</span>}
                <span className="mp-seller-row-main">
                  <strong>{item.name}</strong>
                  <span className="mp-price">
                    {formatPrice(item.salePrice ?? item.price, 'PKR')}
                    {item.salePrice !== null && <s>{formatPrice(item.price, 'PKR')}</s>}
                  </span>
                  <span className="mp-seller">
                    {item.totalStock === null ? 'Stock not tracked' : item.totalStock === 0 ? 'Out of stock' : `${item.totalStock} in stock`}
                    {item.variantCount > 0 && ` · ${item.variantCount} options`}
                  </span>
                </span>
                <span className={`mp-status ${item.adminHidden ? 'mp-status-suspended' : item.active ? 'mp-status-approved' : 'mp-status-pending'}`}>{item.adminHidden ? 'Hidden by HUB' : item.active ? 'In store' : 'Hidden'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <div className="mp-pager">
          <button type="button" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button>
          <span>Page {query.page} of {pages}</span>
          <button type="button" disabled={query.page >= pages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button>
        </div>
      )}
    </div>
  )
}

type EditorProps = { productId: string | null; onCreated: (id: string) => void; onClose: () => void }

function ProductEditor({ productId, onCreated, onClose }: EditorProps) {
  const { authFetch } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [product, setProduct] = useState<SellerProduct | null>(null)
  const [form, setForm] = useState<ProductForm | null>(productId ? null : emptyForm())
  const [choices, setChoices] = useState<{ id: string; label: string }[]>([])
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!productId) return
    authFetch<SellerProduct>(sellerProductPaths.one(productId))
      .then((loaded) => { setProduct(loaded); setForm(formFromProduct(loaded)); setConflict(false); setError(null); setTried(false) })
      .catch((reason: unknown) => setError(reason instanceof ApiError && reason.status === 404 ? 'This product was not found.'
        : reason instanceof ApiError ? reason.message : 'Could not load this product.'))
  }, [authFetch, productId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal).then((tree) => setChoices(categoryChoices(tree))).catch(() => {
      if (!controller.signal.aborted) setError('Could not load the store categories.')
    })
    return () => controller.abort()
  }, [])

  // After the first save attempt, messages update live while the seller types.
  const errors: ProductErrors = tried && form ? validateProduct(form) : {}
  const update = (patch: Partial<ProductForm>) => setForm((current) => (current ? { ...current, ...patch } : current))

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setTried(true)
    setError(null)
    setNotice(null)
    const found = validateProduct(form)
    if (Object.keys(found).length > 0) {
      // Focus the first field with a problem (fields carry name="<error key>").
      const first = Object.keys(found)[0]
      ;(formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus()
      return
    }
    setBusy(true)
    try {
      if (product) {
        const saved = await authFetch<SellerProduct>(sellerProductPaths.one(product.id), 'PUT', productRequest(form, product.version))
        setProduct(saved)
        setForm(formFromProduct(saved))
        setTried(false)
        setNotice('Saved.')
      } else {
        const saved = await authFetch<SellerProduct>(sellerProductPaths.create, 'POST', productRequest(form))
        onCreated(saved.id)
      }
    } catch (reason) {
      // Only things the website cannot know (changed elsewhere, store suspended, server down) come from the backend.
      if (reason instanceof ApiError && reason.status === 409) setConflict(true)
      else setError(reason instanceof ApiError && (reason.status === 0 || reason.status === 403) ? reason.message
        : 'Could not save the product. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!form) {
    return (
      <div className="mp-panel">
        <button type="button" className="mp-back" onClick={onClose}>← My products</button>
        {error ? <p className="mp-message error" role="alert">{error}</p> : <p className="mp-message">Loading…</p>}
      </div>
    )
  }

  const setVariant = (key: number, patch: Partial<ProductForm['variants'][number]>) =>
    update({ variants: form.variants.map((row) => (row.key === key ? { ...row, ...patch } : row)) })
  const setSpec = (key: number, patch: Partial<ProductForm['specs'][number]>) =>
    update({ specs: form.specs.map((row) => (row.key === key ? { ...row, ...patch } : row)) })

  return (
    <form ref={formRef} className="mp-panel mp-form mp-editor" onSubmit={save} noValidate>
      <button type="button" className="mp-back" onClick={onClose}>← My products</button>
      <h2>{product ? `Edit: ${product.name}` : 'Add a product'}</h2>
      {product?.adminHidden && (
        <p className="mp-message error" role="status">
          HUB has hidden this product from the store. Reason: {product.adminHiddenReason}. You can still edit it, but only HUB can put it back in the store.
        </p>
      )}

      <fieldset>
        <legend>Details</legend>
        <Field label="Product name" name="name" value={form.name} onChange={(name) => update({ name })} error={errors.name} />
        <label className={errors.categoryId ? 'auth-field invalid' : 'auth-field'}>
          Category
          <select name="categoryId" value={form.categoryId} onChange={(e) => update({ categoryId: e.target.value })}
            aria-invalid={errors.categoryId ? true : undefined}>
            <option value="">Choose a category</option>
            {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
          </select>
          {errors.categoryId && <span className="auth-field-error">{errors.categoryId}</span>}
        </label>
        <label className={errors.description ? 'auth-field invalid' : 'auth-field'}>
          Description (optional)
          <textarea name="description" rows={5} value={form.description} onChange={(e) => update({ description: e.target.value })}
            aria-invalid={errors.description ? true : undefined} />
          {errors.description
            ? <span className="auth-field-error">{errors.description}</span>
            : <span className="auth-hint">{form.description.trim().length} / 5000 characters</span>}
        </label>
      </fieldset>

      <fieldset>
        <legend>Price (Rs)</legend>
        <div className="mp-row">
          <Field label="Price" name="price" value={form.price} onChange={(price) => update({ price })} error={errors.price} placeholder="2499" />
          <Field label="Sale price (optional)" name="salePrice" value={form.salePrice} onChange={(salePrice) => update({ salePrice })}
            error={errors.salePrice} hint="Lower price shown with the normal price crossed out" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Stock and options</legend>
        <div className="mp-chips" role="radiogroup" aria-label="Options">
          {(Object.keys(optionTypeLabels) as OptionType[]).map((type) => (
            <button key={type} type="button" role="radio" aria-checked={form.optionType === type}
              className={form.optionType === type ? 'mp-chip active' : 'mp-chip'}
              onClick={() => update({
                optionType: type,
                // Start with one empty row so the seller sees where to type.
                variants: type !== 'none' && form.variants.length === 0 ? [{ key: newKey(), color: '', size: '', stock: '' }] : form.variants,
              })}>
              {optionTypeLabels[type]}
            </button>
          ))}
        </div>
        {form.optionType === 'none' ? (
          <Field label="Units in stock" name="stock" value={form.stock} onChange={(stock) => update({ stock })} error={errors.stock} placeholder="10" />
        ) : (
          <>
            <p className="auth-hint">Each option has its own stock. All options have the same price. Options with 0 stock show as sold out.</p>
            {form.variants.map((row, index) => (
              <div key={row.key} className="mp-row mp-option-row">
                {hasColor(form.optionType) && (
                  <Field label={`Colour ${index + 1}`} name={`variant-${row.key}-color`} value={row.color} placeholder="Black"
                    onChange={(color) => setVariant(row.key, { color })} error={errors[`variant-${row.key}-color`]} />
                )}
                {hasSize(form.optionType) && (
                  <Field label={`Size ${index + 1}`} name={`variant-${row.key}-size`} value={row.size} placeholder="M"
                    onChange={(size) => setVariant(row.key, { size })} error={errors[`variant-${row.key}-size`]} />
                )}
                <Field label="Stock" name={`variant-${row.key}-stock`} value={row.stock} placeholder="10"
                  onChange={(stock) => setVariant(row.key, { stock })} error={errors[`variant-${row.key}-stock`]} />
                <button type="button" className="mp-link" aria-label={`Remove option ${index + 1}`}
                  onClick={() => update({ variants: form.variants.filter((item) => item.key !== row.key) })}>Remove</button>
              </div>
            ))}
            {errors.variants && <p className="auth-field-error" role="alert">{errors.variants}</p>}
            {form.variants.length < limits.maxVariants && (
              <button type="button" className="mp-link" onClick={() => update({ variants: [...form.variants, { key: newKey(), color: '', size: '', stock: '' }] })}>
                + Add option
              </button>
            )}
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Specifications (optional)</legend>
        <p className="auth-hint">Shown as a table on the product page, for example Brand: Samsung.</p>
        {form.specs.map((row, index) => (
          <div key={row.key} className="mp-row mp-option-row">
            <Field label={`Name ${index + 1}`} name={`spec-${row.key}-name`} value={row.name} placeholder="Brand"
              onChange={(name) => setSpec(row.key, { name })} error={errors[`spec-${row.key}-name`]} />
            <Field label="Value" name={`spec-${row.key}-value`} value={row.value} placeholder="Samsung"
              onChange={(value) => setSpec(row.key, { value })} error={errors[`spec-${row.key}-value`]} />
            <button type="button" className="mp-link" aria-label={`Remove specification ${index + 1}`}
              onClick={() => update({ specs: form.specs.filter((item) => item.key !== row.key) })}>Remove</button>
          </div>
        ))}
        {errors.specs && <p className="auth-field-error" role="alert">{errors.specs}</p>}
        {form.specs.length < limits.maxSpecs && (
          <button type="button" className="mp-link" onClick={() => update({ specs: [...form.specs, { key: newKey(), name: '', value: '' }] })}>
            + Add specification
          </button>
        )}
      </fieldset>

      <label className="mp-check">
        <input type="checkbox" name="active" checked={form.active} onChange={(e) => update({ active: e.target.checked })} />
        Show this product in the store
      </label>

      {conflict && (
        <div className="mp-message error" role="alert">
          This product was changed in another tab or on another device since you opened it.{' '}
          <button type="button" className="mp-link" onClick={load}>Load the latest version</button> (your unsaved changes here will be lost).
        </div>
      )}
      {error && <p className="mp-message error" role="alert">{error}</p>}
      {notice && <p className="mp-message" role="status">{notice}</p>}
      <div className="mp-actions">
        <button type="submit" className="mp-primary" disabled={busy}>{busy ? 'Saving…' : product ? 'Save changes' : 'Save and add photos'}</button>
        <button type="button" className="mp-chip" onClick={onClose}>Cancel</button>
      </div>

      <fieldset>
        <legend>Photos</legend>
        {product
          ? <PhotoManager product={product} onChange={setProduct} />
          : <p className="auth-hint">Save the product first, then you can add up to {limits.maxImages} photos.</p>}
      </fieldset>
    </form>
  )
}

function PhotoManager({ product, onChange }: { product: SellerProduct; onChange: (product: SellerProduct) => void }) {
  const { authFetch } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Photo waiting for a second click to confirm deleting it (no browser pop-ups).
  const [confirming, setConfirming] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const images = product.images
  const room = limits.maxImages - images.length

  // Photo changes do not change the product version, so the details form above stays valid.
  const keepVersion = (saved: SellerProduct) => onChange({ ...saved, version: product.version })

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setError(null)
    if (files.length === 0) return
    if (files.length > room) return setError(room === 0 ? `This product already has ${limits.maxImages} photos. Delete one first.`
      : `You can add ${room} more photo${room === 1 ? '' : 's'} (${limits.maxImages} at most).`)
    for (const file of files) {
      const problem = await checkPhoto(file)
      if (problem) return setError(problem)
    }
    let latest = product
    try {
      for (const [index, file] of files.entries()) {
        setBusy(`Uploading photo ${index + 1} of ${files.length}…`)
        const body = new FormData()
        body.append('file', file)
        latest = await authFetch<SellerProduct>(sellerProductPaths.images(product.id), 'POST', body)
        keepVersion(latest)
      }
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 0 ? reason.message : 'A photo could not be uploaded. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function move(index: number, by: number) {
    const ids = images.map((image) => image.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    await run('Saving order…', () => authFetch<SellerProduct>(sellerProductPaths.imageOrder(product.id), 'PUT', { imageIds: ids }))
  }

  async function remove(imageId: string) {
    await run('Deleting…', () => authFetch<SellerProduct>(sellerProductPaths.image(product.id, imageId), 'DELETE'))
  }

  async function run(label: string, action: () => Promise<SellerProduct>) {
    setBusy(label)
    setError(null)
    setConfirming(null)
    try { keepVersion(await action()) } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 0 ? reason.message : 'That did not work. Reload the page and try again.')
    } finally { setBusy(null) }
  }

  return (
    <div className="mp-photos">
      <p className="auth-hint">The first photo is the main photo. JPEG, PNG or WebP, up to 8 MB each, at least 200 x 200 pixels.</p>
      {images.length > 0 && (
        <ol className="mp-photo-grid">
          {images.map((image, index) => (
            <li key={image.id}>
              <img src={mediaUrl(image.url) ?? ''} alt={`Photo ${index + 1}`} />
              {index === 0 && <span className="mp-badge mp-badge-main">Main</span>}
              <div className="mp-photo-tools">
                <button type="button" disabled={busy !== null || index === 0} onClick={() => void move(index, -1)} aria-label={`Move photo ${index + 1} left`}>←</button>
                {confirming === image.id
                  ? <button type="button" className="mp-confirm" disabled={busy !== null} onClick={() => void remove(image.id)}>Sure? Delete</button>
                  : <button type="button" disabled={busy !== null} onClick={() => setConfirming(image.id)} aria-label={`Delete photo ${index + 1}`}>Delete</button>}
                <button type="button" disabled={busy !== null || index === images.length - 1} onClick={() => void move(index, 1)} aria-label={`Move photo ${index + 1} right`}>→</button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void upload(e)}
        aria-label="Choose photos" />
      <button type="button" className="mp-chip" disabled={busy !== null || room === 0} onClick={() => inputRef.current?.click()}>
        {room === 0 ? `${limits.maxImages} photos (maximum)` : '+ Add photos'}
      </button>
      {busy && <p className="mp-message" role="status">{busy}</p>}
      {error && <p className="mp-message error" role="alert">{error}</p>}
    </div>
  )
}
