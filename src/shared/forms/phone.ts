// File purpose: Pakistan mobile numbers, used by every phone field on the website.
// On screen: a fixed "+92", then the customer types 3 digits (e.g. 301), the system adds a space, then 7 more digits.
// Saved and sent to the backend without spaces: +923011234567.

// The 10 digits after +92 (e.g. "3011234567"), from a saved number or anything the customer typed or pasted.
export function phoneDigits(value: string): string {
  const text = value.trim()
  let digits = text.replace(/\D/g, '')
  // Remove the country code (+92 / 0092 / a pasted 92...) or the local leading 0 (0301...).
  if (text.startsWith('+')) { if (digits.startsWith('92')) digits = digits.slice(2) }
  else if (digits.startsWith('0092')) digits = digits.slice(4)
  else if (digits.startsWith('92') && digits.length > 10) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

// The saved form: "+92" followed by the digits (just "+92" while nothing is typed yet).
export function phoneValue(digits: string): string {
  return '+92' + digits
}

// What the customer sees after "+92": "301 1234567".
export function phoneDisplay(digits: string): string {
  return digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits
}

// A full saved number for showing in lists: "+92 301 1234567". Other numbers are shown unchanged.
export function formatPhone(value: string): string {
  return /^\+923\d{9}$/.test(value) ? `+92 ${value.slice(3, 6)} ${value.slice(6)}` : value
}
