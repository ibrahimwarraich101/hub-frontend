// File purpose: Login and sign-up screens. Sign-up first asks "Personal or Business?"; a business user then picks a business type.
// All mistakes are checked here and shown under the field (browser popups are turned off with noValidate).
import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ApiError } from '../api/client'
import { collect, firstError, focusFirstError, hasErrors, rules } from '../forms/validation'
import type { FieldErrors } from '../forms/validation'
import { useAuth } from './AuthContext'
import { businessOptions } from './businessOptions'
import './auth.css'

type Props = {
  // Lets a module enable its own business option without changing this file.
  availableBusiness?: string[]
}

export function AuthScreens({ availableBusiness = [] }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  return (
    <main className="auth-page">
      <h1 className="auth-brand">HUB</h1>
      {mode === 'login'
        ? <LoginForm onSignup={() => setMode('signup')} />
        : <SignupForm onLogin={() => setMode('login')} availableBusiness={availableBusiness} />}
    </main>
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

function LoginForm({ onSignup }: { onSignup: () => void }) {
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
      await login(values.email.trim(), values.password)
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
      <h2>Log in</h2>
      <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={set('password')} error={errors.password} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="auth-switch">New to HUB? <button type="button" onClick={onSignup}>Create an account</button></p>
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

function SignupForm({ onLogin, availableBusiness }: { onLogin: () => void; availableBusiness: string[] }) {
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
      await register({ fullName: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim(), password: values.password })
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
          <strong>Personal</strong><span>Ride, order food, shop, pay bills</span>
        </button>
        <button type="button" className="auth-choice" onClick={() => setStep('business')}>
          <strong>Business</strong><span>Drive, run a restaurant or sell products</span>
        </button>
        <p className="auth-switch">Already have an account? <button type="button" onClick={onLogin}>Log in</button></p>
      </div>
    )
  }

  if (step === 'business') {
    return (
      <div className="auth-card">
        <button type="button" className="auth-back" onClick={() => setStep('type')}>← Back</button>
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
      <button type="button" className="auth-back" onClick={() => setStep(business ? 'business' : 'type')}>← Back</button>
      <h2>{chosen ? `Sign up as ${chosen.label}` : 'Sign up'}</h2>
      {chosen && <p className="auth-note">After creating your account you will fill in your {chosen.label.toLowerCase()} application.</p>}
      <Field label="Full name" name="fullName" autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} />
      <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+923001234567" value={values.phone} onChange={set('phone')}
        error={errors.phone} hint="With country code, for example +923001234567" />
      <Field label="Password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={set('password')}
        error={errors.password} hint={`At least 12 characters (${values.password.length} typed)`} />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      <p className="auth-switch">Already have an account? <button type="button" onClick={onLogin}>Log in</button></p>
    </form>
  )
}
