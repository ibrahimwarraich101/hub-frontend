// File purpose: Small line icons for the admin portal menu (no icon library needed).

export type IconName = 'dashboard' | 'users' | 'activity' | 'store' | 'tag' | 'box' | 'car' | 'food'

const paths: Record<IconName, string> = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-3-4.6',
  activity: 'M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
  tag: 'M3 12V4h8l10 10-8 8L3 12zM7.5 8.5h.01',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  car: 'M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4v-4zM7.5 14h.01M16.5 14h.01',
  food: 'M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8',
}

export function AdminIcon({ name }: { name: IconName }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
