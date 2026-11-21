// File purpose: A short message that pops up near the top of the screen, stays about 3 seconds and hides by itself
// (e.g. "You cannot buy from your own store."). Show it with a new `id` each time so the same text can pop up again.
import { useEffect } from 'react'
import './toast.css'

export type ToastMessage = { id: number; text: string; tone?: 'error' | 'success' }

const SHOWN_MS = 3000

export function Toast({ message, onDone }: { message: ToastMessage | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDone, SHOWN_MS)
    return () => window.clearTimeout(timer)
  }, [message, onDone])

  if (!message) return null
  return (
    <div key={message.id} className={`hub-toast ${message.tone ?? 'error'}`} role={message.tone === 'success' ? 'status' : 'alert'}>
      <span>{message.text}</span>
      <button type="button" onClick={onDone} aria-label="Close message">Close</button>
    </div>
  )
}
