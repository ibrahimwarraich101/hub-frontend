// File purpose: A button that lets the restaurant owner pick a photo, checks it in the browser and uploads it
// (dish photo, logo or cover). The server checks and re-saves the photo again.
import { useRef, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../../shared/auth/AuthContext'
import { checkFoodPhoto } from '../foodApi'

type Props<T> = {
  path: string
  label: string
  onUploaded: (result: T) => void
  onError: (message: string | null) => void
  className?: string
}

export function PhotoButton<T>({ path, label, onUploaded, onError, className = 'fd-secondary' }: Props<T>) {
  const { authFetch } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function chosen(file: File | undefined) {
    if (input.current) input.current.value = ''
    if (!file) return
    const problem = await checkFoodPhoto(file)
    if (problem) return onError(problem)
    onError(null)
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      onUploaded(await authFetch<T>(path, 'POST', body))
    } catch (reason) {
      onError(reason instanceof ApiError ? reason.message : 'Could not upload the photo. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void chosen(e.target.files?.[0])} />
      <button type="button" className={className} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Uploading…' : label}
      </button>
    </>
  )
}
