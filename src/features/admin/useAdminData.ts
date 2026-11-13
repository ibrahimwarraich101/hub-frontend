// File purpose: Loads one admin API address with the admin's login, and reloads it when the address changes or on request.
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'

type Loaded<T> = { key: string; data: T | null; error: string | null }

export function useAdminData<T>(path: string | null) {
  const { authFetch } = useAuth()
  const [version, setVersion] = useState(0)
  const [loaded, setLoaded] = useState<Loaded<T>>({ key: '', data: null, error: null })
  const key = `${path}#${version}`

  useEffect(() => {
    if (!path) return
    let current = true
    authFetch<T>(path)
      .then((data) => { if (current) setLoaded({ key, data, error: null }) })
      .catch((reason: unknown) => {
        if (current) setLoaded((old) => ({ key, data: old.data, error: reason instanceof ApiError && reason.status === 404 ? 'This item was not found.' : reason instanceof ApiError ? reason.message : 'Could not load this page.' }))
      })
    return () => { current = false }
  }, [authFetch, path, key])

  const reload = useCallback(() => setVersion((value) => value + 1), [])
  // Show a fresh answer (e.g. from a save) straight away without asking the server again.
  const replace = useCallback((data: T) => setLoaded((old) => ({ ...old, data })), [])
  // The previous data stays on screen while the next page loads, to avoid flicker.
  return { data: loaded.data, error: loaded.key === key ? loaded.error : null, loading: loaded.key !== key, reload, replace }
}
