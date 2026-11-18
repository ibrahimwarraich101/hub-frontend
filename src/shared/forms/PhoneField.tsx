// File purpose: The one phone number field for every form: "+92" is fixed, the customer types the 10 digits and the
// space after the first 3 is added automatically ("+92 | 301 1234567"). The value given back is "+923011234567".
import type { ReactNode } from 'react'
import { phoneDigits, phoneDisplay, phoneValue } from './phone'
import './phone.css'

export function PhoneField(props: {
  label: string
  name: string
  // Saved form, e.g. "+923011234567" (older saved numbers like "03011234567" are understood too).
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: ReactNode
  autoComplete?: string
}) {
  const errorId = `${props.name}-error`
  const digits = phoneDigits(props.value)
  return (
    <label className={props.error ? 'auth-field invalid' : 'auth-field'}>
      {props.label}
      <span className="phone-input">
        <span className="phone-prefix" aria-hidden="true">+92</span>
        <input
          name={props.name}
          type="tel"
          inputMode="numeric"
          autoComplete={props.autoComplete ?? 'tel'}
          placeholder="301 1234567"
          maxLength={14}
          value={phoneDisplay(digits)}
          onChange={(event) => props.onChange(phoneValue(phoneDigits(event.target.value)))}
          aria-label={`${props.label}, after +92`}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={props.error ? errorId : undefined}
        />
      </span>
      {props.hint && !props.error && <span className="auth-hint">{props.hint}</span>}
      {props.error && <span id={errorId} className="auth-field-error">{props.error}</span>}
    </label>
  )
}
