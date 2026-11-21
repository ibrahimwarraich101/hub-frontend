// File purpose: "My account", the customer's own workspace (same layout as Seller Center), opened from the name menu:
// - Profile: name and phone; the email, changed with a 6-digit code sent to the new address;
// - Addresses: saved delivery addresses with a map pin or "Use my current location", one default;
// - Payment methods: saved JazzCash wallets;
// - Password: change it with the current password (other devices are logged out).
// The page is kept in the address (#account, #account/addresses, #account/payment-methods, #account/password).
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Field } from '../auth/AuthScreens'
import '../auth/auth.css'
import { PhoneField } from '../forms/PhoneField'
import { formatPhone } from '../forms/phone'
import { confirmLeave, hasUnsavedChanges, useUnsavedChanges } from '../forms/unsavedChanges'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../forms/validation'
import { enterSection, goTo, leaveSection, sectionPath, useSectionHistory } from '../layout/sectionRoute'
import '../layout/workspace.css'
import { PaymentMethods } from '../payments/PaymentMethods'
import { Toast } from '../layout/Toast'
import type { ToastMessage } from '../layout/Toast'
import { accountPaths, DEFAULT_POSITION, LABEL_CHOICES } from './accountApi'
import type { Address, AddressInput, Profile } from './accountApi'
import { LocationPicker } from './LocationPicker'
import './account.css'

export type AccountPage = 'profile' | 'addresses' | 'payment-methods' | 'password'

const SECTION = 'account'

const PAGES: { id: AccountPage; label: string; title: string; text: string }[] = [
  { id: 'profile', label: 'Profile', title: 'Profile', text: 'Your name, phone number and email address.' },
  { id: 'addresses', label: 'Addresses', title: 'Addresses', text: 'Where your food and store orders are delivered.' },
  { id: 'payment-methods', label: 'Payment methods', title: 'Payment methods', text: 'The JazzCash wallets you pay with.' },
  { id: 'password', label: 'Password', title: 'Password', text: 'Change the password you log in with.' },
]

function readPage(path: string | null): AccountPage {
  return PAGES.some((item) => item.id === path) ? path as AccountPage : 'profile'
}

const pathOf = (page: AccountPage) => (page === 'profile' ? '' : page)

type Props = {
  onExit: () => void
  // The page to open when the address does not name one (e.g. "Payment methods" from the name menu).
  start?: AccountPage
}

export function AccountCenter({ onExit, start }: Props) {
  const { user, logout } = useAuth()
  const [page, setPage] = useState<AccountPage>(() => (sectionPath(SECTION) !== null ? readPage(sectionPath(SECTION)) : start ?? 'profile'))
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const hideToast = useCallback(() => setToast(null), [])
  const say = useCallback((text: string, tone: 'success' | 'error' = 'success') => setToast({ id: Date.now(), text, tone }), [])

  const [startPath] = useState(() => pathOf(page))
  useEffect(() => { enterSection(SECTION, startPath) }, [startPath])
  useSectionHistory(SECTION, useCallback((path: string | null) => {
    // The browser's Back with unsaved changes: put this page back in the address and ask first.
    if (hasUnsavedChanges()) {
      goTo(SECTION, pathOf(page))
      confirmLeave(() => window.history.back())
      return
    }
    if (path === null) onExit()
    else { setPage(readPage(path)); window.scrollTo({ top: 0 }) }
  }, [onExit, page]))

  const open = (next: AccountPage) => confirmLeave(() => {
    if (next !== page) goTo(SECTION, pathOf(next))
    setPage(next)
    window.scrollTo({ top: 0 })
  })
  const exit = () => confirmLeave(() => { leaveSection(); onExit() })

  if (!user) return null
  const heading = PAGES.find((item) => item.id === page)!
  return (
    <div className="sx">
      <Toast message={toast} onDone={hideToast} />
      <aside className="sx-side" aria-label="My account">
        <div className="sx-brand">
          <span className="sx-logo">HUB</span>
          <span className="sx-brand-name">My account</span>
        </div>
        <div className="sx-store">
          <span className="sx-store-mark" aria-hidden="true">{initials(user.fullName)}</span>
          <span className="sx-store-text">
            <strong>{user.fullName}</strong>
            <span className="ac-side-email">{user.email}</span>
          </span>
        </div>
        <nav className="sx-nav" aria-label="My account pages">
          {PAGES.map((item) => (
            <button key={item.id} type="button" aria-current={page === item.id ? 'page' : undefined} onClick={() => open(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sx-side-foot">
          <button type="button" onClick={exit}>Back to HUB</button>
          <button type="button" onClick={() => confirmLeave(() => { leaveSection(); void logout() })}>Log out</button>
        </div>
      </aside>

      <main className="sx-main">
        <header className="sx-head">
          <div>
            <h1>{heading.title}</h1>
            <p>{heading.text}</p>
          </div>
        </header>
        {page === 'profile' && <ProfilePage say={say} />}
        {page === 'addresses' && <AddressesPage say={say} />}
        {page === 'payment-methods' && <section className="sx-card ac-payments"><PaymentMethods /></section>}
        {page === 'password' && <PasswordPage say={say} />}
      </main>
    </div>
  )
}

type Say = (text: string, tone?: 'success' | 'error') => void

const problemText = (reason: unknown, fallback: string) => (reason instanceof ApiError ? reason.message : fallback)

// ---------- Profile ----------

function ProfilePage({ say }: { say: Say }) {
  const { authFetch, updateUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authFetch<Profile>(accountPaths.profile).then(setProfile).catch((reason: unknown) => setError(problemText(reason, 'Could not load your profile.')))
  }, [authFetch])

  const saved = (next: Profile) => {
    setProfile(next)
    updateUser({ fullName: next.fullName, phone: next.phone, email: next.email })
  }

  if (error) return <div className="ac-alert" role="alert">{error}</div>
  if (!profile) return <p className="sx-empty">Loading…</p>
  return (
    <div className="ac-stack">
      <DetailsForm key={`${profile.fullName}|${profile.phone}`} profile={profile} onSaved={(next) => { saved(next); say('Your details are saved.') }} />
      <EmailCard profile={profile} onChanged={saved} say={say} />
      <p className="ac-member">HUB member since {new Date(profile.memberSince).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</p>
    </div>
  )
}

type DetailsFields = 'fullName' | 'phone'

function DetailsForm({ profile, onSaved }: { profile: Profile; onSaved: (profile: Profile) => void }) {
  const { authFetch } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ fullName: profile.fullName, phone: profile.phone })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = values.fullName.trim() !== profile.fullName || values.phone !== profile.phone
  useUnsavedChanges(dirty, formRef)

  const check = (input: typeof values) => collect<DetailsFields>({
    fullName: firstError(rules.required(input.fullName, 'full name'), rules.minLength(input.fullName.trim(), 2, 'Full name'),
      rules.maxLength(input.fullName.trim(), 150, 'Full name')),
    phone: firstError(rules.required(input.phone, 'phone number'), rules.phone(input.phone)),
  })
  const errors = tried ? check(values) : {}

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = check(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    setBusy(true)
    try {
      onSaved(await authFetch<Profile>(accountPaths.profile, 'PUT', { fullName: values.fullName.trim(), phone: values.phone }))
    } catch (reason) {
      setError(problemText(reason, 'Could not save your details. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} className="sx-card ac-form" onSubmit={submit} noValidate>
      <div className="sx-card-head"><h2>Your details</h2></div>
      <div className="ac-grid">
        <Field label="Full name" name="fullName" value={values.fullName} onChange={(fullName) => setValues({ ...values, fullName })}
          error={errors.fullName} autoComplete="name" />
        <PhoneField label="Phone number" name="phone" value={values.phone} onChange={(phone) => setValues({ ...values, phone })} error={errors.phone} />
      </div>
      {error && <p className="ac-alert" role="alert">{error}</p>}
      <div className="sx-actions">
        <button type="submit" className="sx-button primary" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</button>
        {dirty && <button type="button" className="sx-button" onClick={() => { setValues({ fullName: profile.fullName, phone: profile.phone }); setTried(false) }}>Undo changes</button>}
      </div>
    </form>
  )
}

// The email: shown with "Change"; a new address gets a 6-digit code, and the email changes only after the code is entered.
function EmailCard({ profile, onChanged, say }: { profile: Profile; onChanged: (profile: Profile) => void; say: Say }) {
  const { authFetch } = useAuth()
  const [editing, setEditing] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [code, setCode] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useUnsavedChanges((editing && newEmail.trim() !== '') || code.trim() !== '')

  const emailProblem = tried ? firstError(rules.required(newEmail, 'new email address'), rules.email(newEmail.trim())) : null
  const pending = profile.pendingEmail

  async function send(event?: FormEvent) {
    event?.preventDefault()
    setTried(true)
    setError(null)
    const address = pending && !editing ? pending : newEmail.trim()
    if (!pending || editing) {
      if (firstError(rules.required(newEmail, 'new email address'), rules.email(address))) return
    }
    setBusy(true)
    try {
      const next = await authFetch<Profile>(accountPaths.email, 'POST', { newEmail: address })
      onChanged(next)
      setEditing(false)
      setNewEmail('')
      setTried(false)
      say(`A 6-digit code was sent to ${address}.`)
    } catch (reason) {
      setError(problemText(reason, 'Could not send the code. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from the email.'); return }
    setBusy(true)
    try {
      const next = await authFetch<Profile>(accountPaths.confirmEmail, 'POST', { code: code.trim() })
      setCode('')
      onChanged(next)
      say(`Your email is now ${next.email}.`)
    } catch (reason) {
      setError(problemText(reason, 'Could not check the code. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    setBusy(true)
    setError(null)
    try {
      onChanged(await authFetch<Profile>(accountPaths.email, 'DELETE'))
      setCode('')
    } catch (reason) {
      setError(problemText(reason, 'Could not cancel. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="sx-card">
      <div className="sx-card-head">
        <h2>Email address</h2>
        {!editing && !pending && <button type="button" className="sx-link" onClick={() => { setEditing(true); setError(null) }}>Change</button>}
      </div>
      <div className="ac-email-line">
        <strong>{profile.email}</strong>
        <span className={profile.emailVerified ? 'ac-chip ok' : 'ac-chip'}>{profile.emailVerified ? 'Confirmed' : 'Not confirmed'}</span>
      </div>
      <p className="sx-note">You log in with this email. HUB sends receipts and codes here.</p>

      {editing && !pending && (
        <form className="ac-form ac-inline" onSubmit={(event) => void send(event)} noValidate>
          <Field label="New email address" name="newEmail" type="email" value={newEmail} onChange={setNewEmail} error={emailProblem ?? undefined}
            autoComplete="email" hint="We will send a 6-digit code to this address. Your email changes only after you enter it." />
          <div className="sx-actions">
            <button type="submit" className="sx-button primary" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
            <button type="button" className="sx-button" onClick={() => { setEditing(false); setNewEmail(''); setTried(false); setError(null) }}>Cancel</button>
          </div>
        </form>
      )}

      {pending && (
        <form className="ac-form ac-inline ac-pending" onSubmit={(event) => void confirm(event)} noValidate>
          <p className="sx-note">We sent a 6-digit code to <strong>{pending}</strong>. Enter it to use this address. It works for 10 minutes.</p>
          <Field label="Code from the email" name="code" value={code} onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code" placeholder="123456" />
          <div className="sx-actions">
            <button type="submit" className="sx-button primary" disabled={busy}>{busy ? 'Checking…' : 'Confirm new email'}</button>
            <button type="button" className="sx-button" disabled={busy} onClick={() => void send()}>Send a new code</button>
            <button type="button" className="sx-link" disabled={busy} onClick={() => void cancel()}>Keep {profile.email}</button>
          </div>
        </form>
      )}
      {error && <p className="ac-alert" role="alert">{error}</p>}
    </section>
  )
}

// ---------- Addresses ----------

function AddressesPage({ say }: { say: Say }) {
  const { authFetch, user } = useAuth()
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // null = list; 'new' = the add form; otherwise the address being edited.
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    authFetch<Address[]>(accountPaths.addresses).then(setAddresses).catch((reason: unknown) => setError(problemText(reason, 'Could not load your addresses.')))
  }, [authFetch])

  async function run(action: () => Promise<Address[]>, done: string) {
    setBusy(true)
    try {
      setAddresses(await action())
      setDeleting(null)
      say(done)
    } catch (reason) {
      say(problemText(reason, 'That did not work. Please try again.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="ac-alert" role="alert">{error}</div>
  if (!addresses) return <p className="sx-empty">Loading…</p>

  const current = editing && editing !== 'new' ? addresses.find((item) => item.id === editing) : undefined
  if (editing) {
    return (
      <AddressForm key={editing} address={current} first={addresses.length === 0} defaultPhone={user?.phone ?? ''}
        onCancel={() => confirmLeave(() => setEditing(null))}
        onSaved={(list) => { setAddresses(list); setEditing(null); say(current ? 'The address is saved.' : 'The address is added.') }} />
    )
  }

  return (
    <div className="ac-stack">
      <div className="sx-actions">
        <button type="button" className="sx-button primary" onClick={() => setEditing('new')} disabled={addresses.length >= 20}>Add an address</button>
        {addresses.length >= 20 && <span className="sx-note">You can save up to 20 addresses.</span>}
      </div>
      {addresses.length === 0 ? (
        <p className="sx-empty">No saved addresses yet. Add your home or office, and checkout fills it in for you.</p>
      ) : (
        <ul className="ac-addresses">
          {addresses.map((address) => (
            <li key={address.id} className={address.isDefault ? 'ac-address default' : 'ac-address'}>
              <div className="ac-address-head">
                <strong>{address.label}</strong>
                {address.isDefault && <span className="ac-chip ok">Default</span>}
              </div>
              <p>{address.addressLine}</p>
              <p className="ac-muted">{address.city} · {formatPhone(address.contactPhone)}</p>
              <a className="ac-maplink" href={`https://www.openstreetmap.org/?mlat=${address.latitude}&mlon=${address.longitude}#map=18/${address.latitude}/${address.longitude}`}
                target="_blank" rel="noreferrer">See on the map</a>
              {deleting === address.id ? (
                <div className="ac-confirm" role="group" aria-label="Delete this address?">
                  <span>Delete this address?</span>
                  <button type="button" className="sx-button danger" disabled={busy}
                    onClick={() => void run(() => authFetch<Address[]>(accountPaths.address(address.id), 'DELETE'), 'The address is deleted.')}>Delete</button>
                  <button type="button" className="sx-button" onClick={() => setDeleting(null)}>Keep it</button>
                </div>
              ) : (
                <div className="ac-address-actions">
                  <button type="button" className="sx-link" onClick={() => setEditing(address.id)}>Edit</button>
                  {!address.isDefault && (
                    <button type="button" className="sx-link" disabled={busy}
                      onClick={() => void run(() => authFetch<Address[]>(accountPaths.makeDefault(address.id), 'POST'), `${address.label} is now your default address.`)}>
                      Make default
                    </button>
                  )}
                  <button type="button" className="sx-link danger" onClick={() => setDeleting(address.id)}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type AddressFields = 'label' | 'addressLine' | 'city' | 'contactPhone'

function AddressForm({ address, first, defaultPhone, onCancel, onSaved }: {
  address?: Address; first: boolean; defaultPhone: string; onCancel: () => void; onSaved: (list: Address[]) => void
}) {
  const { authFetch } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [start] = useState<AddressInput>(() => address
    ? { label: address.label, addressLine: address.addressLine, city: address.city, contactPhone: address.contactPhone,
      latitude: address.latitude, longitude: address.longitude, isDefault: address.isDefault }
    : { label: 'Home', addressLine: '', city: '', contactPhone: defaultPhone, ...DEFAULT_POSITION, isDefault: first })
  const [values, setValues] = useState<AddressInput>(start)
  const [placed, setPlaced] = useState(Boolean(address))
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useUnsavedChanges(JSON.stringify(values) !== JSON.stringify(start), formRef)
  const set = (patch: Partial<AddressInput>) => setValues((current) => ({ ...current, ...patch }))

  const check = (input: AddressInput) => collect<AddressFields>({
    label: firstError(rules.required(input.label, 'label'), rules.maxLength(input.label.trim(), 50, 'Label')),
    addressLine: firstError(rules.required(input.addressLine, 'address'), rules.minLength(input.addressLine.trim(), 5, 'Address'),
      rules.maxLength(input.addressLine.trim(), 300, 'Address')),
    city: firstError(rules.required(input.city, 'city'), rules.minLength(input.city.trim(), 2, 'City'), rules.maxLength(input.city.trim(), 100, 'City')),
    contactPhone: firstError(rules.required(input.contactPhone, 'contact phone'), rules.phone(input.contactPhone)),
  })
  const errors = tried ? check(values) : {}

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = check(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    if (!placed) { setError('Set the delivery location: drag the pin on the map, or use your current location.'); return }
    setBusy(true)
    const body = { ...values, label: values.label.trim(), addressLine: values.addressLine.trim(), city: values.city.trim() }
    try {
      onSaved(address
        ? await authFetch<Address[]>(accountPaths.address(address.id), 'PUT', body)
        : await authFetch<Address[]>(accountPaths.addresses, 'POST', body))
    } catch (reason) {
      setError(problemText(reason, 'Could not save the address. Please try again.'))
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} className="sx-card ac-form ac-address-form" onSubmit={submit} noValidate>
      <div className="sx-card-head"><h2>{address ? `Edit ${address.label}` : 'Add an address'}</h2></div>
      <div className="ac-labels" role="group" aria-label="Label">
        {LABEL_CHOICES.map((choice) => (
          <button key={choice} type="button" className={values.label === choice ? 'ac-label active' : 'ac-label'} aria-pressed={values.label === choice}
            onClick={() => set({ label: choice })}>{choice}</button>
        ))}
      </div>
      <div className="ac-grid">
        <Field label="Label" name="label" value={values.label} onChange={(label) => set({ label })} error={errors.label} placeholder="For example Home" />
        <Field label="City" name="city" value={values.city} onChange={(city) => set({ city })} error={errors.city} autoComplete="address-level2" />
      </div>
      <Field label="Address" name="addressLine" value={values.addressLine} onChange={(addressLine) => set({ addressLine })} error={errors.addressLine}
        autoComplete="street-address" placeholder="House, street, block and area" />
      <PhoneField label="Contact phone for delivery" name="contactPhone" value={values.contactPhone} onChange={(contactPhone) => set({ contactPhone })}
        error={errors.contactPhone} />
      <LocationPicker value={{ latitude: values.latitude, longitude: values.longitude }}
        onChange={(position) => { set(position); setPlaced(true); setError(null) }} />
      {!address?.isDefault && (
        <label className="ac-check">
          <input type="checkbox" checked={values.isDefault || first} disabled={first} onChange={(event) => set({ isDefault: event.target.checked })} />
          {first ? 'This is your first address, so it is your default' : 'Use as my default address'}
        </label>
      )}
      {error && <p className="ac-alert" role="alert">{error}</p>}
      <div className="sx-actions">
        <button type="submit" className="sx-button primary" disabled={busy}>{busy ? 'Saving…' : address ? 'Save changes' : 'Save address'}</button>
        <button type="button" className="sx-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ---------- Password ----------

type PasswordFields = 'currentPassword' | 'newPassword' | 'repeatPassword'

function PasswordPage({ say }: { say: Say }) {
  const { authFetch } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const empty = { currentPassword: '', newPassword: '', repeatPassword: '' }
  const [values, setValues] = useState(empty)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useUnsavedChanges(Object.values(values).some((value) => value !== ''), formRef)
  const set = (field: PasswordFields) => (value: string) => setValues({ ...values, [field]: value })

  const check = (input: typeof values) => collect<PasswordFields>({
    currentPassword: rules.required(input.currentPassword, 'current password'),
    newPassword: firstError(rules.required(input.newPassword, 'new password'),
      input.newPassword && input.newPassword.length < 12 ? 'Use at least 12 characters.' : null,
      input.newPassword.length > 128 ? 'Use at most 128 characters.' : null,
      input.newPassword && input.newPassword === input.currentPassword ? 'Choose a password different from the current one.' : null),
    repeatPassword: input.repeatPassword !== input.newPassword ? 'The two new passwords are not the same.' : null,
  })
  const errors = tried ? check(values) : {}

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = check(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    setBusy(true)
    try {
      await authFetch<void>(accountPaths.password, 'POST', { currentPassword: values.currentPassword, newPassword: values.newPassword })
      setValues(empty)
      setTried(false)
      say('Your password is changed. Other devices were logged out.')
    } catch (reason) {
      setError(problemText(reason, 'Could not change your password. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} className="sx-card ac-form ac-password" onSubmit={submit} noValidate>
      <div className="sx-card-head"><h2>Change password</h2></div>
      <Field label="Current password" name="currentPassword" type="password" value={values.currentPassword} onChange={set('currentPassword')}
        error={errors.currentPassword} autoComplete="current-password" />
      <Field label="New password" name="newPassword" type="password" value={values.newPassword} onChange={set('newPassword')}
        error={errors.newPassword} autoComplete="new-password" hint="At least 12 characters. A short sentence is easy to remember." />
      <Field label="New password again" name="repeatPassword" type="password" value={values.repeatPassword} onChange={set('repeatPassword')}
        error={errors.repeatPassword} autoComplete="new-password" />
      <p className="sx-note">After the change, every other phone and browser is logged out. This one stays logged in.</p>
      {error && <p className="ac-alert" role="alert">{error}</p>}
      <div className="sx-actions">
        <button type="submit" className="sx-button primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      </div>
    </form>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}
