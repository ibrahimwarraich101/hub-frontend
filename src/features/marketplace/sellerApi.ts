// File purpose: Seller account and admin review API types (matches docs/ECOMMERCE_SELLER_ACCOUNTS.md in hub-backend).
export type SellerStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended'

export type SellerAccount = {
  id: string
  name: string
  description: string | null
  phone: string
  status: SellerStatus
  submittedAt: string
  reviewedAt: string | null
  reviewReason: string | null
  version: number
}

export type AdminSeller = {
  account: SellerAccount
  owner: { id: string; fullName: string; email: string; phone: string }
  reviewedBy: string | null
}

export type AdminSellerPage = { total: number; page: number; pageSize: number; items: AdminSeller[] }

export type SellerDecision = 'Approve' | 'Reject' | 'Suspend' | 'Reinstate'

// Which decisions an administrator may take for each status.
export const decisionsFor: Record<SellerStatus, SellerDecision[]> = {
  Pending: ['Approve', 'Reject'],
  Approved: ['Suspend'],
  Suspended: ['Reinstate'],
  Rejected: [],
}

export const sellerPaths = {
  mine: '/api/marketplace/seller-account',
  queue: (status: SellerStatus, page: number) => `/api/admin/marketplace/sellers?status=${status}&page=${page}&pageSize=20`,
  review: (id: string) => `/api/admin/marketplace/sellers/${encodeURIComponent(id)}/review`,
}

// Short local date for lists, e.g. "6 Nov 2026".
export function shortDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}
