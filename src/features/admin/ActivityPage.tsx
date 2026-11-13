// File purpose: Admin "Activity log": every important admin action (who, what, to whom, when and why), newest first.
import { useState } from 'react'
import { actionLabel, adminPaths, dateTime } from './adminApi'
import type { AdminActivityPage, AdminUserDetails } from './adminApi'
import { Pager } from './Pager'
import type { AdminRoute } from './sections'
import { useAdminData } from './useAdminData'

// `userId` (from the address) limits the log to one user, e.g. when opened from a user's page.
export function ActivityPage({ userId, go }: { userId: string | null; go: (route: AdminRoute) => void }) {
  const [filters, setFilters] = useState({ action: '', page: 1 })
  const actions = useAdminData<string[]>(adminPaths.activityActions)
  const person = useAdminData<AdminUserDetails>(userId ? adminPaths.user(userId) : null)
  const { data, error, loading } = useAdminData<AdminActivityPage>(adminPaths.activity({ ...filters, userId: userId ?? undefined }))

  return (
    <div className="adm-stack">
      <div className="hub-card adm-panel">
        <div className="adm-filters">
          <select value={filters.action} onChange={(event) => setFilters({ action: event.target.value, page: 1 })} aria-label="Action">
            <option value="">All actions</option>
            {(actions.data ?? []).map((action) => <option key={action} value={action}>{actionLabel(action)}</option>)}
          </select>
          {userId && (
            <span className="adm-chip">
              Only {person.data?.user.fullName ?? 'one user'}
              <button type="button" className="hub-button secondary small" onClick={() => go({ section: 'activity', id: null })}>Show everyone</button>
            </span>
          )}
        </div>
      </div>

      {error && <p className="adm-alert error" role="alert">{error}</p>}
      <div className="hub-card adm-panel">
        <p className="adm-muted">{data ? `${data.total} entr${data.total === 1 ? 'y' : 'ies'}` : 'Loading…'}{loading && data ? ' · updating…' : ''}</p>
        {data && data.items.length === 0 && <p className="adm-empty">Nothing recorded yet.</p>}
        {data && data.items.length > 0 && (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>When</th><th>Action</th><th>By</th><th>About</th><th>Reason</th></tr></thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="adm-nowrap">{dateTime(item.occurredAt)}</td>
                    <td><span className="hub-pill muted">{actionLabel(item.action)}</span></td>
                    <td>
                      <button type="button" className="adm-link" onClick={() => go({ section: 'users', id: item.actor.id })}>{item.actor.fullName}</button>
                    </td>
                    <td>
                      {item.target
                        ? <button type="button" className="adm-link" onClick={() => go({ section: 'users', id: item.target!.id })}>{item.target.fullName}</button>
                        : <span className="adm-muted">{describe(item.details)}</span>}
                    </td>
                    <td>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={filters.page} total={data.total} pageSize={data.pageSize} onPage={(page) => setFilters({ ...filters, page })} />}
      </div>
    </div>
  )
}

// Entries without a user (e.g. a category change) show the name from their details, if any.
function describe(details: string): string {
  try {
    const parsed = JSON.parse(details) as { name?: unknown }
    return typeof parsed.name === 'string' ? parsed.name : '—'
  } catch {
    return '—'
  }
}
