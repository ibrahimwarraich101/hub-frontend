// File purpose: Shared helper for calling the HUB backend API from the website. All modules use this.

// Backend address; set VITE_API_BASE_URL in .env.local to change it (default: local backend).
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5066'

// Error with the HTTP status and the backend's safe message, so screens can show something useful.
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// GET a JSON resource; throws ApiError for non-2xx responses and network failures.
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(API_BASE_URL + path, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Cannot reach the HUB server. Check that the backend is running.')
  }
  if (!response.ok) {
    // The backend returns ProblemDetails with a "title" that is safe to show.
    const problem = (await response.json().catch(() => null)) as { title?: string } | null
    throw new ApiError(response.status, problem?.title ?? `Request failed (${response.status}).`)
  }
  return (await response.json()) as T
}

// Turn a backend media path like /media/products/x.png into a full URL.
export function mediaUrl(path: string | null | undefined): string | null {
  return path ? API_BASE_URL + path : null
}
