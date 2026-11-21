// File purpose: The box that asks what to do with unsaved changes before leaving a page (see unsavedChanges.ts).
// Mounted once at the top of the website.
import { useEffect, useRef } from 'react'
import { unsavedDialog, useUnsavedDialogOpen } from './unsavedChanges'
import './unsaved.css'

export function UnsavedChangesDialog() {
  const open = useUnsavedDialogOpen()
  const stayRef = useRef<HTMLButtonElement>(null)

  // Focus "Keep editing" (the safe choice); Escape also keeps editing.
  useEffect(() => {
    if (!open) return
    stayRef.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') unsavedDialog.stay() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])

  if (!open) return null
  return (
    <div className="uc-scrim" onClick={() => unsavedDialog.stay()}>
      <div className="uc-box" role="alertdialog" aria-modal="true" aria-labelledby="uc-title" aria-describedby="uc-text"
        onClick={(event) => event.stopPropagation()}>
        <h2 id="uc-title">You have unsaved changes</h2>
        <p id="uc-text">If you leave this page now, the changes you made here will be lost.</p>
        <div className="uc-actions">
          {unsavedDialog.canSave() && <button type="button" className="uc-save" onClick={() => unsavedDialog.save()}>Save changes</button>}
          <button type="button" className="uc-leave" onClick={() => unsavedDialog.leave()}>Leave without saving</button>
          <button type="button" ref={stayRef} className="uc-stay" onClick={() => unsavedDialog.stay()}>Keep editing</button>
        </div>
      </div>
    </div>
  )
}
