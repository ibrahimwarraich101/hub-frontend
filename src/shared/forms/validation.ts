// File purpose: Frontend form checks shared by every module. Every mistake is caught and explained here, in our own words,
// before anything is sent. The backend repeats these rules for security, but users should never need its messages.

export type FieldErrors<T extends string> = Partial<Record<T, string>>

// Same rules as the backend (RegisterCustomerRequest / LoginRequest / seller application).
export const rules = {
  required: (value: string, label: string) => (value.trim() ? null : `Please enter your ${label}.`),
  minLength: (value: string, min: number, label: string) =>
    value.length >= min ? null : `${label} must be at least ${min} characters (you typed ${value.length}).`,
  maxLength: (value: string, max: number, label: string) =>
    value.length <= max ? null : `${label} can be at most ${max} characters (you typed ${value.length}).`,
  email: (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Enter a valid email address, for example name@gmail.com.',
  phone: (value: string) =>
    /^\+[1-9][0-9]{7,14}$/.test(value.trim()) ? null : 'Enter the phone number with country code and no spaces, for example +923001234567.',
}

// Return the first failing message for one field, or null when the value is fine.
export function firstError(...checks: (string | null)[]): string | null {
  return checks.find((message) => message !== null) ?? null
}

// Keep only fields that have a message.
export function collect<T extends string>(entries: Record<T, string | null>): FieldErrors<T> {
  const errors: FieldErrors<T> = {}
  for (const key of Object.keys(entries) as T[]) {
    const message = entries[key]
    if (message) errors[key] = message
  }
  return errors
}

export function hasErrors(errors: FieldErrors<string>): boolean {
  return Object.keys(errors).length > 0
}

// Move the keyboard focus to the first field with an error (fields carry name="...").
export function focusFirstError(form: HTMLFormElement | null, errors: FieldErrors<string>) {
  const first = Object.keys(errors)[0]
  if (form && first) (form.elements.namedItem(first) as HTMLElement | null)?.focus()
}
