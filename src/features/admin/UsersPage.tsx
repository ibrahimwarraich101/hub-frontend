// File purpose: Admin "Users": search and filter all HUB accounts, open one, and block or unblock it with a reason.
import { useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { actionLabel, adminPaths, dateTime } from './adminApi'
import type { AdminUserDetails, AdminUserPage } from './adminApi'
import { Pager } from './Pager'
import { ReasonAction } from './ReasonAction'
import type { AdminRoute } from './sections'
import { useAdminData } from './useAdminData'

export function UsersPage({ userId, go }: { userId: string | null; go: (route: AdminRoute) => void }) {
  return userId ? <UserDetailsView userId={userId} go={go} /> : <UserList go={go} />
}

function UserList({ go }: { go: (route: AdminRoute) => void }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ search: '', role: '', status: '', page: 1 })
  const roles = useAdminData<string[]>(adminPaths.roles)
  const { data, error, loading } = useAdminData<AdminUserPage>(adminPaths.users(filters))

  return (
    <div className="adm-stack">
      <div className="hub-card adm-panel">
        <form className="adm-filters" role="search" onSubmit={(event) => { event.preventDefault(); setFilters({ ...filters, search: search.trim(), page: 1 }) }}>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100}
            placeholder="Search name, email or phone" aria-label="Search users" />
          <select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value, page: 1 })} aria-label="Role">
            <option value="">All roles</option>
            {(roles.data ?? []).map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })} aria-label="Status">
            <option value="">Active and blocked</option>
            <option value="active">Active only</option>
            <option value="blocked">Blocked only</option>
          </select>
          <button type="submit" className="hub-button small">Search</button>
        </form>
      </div>

      {error && <p className="adm-alert error" role="alert">{error}</p>}
      <div className="hub-card adm-panel">
        <p className="adm-muted">{data ? `${data.total} user${data.total === 1 ? '' : 's'}` : 'Loading…'}{loading && data ? ' · updating…' : ''}</p>
        {data && data.items.length === 0 && <p className="adm-empty">No users match these filters.</p>}
        {data && data.items.length > 0 && (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Roles</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id} className="adm-row-link" onClick={() => go({ section: 'users', id: user.id })}>
                    <td><button type="button" className="adm-link" onClick={(event) => { event.stopPropagation(); go({ section: 'users', id: user.id }) }}>{user.fullName}</button></td>
                    <td>{user.email}</td>
                    <td>{user.phone}</td>
                    <td>{user.roles.join(', ')}</td>
                    <td><span className={`hub-pill ${user.isActive ? 'success' : 'error'}`}>{user.isActive ? 'Active' : 'Blocked'}</span></td>
                    <td>{new Date(user.createdAt).toLocaleDateString('en-PK')}</td>
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

function UserDetailsView({ userId, go }: { userId: string; go: (route: AdminRoute) => void }) {
  const { authFetch, user: me } = useAuth()
  const { data, error, replace } = useAdminData<AdminUserDetails>(adminPaths.user(userId))
  const [notice, setNotice] = useState<string | null>(null)

  const act = async (block: boolean, reason: string) => {
    const saved = await authFetch<AdminUserDetails>(block ? adminPaths.block(userId) : adminPaths.unblock(userId), 'POST', { reason })
    replace(saved)
    setNotice(block ? 'The account is blocked and logged out on every device.' : 'The account is unblocked. The user can log in again.')
  }

  return (
    <div className="adm-stack">
      <button type="button" className="adm-back" onClick={() => go({ section: 'users', id: null })}>← All users</button>
      {error && <p className="adm-alert error" role="alert">{error}</p>}
      {!data && !error && <p className="adm-muted">Loading…</p>}
      {data && (
        <>
          <section className="hub-card adm-panel">
            <div className="adm-panel-head">
              <div>
                <h2>{data.user.fullName}</h2>
                <span className={`hub-pill ${data.user.isActive ? 'success' : 'error'}`}>{data.user.isActive ? 'Active' : 'Blocked'}</span>
              </div>
            </div>
            <dl className="adm-facts">
              <dt>Email</dt><dd>{data.user.email}</dd>
              <dt>Phone</dt><dd>{data.user.phone}</dd>
              <dt>Roles</dt><dd>{data.user.roles.join(', ') || '—'}</dd>
              <dt>Joined</dt><dd>{dateTime(data.user.createdAt)}</dd>
              <dt>Logged in on</dt><dd>{data.activeSessions} device{data.activeSessions === 1 ? '' : 's'}</dd>
              {data.businesses.map((business) => (
                <FactPair key={business.id} label={business.kind} value={`${business.name} (${business.status})`} />
              ))}
            </dl>
            {notice && <p className="adm-alert success" role="status">{notice}</p>}
            {data.user.id === me?.id ? (
              <p className="adm-muted">This is your own account. Another administrator must block or unblock it.</p>
            ) : data.user.isActive ? (
              <ReasonAction label="Block account" tone="danger" onConfirm={(reason) => act(true, reason)}
                explanation="The user is logged out on every device straight away and cannot log in until an administrator unblocks the account." />
            ) : (
              <ReasonAction label="Unblock account" onConfirm={(reason) => act(false, reason)}
                explanation="The user will be able to log in again." />
            )}
          </section>

          <section className="hub-card adm-panel">
            <div className="adm-panel-head">
              <h2>Recent activity</h2>
              <button type="button" className="hub-button secondary small" onClick={() => go({ section: 'activity', id: userId })}>See all</button>
            </div>
            {data.recentActivity.length === 0 ? <p className="adm-empty">Nothing yet.</p> : (
              <ul className="adm-timeline">
                {data.recentActivity.map((item) => (
                  <li key={item.id}>
                    <strong>{actionLabel(item.action)}</strong> by {item.actor.fullName}
                    <span className="adm-muted"> · {dateTime(item.occurredAt)}</span>
                    <p>{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function FactPair({ label, value }: { label: string; value: string }) {
  return <><dt>{label}</dt><dd>{value}</dd></>
}
