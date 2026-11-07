// File purpose: The business types offered at sign-up. Each module connects its own option (sets available + the screen to open).
// Choosing a business type never grants access by itself: the module's application must be approved by an administrator.
export type BusinessOption = {
  id: 'driver' | 'restaurant' | 'seller' | 'fitness' | 'institution'
  label: string
  description: string
  // Owner module; only that module's team changes its entry.
  module: string
  // False shows "Coming soon" and the option cannot be chosen yet.
  available: boolean
}

export const businessOptions: BusinessOption[] = [
  { id: 'driver', label: 'Driver / Rider', description: 'Give rides with your car or motorcycle', module: 'HUB Drive', available: false },
  { id: 'restaurant', label: 'Restaurant owner', description: 'Sell food from your restaurant', module: 'HUB Food', available: false },
  { id: 'seller', label: 'E-Commerce store seller', description: 'Sell products in the HUB Store', module: 'E-Commerce', available: false },
  { id: 'fitness', label: 'Fitness / Wellness provider', description: 'Gyms, trainers and classes', module: 'Fitness', available: false },
  { id: 'institution', label: 'Institution / Biller', description: 'Schools and bill payments', module: 'Bills & Education', available: false },
]
