// File purpose: The "You have unsaved changes" warning, shared by every edit form on the website.
// - A form calls useUnsavedChanges(dirty, formRef) while it is open; `dirty` is true when something differs from what was saved.
// - Anything that leaves a page (side bar, Back, Cancel, Back to HUB) calls confirmLeave(go): with no unsaved form it runs
//   `go` at once; otherwise <UnsavedChangesDialog /> asks: Save changes / Leave without saving / Keep editing.
// - Refreshing or closing the browser tab while a form is dirty shows the browser's own "Leave site?" warning.
import { useEffect, useId, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'

type Guard = { dirty: boolean; form: RefObject<HTMLFormElement | null> | null }

const guards = new Map<string, Guard>()
// The leave that is waiting for an answer in the dialog, or null when the dialog is closed.
let pending: (() => void) | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

function dirtyGuard(): Guard | undefined {
  return [...guards.values()].find((guard) => guard.dirty)
}

// The form's work is done (e.g. the order was placed and the page is going to JazzCash): stop warning about it.
export function clearUnsavedChanges() {
  guards.forEach((guard) => { guard.dirty = false })
}

export function hasUnsavedChanges(): boolean {
  return dirtyGuard() !== undefined
}

// Leaves now, or asks first when a form has unsaved changes.
export function confirmLeave(go: () => void) {
  if (!hasUnsavedChanges()) return go()
  pending = go
  notify()
}

// The dialog's three answers.
export const unsavedDialog = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  isOpen: () => pending !== null,
  // Saves with the form's own Save button and stays on the page, so the person sees whether it worked.
  save() {
    const form = dirtyGuard()?.form?.current
    pending = null
    notify()
    form?.requestSubmit()
  },
  leave() {
    const go = pending
    pending = null
    // The changes are given up, so the form no longer blocks leaving.
    guards.forEach((guard) => { guard.dirty = false })
    notify()
    go?.()
  },
  stay() {
    pending = null
    notify()
  },
  canSave: () => Boolean(dirtyGuard()?.form?.current),
}

export function useUnsavedDialogOpen(): boolean {
  return useSyncExternalStore(unsavedDialog.subscribe, unsavedDialog.isOpen)
}

// Call in an edit form. formRef: the form whose submit saves it (lets the dialog offer "Save changes").
export function useUnsavedChanges(dirty: boolean, formRef: RefObject<HTMLFormElement | null> | null = null) {
  const id = useId()
  useEffect(() => {
    guards.set(id, { dirty, form: formRef })
  }, [id, dirty, formRef])
  // Forget the form when it closes.
  useEffect(() => () => { guards.delete(id) }, [id])

  // Refresh or closing the tab: the browser asks "Leave site? Changes you made may not be saved."
  useEffect(() => {
    if (!dirty) return
    // Checked when the page is leaving, so clearUnsavedChanges() just before a redirect turns it off.
    const warn = (event: BeforeUnloadEvent) => { if (guards.get(id)?.dirty) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, id])
}
