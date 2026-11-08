// File purpose: The E-Commerce pages of the admin portal and its dashboard card (registered in features/admin/sections.tsx).
import type { AdminDashboardCard, AdminSection } from '../../admin/sections'
import { CategoriesPage } from './CategoriesPage'
import { ProductsPage } from './ProductsPage'
import { SellersPage } from './SellersPage'
import { StoreDashboardCard } from './StoreDashboardCard'
import './storeAdmin.css'

export const storeAdminSections: AdminSection[] = [
  { id: 'sellers', label: 'Sellers', group: 'E-Commerce', icon: 'store', render: ({ id, go }) => <SellersPage tab={id} go={go} /> },
  { id: 'categories', label: 'Categories', group: 'E-Commerce', icon: 'tag', render: () => <CategoriesPage /> },
  { id: 'products', label: 'Products', group: 'E-Commerce', icon: 'box', render: ({ id, go }) => <ProductsPage productId={id} go={go} /> },
]

export const storeDashboardCards: AdminDashboardCard[] = [
  { id: 'store', render: ({ go }) => <StoreDashboardCard go={go} /> },
]
