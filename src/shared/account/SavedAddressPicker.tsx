// File purpose: "Deliver to" on checkout (HUB Store and HUB Food): the customer's saved addresses from My account as cards.
// Tapping one fills the delivery address, city and phone; the default address is offered once, when the form has no
// address yet. Without saved addresses, a short line explains where to save them. Typing in the form still works as before.
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { formatPhone } from '../forms/phone'
import { accountPaths } from './accountApi'
import type { Address } from './accountApi'
import './account.css'

type Props = {
  // The saved address the form currently matches (null when the customer typed something else).
  selectedId: string | null
  onPick: (address: Address) => void
  // Called once with the default address after loading (the form decides whether to use it).
  onDefault?: (address: Address) => void
}

export function SavedAddressPicker({ selectedId, onPick, onDefault }: Props) {
  const { authFetch } = useAuth()
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const defaultRef = useRef(onDefault)
  useEffect(() => { defaultRef.current = onDefault }, [onDefault])

  useEffect(() => {
    let current = true
    authFetch<Address[]>(accountPaths.addresses)
      .then((list) => {
        if (!current) return
        setAddresses(list)
        const preferred = list.find((item) => item.isDefault)
        if (preferred) defaultRef.current?.(preferred)
      })
      // Saved addresses are a shortcut: if they cannot load, the form still works.
      .catch(() => { if (current) setAddresses([]) })
    return () => { current = false }
  }, [authFetch])

  if (!addresses) return null
  if (addresses.length === 0) {
    return (
      <p className="ac-pick-empty">
        Tip: save your addresses in My account (under your name at the top) and pick them here next time.
      </p>
    )
  }
  return (
    <div className="ac-pick" role="radiogroup" aria-label="Saved addresses">
      <span className="ac-pick-title">Deliver to a saved address</span>
      <div className="ac-pick-list">
        {addresses.map((address) => (
          <button key={address.id} type="button" role="radio" aria-checked={selectedId === address.id}
            className={selectedId === address.id ? 'ac-pick-card active' : 'ac-pick-card'} onClick={() => onPick(address)}>
            <span className="ac-pick-head">
              <strong>{address.label}</strong>
              {address.isDefault && <span className="ac-chip ok">Default</span>}
            </span>
            <span className="ac-pick-line">{address.addressLine}</span>
            <span className="ac-pick-muted">{address.city} · {formatPhone(address.contactPhone)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

