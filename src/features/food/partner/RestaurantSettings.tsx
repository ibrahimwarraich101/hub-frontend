// File purpose: The approved owner edits restaurant details, delivery fee, minimum order, delivery time and opens/closes it.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { Field } from '../../../shared/auth/AuthScreens'
import { collect, firstError, hasErrors, rules } from '../../../shared/forms/validation'
import { foodPaths } from '../foodApi'
import type { RestaurantAccount } from '../foodApi'

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
  const set = (field: keyof typeof values) => (value: string) => setValues({ ...values, [field]: value })

  const number = (value: string, min: number, max: number, label: string) => {
    const parsed = Number(value)
    return value.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max ? null : `${label} must be a number from ${min} to ${max}.`
  }
  const errors = collect({
    phone: firstError(rules.required(values.phone, 'phone'), rules.phone(values.phone)),
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
        description: values.description.trim() || null, phone: values.phone.trim(), cuisine: values.cuisine.trim(),
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

  return (
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
  )
}
