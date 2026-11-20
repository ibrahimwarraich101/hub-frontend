// File purpose: Calls the backend login/sign-up endpoints (docs/AUTHENTICATION.md and CUSTOMER_REGISTRATION.md in hub-backend).
import { API_BASE_URL, ApiError } from '../api/client'

export type TokenResponse = {
  accessToken: string
  tokenType: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

export type CurrentUser = {
  id: string
  fullName: string
  email: string
  phone: string
  // Live roles from the server: Customer, Driver, Administrator, Merchant, Restaurant.
  roles: string[]
}

export type RegisterInput = {
  fullName: string
  email: string
  phone: string
  password: string
}

// Send JSON and turn backend errors (ProblemDetails or validation errors) into one readable message.
export async function sendJson<T>(path: string, method: string, body?: unknown, accessToken?: string): Promise<T> {
  let response: Response
  // A FormData body (file upload) is sent as-is; the browser sets the multipart Content-Type itself.
  const isForm = body instanceof FormData
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the HUB server. Check that the backend is running.')
  }
  if (!response.ok) throw new ApiError(response.status, await problemMessage(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function problemMessage(response: Response): Promise<string> {
  // Validation errors list each field; other errors have a safe "title".
  const problem = (await response.json().catch(() => null)) as { title?: string; errors?: Record<string, string[]> } | null
  if (response.status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (problem?.errors) return Object.values(problem.errors).flat().join(' ')
  return problem?.title ?? `Request failed (${response.status}).`
}

export const authApi = {
  // Creates a Customer account; it does not log in by itself. When emailVerificationRequired is true, a 6-digit code
  // was emailed and the user must enter it (verifyEmail) before logging in.
  register: (input: RegisterInput) => sendJson<{ id: string; emailVerificationRequired?: boolean }>('/api/auth/register', 'POST', input),
  // A 403 here means the password was right but the email is not confirmed yet (a code was emailed).
  login: (email: string, password: string) => sendJson<TokenResponse>('/api/auth/login', 'POST', { email, password }),
  // The right code confirms the email and logs the user in.
  verifyEmail: (email: string, code: string) => sendJson<TokenResponse>('/api/auth/verify-email', 'POST', { email, code }),
  // Always answers the same way; a new code arrives at most once a minute.
  resendCode: (email: string) => sendJson<{ message: string }>('/api/auth/resend-code', 'POST', { email }),
  // "Forgot password?": always answers the same way; a reset code arrives at most once a minute.
  forgotPassword: (email: string) => sendJson<{ message: string }>('/api/auth/forgot-password', 'POST', { email }),
  // The right code sets the new password and logs out every session; the user then logs in again.
  resetPassword: (email: string, code: string, newPassword: string) =>
    sendJson<void>('/api/auth/reset-password', 'POST', { email, code, newPassword }),
  // Each refresh returns a NEW refresh token; the old one stops working.
  refresh: (refreshToken: string) => sendJson<TokenResponse>('/api/auth/refresh', 'POST', { refreshToken }),
  logout: (accessToken: string) => sendJson<void>('/api/auth/logout', 'POST', undefined, accessToken),
  me: (accessToken: string) => sendJson<CurrentUser>('/api/auth/me', 'GET', undefined, accessToken),
}
