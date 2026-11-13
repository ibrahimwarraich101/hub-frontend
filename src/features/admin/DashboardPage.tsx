// File purpose: Admin dashboard: user numbers for the whole of HUB, plus one summary card from each module.
import { adminPaths } from './adminApi'
import type { AdminDashboard } from './adminApi'
import { dashboardCards } from './sections'
import type { AdminRoute } from './sections'
import { useAdminData } from './useAdminData'

export function DashboardPage({ go }: { go: (route: AdminRoute) => void }) {
  const { data, error } = useAdminData<AdminDashboard>(adminPaths.dashboard)

  return (
    <div className="adm-stack">
      {error && <p className="adm-alert error" role="alert">{error}</p>}
      <section className="hub-card adm-panel" aria-label="Users">
        <div className="adm-panel-head">
          <h2>Users</h2>
          <button type="button" className="hub-button secondary small" onClick={() => go({ section: 'users', id: null })}>Manage users</button>
        </div>
        {!data ? <p className="adm-muted">Loading…</p> : (
          <>
            <div className="adm-stats">
              <Stat label="All users" value={data.totalUsers} />
              <Stat label="Active" value={data.activeUsers} tone="success" />
              <Stat label="Blocked" value={data.blockedUsers} tone={data.blockedUsers > 0 ? 'error' : undefined} />
              <Stat label="New in the last 7 days" value={data.newUsersLast7Days} tone="info" />
            </div>
            <h3>Active users by role</h3>
            <ul className="adm-roles">
              {data.roles.map((role) => (
                <li key={role.role}>
                  <span>{role.role}</span>
                  <span className="adm-bar" aria-hidden="true">
                    <span style={{ width: `${data.activeUsers ? Math.max(2, (role.count / data.activeUsers) * 100) : 0}%` }} />
                  </span>
                  <strong>{role.count}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {dashboardCards.map((card) => <div key={card.id}>{card.render({ go })}</div>)}
    </div>
  )
}

export function Stat({ label, value, tone, onClick }: { label: string; value: number; tone?: 'success' | 'warning' | 'error' | 'info'; onClick?: () => void }) {
  const body = (
    <>
      <span className="adm-stat-value">{value.toLocaleString('en-PK')}</span>
      <span className="adm-stat-label">{label}</span>
    </>
  )
  const className = `adm-stat${tone ? ' ' + tone : ''}`
  return onClick
    ? <button type="button" className={className + ' link'} onClick={onClick}>{body}</button>
    : <div className={className}>{body}</div>
}
