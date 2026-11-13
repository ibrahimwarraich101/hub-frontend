// File purpose: A button that opens a small "write a reason, then confirm" box on the page (no browser pop-ups).
// Used for every admin decision that is written to the activity log.
import { useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { reasonError } from './adminApi'

type Props = {
  label: string
  // Shown above the reason box, e.g. "The user is logged out on every device."
  explanation: string
  tone?: 'danger' | 'primary'
  disabled?: boolean
  onConfirm: (reason: string) => Promise<void>
}

export function ReasonAction({ label, explanation, tone = 'primary', disabled, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const problem = tried ? reasonError(reason) : null
  const buttonClass = tone === 'danger' ? 'hub-button danger small' : 'hub-button small'

  if (!open) {
    return <button type="button" className={buttonClass} disabled={disabled} onClick={() => setOpen(true)}>{label}</button>
  }

  async function confirm() {
    setTried(true)
    setError(null)
    if (reasonError(reason)) return
    setBusy(true)
    try {
      await onConfirm(reason.trim())
      setOpen(false)
      setReason('')
      setTried(false)
    } catch (failure) {
      // Things only the server knows (already changed, last administrator, server down).
      setError(failure instanceof ApiError ? failure.message : 'That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-reason" role="group" aria-label={label}>
      <p>{explanation}</p>
      <label className={problem ? 'adm-field invalid' : 'adm-field'}>
        Reason
        <textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={600}
          aria-invalid={problem ? true : undefined} placeholder="Write why. It is saved in the activity log." />
        {problem ? <span className="adm-field-error">{problem}</span> : <span className="adm-hint">{reason.trim().length} / 500</span>}
      </label>
      {error && <p className="adm-alert error" role="alert">{error}</p>}
      <div className="adm-actions">
        <button type="button" className={buttonClass} disabled={busy} onClick={() => void confirm()}>{busy ? 'Saving…' : `Confirm: ${label}`}</button>
        <button type="button" className="hub-button secondary small" disabled={busy} onClick={() => { setOpen(false); setTried(false); setError(null) }}>Cancel</button>
      </div>
    </div>
  )
}
