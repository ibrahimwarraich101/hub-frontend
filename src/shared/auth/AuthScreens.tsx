// File purpose: Login and sign-up screens. Sign-up first asks "Personal or Business?"; a business user then picks a business type.
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError } from '../api/client'
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

function LoginForm({ onSignup }: { onSignup: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401 ? 'Email or password is incorrect.'
        : reason instanceof ApiError ? reason.message : 'Login failed. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h2>Log in</h2>
      <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="auth-switch">New to HUB? <button type="button" onClick={onSignup}>Create an account</button></p>
    </form>
  )
}

function SignupForm({ onLogin, availableBusiness }: { onLogin: () => void; availableBusiness: string[] }) {
  const { register, setBusinessIntent } = useAuth()
  const [step, setStep] = useState<'type' | 'business' | 'details'>('type')
  const [business, setBusiness] = useState<string | null>(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '+92', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    // Same rules as the backend, checked here first for quicker feedback.
    if (form.password.length < 12) return setError('Password must be at least 12 characters.')
    if (form.password !== form.confirm) return setError('The two passwords do not match.')
    if (!/^\+[1-9][0-9]{7,14}$/.test(form.phone)) return setError('Phone must look like +923001234567.')
    setBusy(true)
    try {
      setBusinessIntent(business)
      await register({ fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone, password: form.password })
    } catch (reason) {
      setBusinessIntent(null)
      setError(reason instanceof ApiError && reason.status === 409 ? 'An account with this email or phone already exists.'
        : reason instanceof ApiError ? reason.message : 'Sign-up failed. Please try again.')
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
    <form className="auth-card" onSubmit={submit}>
      <button type="button" className="auth-back" onClick={() => setStep(business ? 'business' : 'type')}>← Back</button>
      <h2>{chosen ? `Sign up as ${chosen.label}` : 'Sign up'}</h2>
      {chosen && <p className="auth-note">After creating your account you will fill in your {chosen.label.toLowerCase()} application.</p>}
      <label>Full name<input autoComplete="name" required maxLength={150} value={form.fullName} onChange={update('fullName')} /></label>
      <label>Email<input type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update('email')} /></label>
      <label>Phone<input type="tel" autoComplete="tel" required value={form.phone} onChange={update('phone')} placeholder="+923001234567" /></label>
      <label>Password (at least 12 characters)<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={form.password} onChange={update('password')} /></label>
      <label>Confirm password<input type="password" autoComplete="new-password" required maxLength={128} value={form.confirm} onChange={update('confirm')} /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      <p className="auth-switch">Already have an account? <button type="button" onClick={onLogin}>Log in</button></p>
    </form>
  )
}
