// File purpose: The admin portal's menu. Shared pages are listed here; each module adds its own pages with ONE line
// in `moduleSections` below (e.g. HUB Drive: driver licence approvals, HUB Food: restaurant approvals).
import type { ReactNode } from 'react'
import { ActivityPage } from './ActivityPage'
import { DashboardPage } from './DashboardPage'
import { UsersPage } from './UsersPage'
import type { IconName } from './AdminIcon'
import { storeAdminSections, storeDashboardCards } from '../marketplace/admin/storeAdminSections'

export type AdminRoute = { section: string; id: string | null }

export type AdminSection = {
  // Used in the address, e.g. #admin/users
  id: string
  label: string
  // Menu group heading, e.g. "General" or "E-Commerce".
  group: string
  icon: IconName
  // The page. `id` is the item opened inside the section (e.g. one user), and `go` moves to another page.
  render: (props: { id: string | null; go: (route: AdminRoute) => void }) => ReactNode
}

// A module can also show a summary card on the dashboard.
export type AdminDashboardCard = { id: string; render: (props: { go: (route: AdminRoute) => void }) => ReactNode }

const sharedSections: AdminSection[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'General', icon: 'dashboard', render: ({ go }) => <DashboardPage go={go} /> },
  { id: 'users', label: 'Users', group: 'General', icon: 'users', render: ({ id, go }) => <UsersPage userId={id} go={go} /> },
  { id: 'activity', label: 'Activity log', group: 'General', icon: 'activity', render: ({ id, go }) => <ActivityPage userId={id} go={go} /> },
]

// Modules: add one line each.
const moduleSections: AdminSection[] = [
  ...storeAdminSections, // E-Commerce (Muhammad Ibrahim)
]

export const dashboardCards: AdminDashboardCard[] = [
  ...storeDashboardCards, // E-Commerce
]

export const adminSections: AdminSection[] = [...sharedSections, ...moduleSections]
