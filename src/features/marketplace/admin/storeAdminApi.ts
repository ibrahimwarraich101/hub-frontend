// File purpose: E-Commerce admin API types and paths (matches docs/ECOMMERCE_ADMIN.md in hub-backend).
import type { SellerProduct } from '../sellerProductsApi'

export type StoreSummary = {
  sellersPending: number
  sellersApproved: number
  sellersRejected: number
  sellersSuspended: number
  productsInStore: number
  productsHiddenBySeller: number
  productsHiddenByAdmin: number
  productsTotal: number
  categories: number
  categoriesHidden: number
}

export type AdminCategory = {
  id: string
  parentId: string | null
  name: string
  slug: string
  sortOrder: number
  active: boolean
  productCount: number
  children: AdminCategory[]
}

export type AdminProductSummary = {
  id: string
  name: string
  price: number
  salePrice: number | null
  imageUrl: string | null
  merchantId: string
  merchantName: string
  merchantStatus: string
  categoryId: string
  categoryName: string
  status: string
  active: boolean
  adminHidden: boolean
  totalStock: number | null
  updatedAt: string
}

export type AdminProductPage = { total: number; page: number; pageSize: number; items: AdminProductSummary[] }

export type AdminProductDetails = {
  product: SellerProduct & { adminHidden: boolean; adminHiddenReason: string | null }
  summary: AdminProductSummary
  adminHiddenAt: string | null
  adminHiddenByName: string | null
}

export const productStatusFilters = [
  { value: '', label: 'All products' },
  { value: 'in-store', label: 'In store' },
  { value: 'not-visible', label: 'Not visible to customers' },
  { value: 'hidden-by-seller', label: 'Hidden by seller' },
  { value: 'hidden-by-admin', label: 'Hidden by HUB' },
]

const base = '/api/admin/marketplace'
export const storeAdminPaths = {
  summary: `${base}/summary`,
  categories: `${base}/categories`,
  category: (id: string) => `${base}/categories/${encodeURIComponent(id)}`,
  categoryOrder: `${base}/categories/order`,
  products: (filters: { search?: string; status?: string; categoryId?: string; page: number }) => {
    const query = new URLSearchParams({ page: String(filters.page), pageSize: '20' })
    if (filters.search) query.set('search', filters.search)
    if (filters.status) query.set('status', filters.status)
    if (filters.categoryId) query.set('categoryId', filters.categoryId)
    return `${base}/products?${query.toString()}`
  },
  product: (id: string) => `${base}/products/${encodeURIComponent(id)}`,
  hide: (id: string) => `${base}/products/${encodeURIComponent(id)}/hide`,
  unhide: (id: string) => `${base}/products/${encodeURIComponent(id)}/unhide`,
}

// Colour of a product status pill.
export function statusTone(status: string): string {
  return status === 'In store' ? 'success' : status === 'Hidden by HUB' ? 'error' : 'warning'
}

// Same rule as the backend: category names 1-80 characters.
export function categoryNameError(name: string): string | null {
  const length = name.trim().length
  if (length === 0) return 'Please enter a category name.'
  if (length > 80) return `A category name can be at most 80 characters (you typed ${length}).`
  return null
}
