// File purpose: TEMPORARY HUB home with service buttons, until the shared app shell (theme, login, navigation) is merged.
// Each module plugs its own entry component in here; replace this file with the shared shell when it arrives.
import { useState } from 'react'
import { MarketplaceApp } from './features/marketplace/MarketplaceApp'
import './App.css'

type Service = 'home' | 'ecommerce'

function App() {
  const [service, setService] = useState<Service>('home')

  if (service === 'ecommerce') return <MarketplaceApp onExit={() => setService('home')} />

  return (
    <main className="hub-home">
      <h1>HUB</h1>
      <p>Choose a service</p>
      <div className="hub-services">
        <button type="button" onClick={() => setService('ecommerce')}>
          E-Commerce
        </button>
        <button type="button" disabled title="Built by the HUB Drive module">
          HUB Drive
        </button>
        <button type="button" disabled title="Built by the HUB Food module">
          HUB Food
        </button>
      </div>
    </main>
  )
}

export default App
