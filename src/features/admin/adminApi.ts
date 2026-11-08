// File purpose: Shared admin portal API types and paths (matches docs/ADMIN_PORTAL.md in hub-backend).
export type RoleCount = { role: string; count: number }

export type AdminDashboard = {
  totalUsers: number
  activeUsers: number
  blockedUsers: number
  newUsersLast7Days: number
  roles: RoleCount[]
}

export type AdminUserSummary = {
  id: string
  fullName: string
  email: string
  phone: string
  isActive: boolean
  createdAt: string
  roles: string[]
}

export type AdminUserPage = { total: number; page: number; pageSize: number; items: AdminUserSummary[] }

export type AdminActivityPerson = { id: string; fullName: string; email: string }

export type AdminActivityItem = {
  id: string
  action: string
  reason: string
  details: string
  occurredAt: string
  actor: AdminActivityPerson
  target: AdminActivityPerson | null
}

export type AdminActivityPage = { total: number; page: number; pageSize: number; items: AdminActivityItem[] }

export type AdminUserDetails = {
  user: AdminUserSummary
  activeSessions: number
  businesses: { kind: string; id: string; name: string; status: string }[]
  recentActivity: AdminActivityItem[]
}

function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  return search.toString()
}

export const adminPaths = {
  dashboard: '/api/admin/dashboard',
  roles: '/api/admin/roles',
  users: (filters: { search?: string; role?: string; status?: string; page: number }) =>
    `/api/admin/users?${query({ ...filters, pageSize: 20 })}`,
  user: (id: string) => `/api/admin/users/${encodeURIComponent(id)}`,
  block: (id: string) => `/api/admin/users/${encodeURIComponent(id)}/block`,
  unblock: (id: string) => `/api/admin/users/${encodeURIComponent(id)}/unblock`,
  activity: (filters: { action?: string; userId?: string; page: number }) => `/api/admin/activity?${query({ ...filters, pageSize: 30 })}`,
  activityActions: '/api/admin/activity/actions',
}

// "UserBlocked" -> "User blocked"
export function actionLabel(action: string): string {
  const words = action.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function dateTime(value: string): string {
  return new Date(value).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Same rule as the backend: a reason of 1-500 characters.
export function reasonError(reason: string): string | null {
  const length = reason.trim().length
  if (length === 0) return 'Please write a reason. It is saved in the activity log.'
  if (length > 500) return `The reason can be at most 500 characters (you typed ${length}).`
  return null
}
