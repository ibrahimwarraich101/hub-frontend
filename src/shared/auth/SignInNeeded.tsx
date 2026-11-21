// File purpose: The panel a visitor sees on a page that needs an account (cart, checkout, orders) while browsing as a guest.
import { useSignInRequest } from './GuestContext'
import './auth.css'

export function SignInNeeded({ title, text, onBrowse }: { title: string; text: string; onBrowse: () => void }) {
  const signIn = useSignInRequest()
  return (
    <div className="auth-needed" role="status">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="auth-needed-actions">
        <button type="button" className="auth-needed-primary" onClick={signIn}>Sign in</button>
        <button type="button" className="auth-needed-secondary" onClick={onBrowse}>Keep browsing</button>
      </div>
    </div>
  )
}
