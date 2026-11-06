// File purpose: E-Commerce catalog API calls and response types (matches docs/ECOMMERCE_CATALOG.md in hub-backend).
import { getJson } from '../../shared/api/client'

export type Category = {
  id: string
  name: string
  slug: string
  parentId: string | null
  children: Category[]
}

export type ProductSummary = {
  id: string
  name: string
  price: number
  salePrice: number | null
  currency: string
  inStock: boolean
  imageUrl: string | null
  categoryId: string
  merchantName: string
}

export type ProductPage = {
  total: number
  page: number
  pageSize: number
  items: ProductSummary[]
}

export type ProductDetails = {
  id: string
  name: string
  description: string
  price: number
  salePrice: number | null
  currency: string
  inStock: boolean
  stockQuantity: number | null
  imageUrls: string[]
  category: { id: string; name: string; parentId: string | null }
  merchant: { id: string; name: string }
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc'

export type ProductQuery = {
  categoryId?: string | null
  search?: string
  sort?: ProductSort
  page?: number
  pageSize?: number
}

// Two-level category tree for the store home.
export function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return getJson<Category[]>('/api/marketplace/categories', signal)
}

// One page of visible products, filtered by category/search and sorted.
export function fetchProducts(query: ProductQuery, signal?: AbortSignal): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.search?.trim()) params.set('search', query.search.trim())
  params.set('sort', query.sort ?? 'newest')
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', String(query.pageSize ?? 12))
  return getJson<ProductPage>(`/api/marketplace/products?${params.toString()}`, signal)
}

// Full product page.
export function fetchProduct(id: string, signal?: AbortSignal): Promise<ProductDetails> {
  return getJson<ProductDetails>(`/api/marketplace/products/${encodeURIComponent(id)}`, signal)
}

// Format a PKR amount for display, e.g. "Rs 49,999".
export function formatPrice(amount: number, currency: string): string {
  const prefix = currency === 'PKR' ? 'Rs ' : currency + ' '
  return prefix + amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })
}
