// File purpose: "My account" API types and addresses (hub-backend docs/ACCOUNT.md).
export type Profile = {
  id: string
  fullName: string
  email: string
  phone: string
  emailVerified: boolean
  // A new email waiting for its code, or null.
  pendingEmail: string | null
  memberSince: string
}

export type Address = {
  id: string
  label: string
  addressLine: string
  city: string
  contactPhone: string
  latitude: number
  longitude: number
  isDefault: boolean
  createdAt: string
}

export type AddressInput = Omit<Address, 'id' | 'createdAt'>

export const accountPaths = {
  profile: '/api/account/profile',
  password: '/api/account/password',
  email: '/api/account/email',
  confirmEmail: '/api/account/email/confirm',
  addresses: '/api/account/addresses',
  address: (id: string) => `/api/account/addresses/${encodeURIComponent(id)}`,
  makeDefault: (id: string) => `/api/account/addresses/${encodeURIComponent(id)}/default`,
}

// Where the map starts when an address has no position yet (Lahore).
export const DEFAULT_POSITION = { latitude: 31.5204, longitude: 74.3587 }

// Address labels offered as one-tap choices; anything else can be typed.
export const LABEL_CHOICES = ['Home', 'Office', 'Other']

// Whether a form's address, city and phone are exactly this saved address (checkout highlights the matching card).
export function matchesAddress(address: Address, line: string, city: string, phone: string): boolean {
  return address.addressLine === line.trim() && address.city === city.trim() && address.contactPhone === phone
}
