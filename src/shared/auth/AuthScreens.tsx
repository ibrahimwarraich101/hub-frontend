// File purpose: Login and sign-up screens. Sign-up first asks "Personal or Business?"; a business user then picks a business type.
// "Forgot password?" emails a 6-digit code that sets a new password.
// New accounts then confirm their email with the 6-digit code that was emailed to them ("Check your email").
// All mistakes are checked here and shown under the field (browser popups are turned off with noValidate).
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ApiError } from '../api/client'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../forms/validation'
import type { FieldErrors } from '../forms/validation'
import { PhoneField } from '../forms/PhoneField'
import { useAuth } from './AuthContext'
import { authApi } from './authApi'
import { businessOptions } from './businessOptions'
import './auth.css'

type Props = {
  // Lets a module enable its own business option without changing this file.
  availableBusiness?: string[]
  // Which form opens first ("Sign in" or "Sign up" on the public website).
  initialMode?: 'login' | 'signup'
  // Returns to the public HUB website.
  onBack?: () => void
}

// Year for the footer, read once when the page loads.
const YEAR = new Date().getFullYear()

// The services shown on the brand panel (desktop only), in the HUB service tile colours.
const panelServices = [
  { name: 'Drive', text: 'Book a ride across the city', tone: 'drive' },
  { name: 'Food', text: 'Order from restaurants near you', tone: 'food' },
  { name: 'Store', text: 'Shop from local sellers', tone: 'shop' },
]

export function AuthScreens({ availableBusiness = [], initialMode = 'login', onBack }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify' | 'forgot'>(initialMode)
  // The address waiting for its code, and whether a code was just sent (sign-up) or may have been sent (login).
  const [verifyEmail, setVerifyEmail] = useState('')
  const showVerify = (email: string) => { setVerifyEmail(email); setMode('verify') }
  // "Forgot password?" starts with the email typed on the login form; after a reset the login form says so.
  const [resetEmail, setResetEmail] = useState('')
  const [loginNotice, setLoginNotice] = useState<string | null>(null)
  const toLogin = () => { setLoginNotice(null); setMode('login') }
  const afterReset = () => { setLoginNotice('Your password was changed. Log in with your new password.'); setMode('login') }
  return (
    <div className="auth-layout">
      {/* Wide screens: a green brand panel beside the form. Phones only see the form. */}
      <aside className="auth-panel" aria-hidden="true">
        <p className="auth-panel-brand">HUB</p>
        <div className="auth-panel-body">
          <h2>Rides, food and shopping in one app.</h2>
          <p>One account for everything you need in your city.</p>
          <ul className="auth-panel-services">
            {panelServices.map((service) => (
              <li key={service.name}>
                <span className={`auth-panel-tile ${service.tone}`}>{service.name.charAt(0)}</span>
                <span><strong>{service.name}</strong>{service.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-panel-note">Pay bills and manage your payment methods from the same place.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-page">
          {onBack && <button type="button" className="auth-home" onClick={onBack}>Back to HUB</button>}
          <h1 className="auth-brand">HUB</h1>
          {mode === 'login' && <LoginForm notice={loginNotice} onSignup={() => setMode('signup')} onVerify={showVerify}
            onForgot={(email) => { setResetEmail(email); setMode('forgot') }} />}
          {mode === 'signup' && <SignupForm onLogin={toLogin} availableBusiness={availableBusiness} onVerify={showVerify} />}
          {mode === 'verify' && <VerifyEmailForm email={verifyEmail} onLogin={toLogin} />}
          {mode === 'forgot' && <ForgotPassword initialEmail={resetEmail} onLogin={toLogin} onDone={afterReset} />}
          <footer className="auth-footer">© {YEAR} HUB. All rights reserved.</footer>
        </div>
      </main>
    </div>
  )
}

// Small spinner shown inside a button while it waits for the server.
function Spinner() {
  return <span className="auth-spinner" aria-hidden="true" />
}

// Eye icon for the password switch: open eye = show the password, crossed eye = hide it again.
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  )
}

// Password input with a Show / Hide eye switch, and an optional link on the label row (e.g. "Forgot password?").
function PasswordField(props: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  error?: string
  hint?: ReactNode
  placeholder?: string
  action?: ReactNode
  // Confirm password: the person must type it, so pasting and dropping text are turned off.
  noPaste?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [pasteBlocked, setPasteBlocked] = useState(false)
  const inputId = `auth-${props.name}`
  const errorId = `${props.name}-error`
  const blockPaste = (event: { preventDefault: () => void }) => { event.preventDefault(); setPasteBlocked(true) }
  const hint = pasteBlocked ? 'Please type the password again. Pasting is turned off here.' : props.hint
  return (
    <div className={props.error ? 'auth-field invalid' : 'auth-field'}>
      <div className="auth-label-row">
        <label htmlFor={inputId}>{props.label}</label>
        {props.action}
      </div>
      <div className="auth-password">
        <input
          id={inputId}
          name={props.name}
          type={visible ? 'text' : 'password'}
          autoComplete={props.autoComplete}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(e) => { setPasteBlocked(false); props.onChange(e.target.value) }}
          onPaste={props.noPaste ? blockPaste : undefined}
          onDrop={props.noPaste ? blockPaste : undefined}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={props.error ? errorId : undefined}
        />
        <button type="button" className="auth-reveal" onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'}>
          <EyeIcon crossed={visible} />
        </button>
      </div>
      {hint && !props.error && <span className="auth-hint" role={pasteBlocked ? 'status' : undefined}>{hint}</span>}
      {props.error && <span id={errorId} className="auth-field-error">{props.error}</span>}
    </div>
  )
}

type ResetFields = 'code' | 'password' | 'confirm'

function validateReset(values: Record<ResetFields, string>): FieldErrors<ResetFields> {
  const code = values.code.replace(/\s/g, '')
  return collect({
    code: code === '' ? 'Please enter the code from the email.' : !/^[0-9]{6}$/.test(code) ? 'The code has 6 digits.' : null,
    password: firstError(rules.required(values.password, 'new password'), rules.minLength(values.password, 12, 'Password'),
      rules.maxLength(values.password, 128, 'Password')),
    confirm: values.confirm === '' ? 'Please type the new password again.'
      : values.confirm !== values.password ? 'The two passwords do not match.' : null,
  })
}

// Turns a failed forgot/reset request into a message for the user.
function resetError(reason: unknown, fallback: string): string {
  if (reason instanceof ApiError && reason.status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (reason instanceof ApiError && (reason.status === 0 || reason.status === 400)) return reason.message
  // 404: the backend is older than this screen (restart it with the latest code). 503: the database is not ready.
  if (reason instanceof ApiError && reason.status === 404) return 'Password reset is not available on this server yet.'
  if (reason instanceof ApiError && reason.status === 503) return 'Password reset is temporarily unavailable. Please try again later.'
  return fallback
}

// "Forgot password?": step 1 emails a 6-digit code; step 2 takes the code and a new password. An email without a HUB
// account stays on step 1 with the server's "No HUB account uses this email" message.
function ForgotPassword({ initialEmail, onLogin, onDone }: { initialEmail: string; onLogin: () => void; onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState(initialEmail.trim())
  const [values, setValues] = useState({ code: '', password: '', confirm: '' })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const set = (field: ResetFields) => (value: string) => setValues({ ...values, [field]: value })

  // Count down to the next allowed "Send a new code".
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const emailError = !tried || step !== 'email' ? undefined
    : firstError(rules.required(email, 'email'), rules.email(email), rules.maxLength(email.trim(), 254, 'Email')) ?? undefined
  const errors = tried && step === 'reset' ? validateReset(values) : {}

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    if (firstError(rules.required(email, 'email'), rules.email(email), rules.maxLength(email.trim(), 254, 'Email'))) {
      return formRef.current?.querySelector<HTMLInputElement>('input[name="email"]')?.focus()
    }
    setBusy(true)
    try {
      await authApi.forgotPassword(email.trim())
      setTried(false)
      setWait(RESEND_SECONDS)
      setStep('reset')
    } catch (reason) {
      setError(resetError(reason, 'Could not send the code. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    setNotice(null)
    setWait(RESEND_SECONDS)
    try {
      await authApi.forgotPassword(email.trim())
      setNotice('A new code is on its way. It can take a minute; check your spam folder too.')
    } catch (reason) {
      setError(resetError(reason, 'Could not send a new code. Please try again.'))
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    setNotice(null)
    const found = validateReset(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    setBusy(true)
    try {
      await authApi.resetPassword(email.trim(), values.code.replace(/\s/g, ''), values.password)
      onDone()
    } catch (reason) {
      setError(resetError(reason, 'Could not change the password. Please try again.'))
      setBusy(false)
    }
  }

  if (step === 'email') {
    return (
      <form ref={formRef} className="auth-card" onSubmit={sendCode} noValidate>
        <div className="auth-heading">
          <h2>Reset your password</h2>
          <p className="auth-subtitle">Enter your account's email and we will send you a 6-digit code.</p>
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
          value={email} onChange={setEmail} error={emailError} />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="auth-primary" disabled={busy}>{busy ? <><Spinner />Sending…</> : 'Send code'}</button>
        <p className="auth-switch">Remembered it? <button type="button" onClick={onLogin}>Back to log in</button></p>
      </form>
    )
  }

  return (
    <form ref={formRef} className="auth-card" onSubmit={reset} noValidate>
      <div className="auth-heading">
        <h2>Set a new password</h2>
        <p className="auth-subtitle">We sent a 6-digit code to <strong>{email.trim()}</strong>. The code works for 10 minutes. Check your spam folder too.</p>
      </div>
      <label className={errors.code ? 'auth-field invalid' : 'auth-field'}>
        Code
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" value={values.code}
          onChange={(event) => set('code')(event.target.value.replace(/[^0-9 ]/g, ''))} aria-invalid={errors.code ? true : undefined}
          aria-describedby={errors.code ? 'code-error' : undefined} className="auth-code" />
        {errors.code && <span id="code-error" className="auth-field-error">{errors.code}</span>}
      </label>
      <PasswordField label="New password" name="password" autoComplete="new-password" value={values.password} onChange={set('password')}
        error={errors.password} hint={`At least 12 characters (${values.password.length} typed)`} />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" noPaste value={values.confirm}
        onChange={set('confirm')} error={errors.confirm} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p className="auth-success" role="status">{notice}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Change password'}</button>
      <button type="button" className="auth-secondary" disabled={wait > 0} onClick={() => void resend()}>
        {wait > 0 ? `Send a new code (${wait}s)` : 'Send a new code'}
      </button>
      <p className="auth-switch">Wrong email address? <button type="button" onClick={() => { setStep('email'); setTried(false); setError(null); setNotice(null) }}>Change it</button></p>
    </form>
  )
}

// One labelled input with its own error message underneath.
export function Field(props: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  autoComplete?: string
  placeholder?: string
  hint?: ReactNode
}) {
  const errorId = `${props.name}-error`
  return (
    <label className={props.error ? 'auth-field invalid' : 'auth-field'}>
      {props.label}
      <input
        name={props.name}
        type={props.type ?? 'text'}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? errorId : undefined}
      />
      {props.hint && !props.error && <span className="auth-hint">{props.hint}</span>}
      {props.error && <span id={errorId} className="auth-field-error">{props.error}</span>}
    </label>
  )
}

type LoginFields = 'email' | 'password'

function validateLogin(values: Record<LoginFields, string>): FieldErrors<LoginFields> {
  return collect({
    email: firstError(rules.required(values.email, 'email'), rules.email(values.email), rules.maxLength(values.email.trim(), 254, 'Email')),
    password: firstError(rules.required(values.password, 'password'), rules.maxLength(values.password, 128, 'Password')),
  })
}

function LoginForm({ notice, onSignup, onVerify, onForgot }: {
  notice: string | null
  onSignup: () => void
  onVerify: (email: string) => void
  onForgot: (email: string) => void
}) {
  const { login } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ email: '', password: '' })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // After the first attempt, messages update live while the user types.
  const errors = tried ? validateLogin(values) : {}
  const set = (field: LoginFields) => (value: string) => setValues({ ...values, [field]: value })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = validateLogin(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    setBusy(true)
    try {
      if (await login(values.email.trim(), values.password) === 'verify') onVerify(values.email.trim())
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401 ? 'Email or password is incorrect.'
        : reason instanceof ApiError && reason.status === 0 ? reason.message
          : reason instanceof ApiError && reason.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
            : 'Login failed. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} className="auth-card" onSubmit={submit} noValidate>
      <div className="auth-heading">
        <h2>Log in</h2>
        <p className="auth-subtitle">Welcome back. Log in to continue.</p>
      </div>
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
        value={values.email} onChange={set('email')} error={errors.email} />
      <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Your password"
        value={values.password} onChange={set('password')} error={errors.password}
        action={<button type="button" className="auth-link" onClick={() => onForgot(values.email)}>Forgot password?</button>} />
      {notice && !error && <p className="auth-success" role="status">{notice}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? <><Spinner />Logging in…</> : 'Log in'}</button>
      <p className="auth-divider"><span>New to HUB?</span></p>
      <button type="button" className="auth-outline" onClick={onSignup}>Create an account</button>
    </form>
  )
}

type SignupFields = 'fullName' | 'email' | 'phone' | 'password' | 'confirm'

function validateSignup(values: Record<SignupFields, string>): FieldErrors<SignupFields> {
  return collect({
    fullName: firstError(rules.required(values.fullName, 'full name'), rules.maxLength(values.fullName.trim(), 150, 'Full name')),
    email: firstError(rules.required(values.email, 'email'), rules.email(values.email), rules.maxLength(values.email.trim(), 254, 'Email')),
    phone: firstError(rules.required(values.phone.replace('+92', ''), 'phone number'), rules.phone(values.phone)),
    password: firstError(rules.required(values.password, 'password'), rules.minLength(values.password, 12, 'Password'),
      rules.maxLength(values.password, 128, 'Password')),
    confirm: values.confirm === '' ? 'Please type the password again.'
      : values.confirm !== values.password ? 'The two passwords do not match.' : null,
  })
}

function SignupForm({ onLogin, availableBusiness, onVerify }: { onLogin: () => void; availableBusiness: string[]; onVerify: (email: string) => void }) {
  const { register, setBusinessIntent } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState<'type' | 'business' | 'details'>('type')
  const [business, setBusiness] = useState<string | null>(null)
  const [values, setValues] = useState({ fullName: '', email: '', phone: '+92', password: '', confirm: '' })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errors = tried ? validateSignup(values) : {}
  const set = (field: SignupFields) => (value: string) => setValues({ ...values, [field]: value })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    const found = validateSignup(values)
    if (hasErrors(found)) return focusFirstError(formRef.current, found)
    setBusy(true)
    try {
      setBusinessIntent(business)
      const next = await register({ fullName: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim(), password: values.password })
      if (next === 'verify') onVerify(values.email.trim())
    } catch (reason) {
      setBusinessIntent(null)
      // Only things the frontend cannot know (already used, server down) come back from the backend.
      setError(reason instanceof ApiError && reason.status === 409 ? 'An account with this email or phone number already exists. Try logging in.'
        : reason instanceof ApiError && reason.status === 0 ? reason.message
          : reason instanceof ApiError && reason.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
            : 'Sign-up failed. Please try again.')
      setBusy(false)
    }
  }

  if (step === 'type') {
    return (
      <div className="auth-card">
        <h2>Create an account</h2>
        <p>How will you use HUB?</p>
        <button type="button" className="auth-choice" onClick={() => { setBusiness(null); setStep('details') }}>
          <strong>Personal</strong>
        </button>
        <button type="button" className="auth-choice" onClick={() => setStep('business')}>
          <strong>Business</strong>
        </button>
        <p className="auth-switch">Already have an account? <button type="button" onClick={onLogin}>Log in</button></p>
      </div>
    )
  }

  if (step === 'business') {
    return (
      <div className="auth-card">
        <button type="button" className="auth-back" onClick={() => setStep('type')}>Back</button>
        <h2>What kind of business?</h2>
        <p className="auth-note">You can also use HUB as a customer. Business features unlock after an administrator approves your application.</p>
        {businessOptions.map((option) => {
          const available = option.available || availableBusiness.includes(option.id)
          return (
            <button key={option.id} type="button" className="auth-choice" disabled={!available}
              onClick={() => { setBusiness(option.id); setStep('details') }}>
              <strong>{option.label}</strong>
              <span>{available ? option.description : 'Coming soon'}</span>
            </button>
          )
        })}
      </div>
    )
  }

  const chosen = businessOptions.find((option) => option.id === business)
  return (
    <form ref={formRef} className="auth-card" onSubmit={submit} noValidate>
      <button type="button" className="auth-back" onClick={() => setStep(business ? 'business' : 'type')}>Back</button>
      <h2>{chosen ? `Sign up as ${chosen.label}` : 'Sign up'}</h2>
      {chosen && <p className="auth-note">After creating your account you will fill in your {chosen.label.toLowerCase()} application.</p>}
      <Field label="Full name" name="fullName" autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} />
      <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
      <PhoneField label="Phone" name="phone" value={values.phone} onChange={set('phone')} error={errors.phone} />
      <PasswordField label="Password" name="password" autoComplete="new-password" value={values.password} onChange={set('password')}
        error={errors.password} hint={`At least 12 characters (${values.password.length} typed)`} />
      <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" noPaste value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? <><Spinner />Creating account…</> : 'Create account'}</button>
      <p className="auth-switch">Already have an account? <button type="button" onClick={onLogin}>Log in</button></p>
    </form>
  )
}

// How long to wait before "Send a new code" works again (the server allows one code a minute).
const RESEND_SECONDS = 60

// "Check your email": the 6-digit code confirms the address and logs the user in.
function VerifyEmailForm({ email, onLogin }: { email: string; onLogin: () => void }) {
  const { verifyEmail, resendCode } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)
  const [code, setCode] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [wait, setWait] = useState(RESEND_SECONDS)
  const typed = code.replace(/\s/g, '')
  const codeError = !tried ? undefined : typed === '' ? 'Please enter the code from the email.'
    : !/^[0-9]{6}$/.test(typed) ? 'The code has 6 digits.' : undefined

  // Count down to the next allowed "Send a new code".
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    setError(null)
    setNotice(null)
    if (!/^[0-9]{6}$/.test(typed)) return formRef.current?.querySelector<HTMLInputElement>('input[name="code"]')?.focus()
    setBusy(true)
    try {
      // On success the user is logged in and the app opens by itself.
      await verifyEmail(email, typed)
    } catch (reason) {
      setError(reason instanceof ApiError && (reason.status === 400 || reason.status === 0) ? reason.message
        : reason instanceof ApiError && reason.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
          : 'Could not check the code. Please try again.')
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    setNotice(null)
    setWait(RESEND_SECONDS)
    try {
      await resendCode(email)
      setNotice('A new code is on its way. It can take a minute; check your spam folder too.')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Could not send a new code. Please try again.')
    }
  }

  return (
    <form ref={formRef} className="auth-card" onSubmit={submit} noValidate>
      <h2>Check your email</h2>
      <p className="auth-note">We sent a 6-digit code to <strong>{email}</strong>. Enter it below to confirm your email address.
        The code works for 10 minutes.</p>
      <label className={codeError ? 'auth-field invalid' : 'auth-field'}>
        Code
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9 ]/g, ''))} aria-invalid={codeError ? true : undefined}
          aria-describedby={codeError ? 'code-error' : undefined} className="auth-code" />
        {codeError && <span id="code-error" className="auth-field-error">{codeError}</span>}
      </label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p className="auth-success" role="status">{notice}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? <><Spinner />Checking…</> : 'Confirm email'}</button>
      <button type="button" className="auth-secondary" disabled={wait > 0} onClick={() => void resend()}>
        {wait > 0 ? `Send a new code (${wait}s)` : 'Send a new code'}
      </button>
      <p className="auth-switch">Wrong email address? <button type="button" onClick={onLogin}>Back to log in</button></p>
    </form>
  )
}
