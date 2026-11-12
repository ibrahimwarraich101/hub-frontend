// File purpose: The admin portal's menu. Shared pages are listed here; each module adds its own pages with ONE line
// in `moduleSections` below (e.g. HUB Drive: driver licence approvals, HUB Food: restaurant approvals).
import type { ReactNode } from 'react'
import { ActivityPage } from './ActivityPage'
import { DashboardPage } from './DashboardPage'
import { UsersPage } from './UsersPage'

export type AdminRoute = { section: string; id: string | null }

export type AdminSection = {
  // Used in the address, e.g. #admin/users
  id: string
  label: string
  // Menu group heading, e.g. "General" or "E-Commerce".
  group: string
  // True when the address part after the section is a tab (e.g. #admin/sellers/Approved), not an opened item.
  idIsTab?: boolean
  // The page. `id` is the item opened inside the section (e.g. one user), and `go` moves to another page.
  render: (props: { id: string | null; go: (route: AdminRoute) => void }) => ReactNode
}

// A module can also show a summary card on the dashboard.
export type AdminDashboardCard = { id: string; render: (props: { go: (route: AdminRoute) => void }) => ReactNode }

const sharedSections: AdminSection[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'General', render: ({ go }) => <DashboardPage go={go} /> },
  { id: 'users', label: 'Users', group: 'General', render: ({ id, go }) => <UsersPage userId={id} go={go} /> },
  { id: 'activity', label: 'Activity log', group: 'General', render: ({ id, go }) => <ActivityPage userId={id} go={go} /> },
]

// Modules: add one line each.
const moduleSections: AdminSection[] = [
]

export const dashboardCards: AdminDashboardCard[] = [
]

export const adminSections: AdminSection[] = [...sharedSections, ...moduleSections]
