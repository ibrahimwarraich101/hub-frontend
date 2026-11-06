// File purpose: TEMPORARY HUB home with login, until the shared app shell (theme, navigation) is merged.
// Logged out: login / sign-up. Logged in: the user's name, live roles, logout and the service buttons.
// Modules plug their own entry screens in here.
import { AuthScreens } from './shared/auth/AuthScreens'
import { useAuth } from './shared/auth/AuthContext'
import { businessOptions } from './shared/auth/businessOptions'
import './App.css'

function App() {
  const { restoring, user, logout, businessIntent, setBusinessIntent } = useAuth()

  if (restoring) return <main className="hub-home"><p>Loading…</p></main>
  if (!user) return <AuthScreens />

  const intent = businessOptions.find((option) => option.id === businessIntent)
  return (
    <main className="hub-home">
      <header className="hub-top">
        <h1>HUB</h1>
        <div className="hub-user">
          <span>Hello, {user.fullName}</span>
          <button type="button" onClick={() => void logout()}>Log out</button>
        </div>
      </header>
      <p className="hub-roles">Your roles: {user.roles.join(', ')}</p>

      {intent && (
        <div className="hub-intent" role="status">
          You chose <strong>{intent.label}</strong> at sign-up. The application form is provided by the {intent.module} module.
          <button type="button" onClick={() => setBusinessIntent(null)}>Dismiss</button>
        </div>
      )}

      <p>Choose a service</p>
      <div className="hub-services">
        <button type="button" disabled title="Built by the HUB Drive module">HUB Drive</button>
        <button type="button" disabled title="Built by the HUB Food module">HUB Food</button>
        <button type="button" disabled title="Built by the E-Commerce module">E-Commerce</button>
      </div>
    </main>
  )
}

export default App
