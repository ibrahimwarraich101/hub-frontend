// File purpose: Finds out, for the HUB home, whether the logged-in person has applied to sell on HUB Store or to run a
// restaurant on HUB Food, and the status of each application. Each module owns its own endpoint; this only reads them.
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { sellerPaths } from '../../features/marketplace/sellerApi'
import { foodPaths } from '../../features/food/foodApi'

export type BusinessStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended'

export type BusinessAccounts = {
  // False until both answers have arrived.
  loaded: boolean
  // null = has not applied (or the answer could not be loaded).
  seller: BusinessStatus | null
  restaurant: BusinessStatus | null
}

// `onHome` is true while the HUB home page is showing: the answers are loaded again each time the person comes back to it
// (for example right after sending an application), and are kept while they use a service. They are also loaded once
// when the website opens on another page (e.g. a refresh inside the store), for the business links in the top bar.
export function useBusinessAccounts(onHome: boolean): BusinessAccounts {
  const { authFetch, user } = useAuth()
  const [state, setState] = useState<{ userId: string | null; seller: BusinessStatus | null; restaurant: BusinessStatus | null }>(
    { userId: null, seller: null, restaurant: null })
  const userId = user?.id ?? null
  // The person the answers were last requested for.
  const requestedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || (!onHome && requestedFor.current === userId)) return
    requestedFor.current = userId
    let current = true
    // 404 means "no application"; any other failure is treated the same, so the home page still works.
    const statusOf = (path: string) => authFetch<{ status: BusinessStatus }>(path)
      .then((account) => account.status)
      .catch(() => null)
    void Promise.all([statusOf(sellerPaths.mine), statusOf(foodPaths.account)]).then(([seller, restaurant]) => {
      if (current) setState({ userId, seller, restaurant })
    })
    return () => { current = false }
  }, [authFetch, userId, onHome])

  return { loaded: userId !== null && state.userId === userId, seller: state.seller, restaurant: state.restaurant }
}
