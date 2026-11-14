// File purpose: The approved owner edits restaurant details, delivery fee, minimum order, delivery time and opens/closes it,
// uploads the logo and cover photo, and sees a live preview of the card customers see.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, mediaUrl } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Field } from '../../../shared/auth/AuthScreens'
import { collect, firstError, hasErrors, rules } from '../../../shared/forms/validation'
import { foodPhone, foodPaths, money } from '../foodApi'
import type { RestaurantAccount } from '../foodApi'
import { PhotoButton } from './PhotoButton'

type Props = { account: RestaurantAccount; onSaved: (account: RestaurantAccount) => void }

export function RestaurantSettings({ account, onSaved }: Props) {
  const { authFetch } = useAuth()
  const [values, setValues] = useState({
    description: account.description ?? '', phone: account.phone, cuisine: account.cuisine, addressLine: account.addressLine, city: account.city,
    deliveryFee: String(account.deliveryFee), minimumOrder: String(account.minimumOrder), deliveryMinutes: String(account.deliveryMinutes),
  })
  const [open, setOpen] = useState(account.open)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const set = (field: keyof typeof values) => (value: string) => setValues({ ...values, [field]: value })

  const number = (value: string, min: number, max: number, label: string) => {
    const parsed = Number(value)
    return value.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max ? null : `${label} must be a number from ${min} to ${max}.`
  }
  const errors = collect({
    phone: firstError(rules.required(values.phone, 'phone'), rules.phone(foodPhone(values.phone))),
    cuisine: firstError(rules.required(values.cuisine, 'cuisine'), rules.minLength(values.cuisine.trim(), 2, 'Cuisine')),
    addressLine: firstError(rules.required(values.addressLine, 'address'), rules.minLength(values.addressLine.trim(), 5, 'Address')),
    city: firstError(rules.required(values.city, 'city'), rules.minLength(values.city.trim(), 2, 'City')),
    deliveryFee: number(values.deliveryFee, 0, 5000, 'Delivery fee'),
    minimumOrder: number(values.minimumOrder, 0, 100000, 'Minimum order'),
    deliveryMinutes: number(values.deliveryMinutes, 5, 180, 'Delivery time'),
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    if (hasErrors(errors)) return setMessage({ text: Object.values(errors)[0] as string, error: true })
    setBusy(true)
    try {
      const saved = await authFetch<RestaurantAccount>(foodPaths.settings, 'PUT', {
        description: values.description.trim() || null, phone: foodPhone(values.phone), cuisine: values.cuisine.trim(),
        addressLine: values.addressLine.trim(), city: values.city.trim(), deliveryFee: Number(values.deliveryFee),
        minimumOrder: Number(values.minimumOrder), deliveryMinutes: Math.round(Number(values.deliveryMinutes)), open, expectedVersion: account.version,
      })
      onSaved(saved)
      setMessage({ text: 'Saved.', error: false })
    } catch (reason) {
      setMessage({ text: reason instanceof ApiError ? reason.message : 'Could not save. Please try again.', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(kind: 'logo' | 'cover') {
    setRemoving(true)
    setPhotoError(null)
    try {
      onSaved(await authFetch<RestaurantAccount>(foodPaths.restaurantPhoto(kind), 'DELETE'))
    } catch (reason) {
      setPhotoError(reason instanceof ApiError ? reason.message : 'Could not remove the photo.')
    } finally {
      setRemoving(false)
    }
  }

  // The preview uses what is typed now, so the owner sees the card before saving.
  const fee = Number(values.deliveryFee)
  const minimum = Number(values.minimumOrder)
  return (
    <div className="fd-settings">
    <div className="fd-settings-side">
      <section className="fd-panel" aria-label="Photos">
        <h2>Photos</h2>
        <p className="fd-meta">A cover photo of your best dish and a square logo make customers more likely to order.</p>
        <div className="fd-photo-row">
          <div className="fd-photo-slot cover">
            {account.coverUrl ? <img src={mediaUrl(account.coverUrl) ?? ''} alt="Cover photo" /> : <span className="fd-noimage">No cover photo</span>}
          </div>
          <div className="fd-actions">
            <PhotoButton<RestaurantAccount> path={foodPaths.restaurantPhoto('cover')} label={account.coverUrl ? 'Change cover' : 'Add cover photo'}
              onUploaded={onSaved} onError={setPhotoError} />
            {account.coverUrl && <button type="button" className="fd-link" disabled={removing} onClick={() => void removePhoto('cover')}>Remove</button>}
          </div>
        </div>
        <div className="fd-photo-row">
          <div className="fd-photo-slot logo">
            {account.logoUrl ? <img src={mediaUrl(account.logoUrl) ?? ''} alt="Logo" /> : <span className="fd-noimage">No logo</span>}
          </div>
          <div className="fd-actions">
            <PhotoButton<RestaurantAccount> path={foodPaths.restaurantPhoto('logo')} label={account.logoUrl ? 'Change logo' : 'Add logo'}
              onUploaded={onSaved} onError={setPhotoError} />
            {account.logoUrl && <button type="button" className="fd-link" disabled={removing} onClick={() => void removePhoto('logo')}>Remove</button>}
          </div>
        </div>
        {photoError && <p className="fd-message error" role="alert">{photoError}</p>}
      </section>

      <section className="fd-panel" aria-label="Customer preview">
        <h2>What customers see</h2>
        <div className={open ? 'fd-card' : 'fd-card closed'} aria-hidden="true">
          <span className="fd-cover">
            {account.coverUrl ? <img src={mediaUrl(account.coverUrl) ?? ''} alt="" /> : <span className="fd-cover-empty" />}
            {account.logoUrl && <img className="fd-logo" src={mediaUrl(account.logoUrl) ?? ''} alt="" />}
            {!open && <span className="fd-closed-badge">Closed now</span>}
            <span className="fd-time">{values.deliveryMinutes || '?'} min</span>
          </span>
          <span className="fd-card-top"><strong>{account.name}</strong><span className="fd-rating">★ New</span></span>
          <span className="fd-meta">{values.cuisine || 'Cuisine'} · {values.city || 'City'}</span>
          <span className="fd-meta">🛵 {Number.isFinite(fee) && fee === 0 ? 'Free delivery' : `Delivery ${money(Number.isFinite(fee) ? fee : 0)}`}</span>
          <span className={open ? 'fd-tag' : 'fd-tag closed'}>
            {!open ? 'Closed now' : Number.isFinite(minimum) && minimum > 0 ? `Min. order ${money(minimum)}` : 'No minimum order'}
          </span>
        </div>
      </section>
    </div>

    <form className="fd-panel fd-form" onSubmit={submit} noValidate>
      <h2>Restaurant settings</h2>
      <label className="fd-check">
        <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
        Open - customers can order now
      </label>
      <Field label="Cuisine" name="cuisine" value={values.cuisine} onChange={set('cuisine')} error={errors.cuisine} />
      <label className="auth-field">
        About your restaurant
        <textarea rows={3} maxLength={2000} value={values.description} onChange={(e) => set('description')(e.target.value)} />
      </label>
      <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={set('phone')} error={errors.phone} />
      <Field label="Address" name="addressLine" value={values.addressLine} onChange={set('addressLine')} error={errors.addressLine} />
      <Field label="City" name="city" value={values.city} onChange={set('city')} error={errors.city} />
      <div className="fd-row">
        <Field label="Delivery fee (Rs)" name="deliveryFee" type="number" value={values.deliveryFee} onChange={set('deliveryFee')} error={errors.deliveryFee} />
        <Field label="Minimum order (Rs)" name="minimumOrder" type="number" value={values.minimumOrder} onChange={set('minimumOrder')} error={errors.minimumOrder} />
        <Field label="Delivery time (minutes)" name="deliveryMinutes" type="number" value={values.deliveryMinutes} onChange={set('deliveryMinutes')}
          error={errors.deliveryMinutes} />
      </div>
      {message && <p className={message.error ? 'fd-message error' : 'fd-message'} role="status">{message.text}</p>}
      <button type="submit" className="fd-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
    </form>
    </div>
  )
}
