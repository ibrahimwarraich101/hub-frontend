// File purpose: Keeps the logged-in user for the whole website and gives modules an authorized fetch.
// The short access key stays in memory; the refresh key is kept only for this browser tab (sessionStorage),
// so closing the tab logs the user out. Never use localStorage for these keys.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '../api/client'
import { authApi, sendJson } from './authApi'
import type { CurrentUser, RegisterInput, TokenResponse } from './authApi'

const REFRESH_KEY = 'hub.refreshToken'
const INTENT_KEY = 'hub.businessIntent'

export type AuthState = {
  // True only while restoring a previous login when the page opens.
  restoring: boolean
  user: CurrentUser | null
  hasRole: (role: string) => boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  // Calls the API with the user's access key, refreshing it once if it expired.
  authFetch: <T>(path: string, method?: string, body?: unknown) => Promise<T>
  // The business type chosen at sign-up (e.g. "seller"), kept for this tab until the module handles it.
  businessIntent: string | null
  setBusinessIntent: (intent: string | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

function readStorage(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch { /* storage blocked: the login simply lasts until the page reloads */ }
}

// Only one refresh may run at a time: refresh keys are single-use, so two parallel refreshes would log the user out.
let refreshInFlight: Promise<TokenResponse> | null = null
function refreshOnce(refreshToken: string): Promise<TokenResponse> {
  refreshInFlight ??= authApi.refresh(refreshToken).finally(() => { refreshInFlight = null })
  return refreshInFlight
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [restoring, setRestoring] = useState(() => readStorage(REFRESH_KEY) !== null)
  const [businessIntent, setIntentState] = useState<string | null>(() => readStorage(INTENT_KEY))
  const accessToken = useRef<string | null>(null)

  const clear = useCallback(() => {
    accessToken.current = null
    writeStorage(REFRESH_KEY, null)
    setUser(null)
  }, [])

  // Store new keys and load the user's name and live roles.
  const startSession = useCallback(async (tokens: TokenResponse) => {
    accessToken.current = tokens.accessToken
    writeStorage(REFRESH_KEY, tokens.refreshToken)
    setUser(await authApi.me(tokens.accessToken))
  }, [])

  // Get a fresh access key using the stored refresh key; logs out if that fails.
  const renew = useCallback(async (): Promise<string> => {
    const stored = readStorage(REFRESH_KEY)
    if (!stored) throw new ApiError(401, 'Please log in again.')
    try {
      const tokens = await refreshOnce(stored)
      accessToken.current = tokens.accessToken
      writeStorage(REFRESH_KEY, tokens.refreshToken)
      return tokens.accessToken
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clear()
      throw error
    }
  }, [clear])

  // When the page opens, restore the previous login of this tab (if any).
  useEffect(() => {
    if (!readStorage(REFRESH_KEY)) return
    let active = true
    // renew() is async: every state update below happens after the network call, not synchronously in this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    renew()
      .then((token) => authApi.me(token))
      .then((me) => { if (active) setUser(me) })
      .catch(() => { /* not logged in anymore */ })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [renew])

  const login = useCallback(async (email: string, password: string) => {
    await startSession(await authApi.login(email, password))
  }, [startSession])

  // Sign-up creates the account, then logs in with the same details.
  const register = useCallback(async (input: RegisterInput) => {
    await authApi.register(input)
    await startSession(await authApi.login(input.email, input.password))
  }, [startSession])

  const logout = useCallback(async () => {
    const token = accessToken.current
    clear()
    writeStorage(INTENT_KEY, null)
    setIntentState(null)
    if (token) await authApi.logout(token).catch(() => undefined)
  }, [clear])

  const authFetch = useCallback(async <T,>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    let token = accessToken.current ?? await renew()
    try {
      return await sendJson<T>(path, method, body, token)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
      token = await renew()
      return sendJson<T>(path, method, body, token)
    }
  }, [renew])

  const setBusinessIntent = useCallback((intent: string | null) => {
    writeStorage(INTENT_KEY, intent)
    setIntentState(intent)
  }, [])

  const value = useMemo<AuthState>(() => ({
    restoring,
    user,
    hasRole: (role) => user?.roles.includes(role) ?? false,
    login,
    register,
    logout,
    authFetch,
    businessIntent,
    setBusinessIntent,
  }), [restoring, user, login, register, logout, authFetch, businessIntent, setBusinessIntent])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Use inside any component below <AuthProvider>.
// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.')
  return context
}
