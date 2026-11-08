// File purpose: Seller product types, API paths and the product form rules (matches docs/ECOMMERCE_SELLER_PRODUCTS.md
// in hub-backend). Every mistake is found here, in our own words, before anything is sent to the server.
import type { Category } from './api'

export type SellerProductImage = { id: string; url: string }
export type SellerProductVariant = { id: string; color: string | null; size: string | null; stockQuantity: number; inStock: boolean }

export type SellerProduct = {
  id: string
  name: string
  description: string
  price: number
  salePrice: number | null
  currency: string
  categoryId: string
  stockQuantity: number | null
  active: boolean
  version: number
  createdAt: string
  updatedAt: string
  images: SellerProductImage[]
  variants: SellerProductVariant[]
  specs: { name: string; value: string }[]
}

export type SellerProductSummary = {
  id: string
  name: string
  price: number
  salePrice: number | null
  active: boolean
  totalStock: number | null
  variantCount: number
  imageUrl: string | null
  updatedAt: string
}

export type SellerProductPage = { total: number; page: number; pageSize: number; items: SellerProductSummary[] }

const base = '/api/marketplace/seller/products'
export const sellerProductPaths = {
  list: (search: string, page: number) =>
    `${base}?page=${page}&pageSize=20${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`,
  create: base,
  one: (id: string) => `${base}/${encodeURIComponent(id)}`,
  images: (id: string) => `${base}/${encodeURIComponent(id)}/images`,
  image: (id: string, imageId: string) => `${base}/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
  imageOrder: (id: string) => `${base}/${encodeURIComponent(id)}/images/order`,
}

// Limits shared with the backend.
export const limits = { maxImages: 8, maxPhotoBytes: 8 * 1024 * 1024, minPhotoSide: 200, maxVariants: 50, maxSpecs: 30, maxStock: 1_000_000, maxPrice: 10_000_000 }

// Which option buttons the product has: none, only colours, only sizes, or both.
export type OptionType = 'none' | 'color' | 'size' | 'both'
export const optionTypeLabels: Record<OptionType, string> = {
  none: 'No options', color: 'Colours', size: 'Sizes', both: 'Colours and sizes',
}
export const hasColor = (type: OptionType) => type === 'color' || type === 'both'
export const hasSize = (type: OptionType) => type === 'size' || type === 'both'

export type VariantRow = { key: number; color: string; size: string; stock: string }
export type SpecRow = { key: number; name: string; value: string }

export type ProductForm = {
  name: string
  description: string
  price: string
  salePrice: string
  categoryId: string
  stock: string
  active: boolean
  optionType: OptionType
  variants: VariantRow[]
  specs: SpecRow[]
}

// Row keys only need to be unique on this page.
let nextKey = 1
export const newKey = () => nextKey++

export function emptyForm(): ProductForm {
  return {
    name: '', description: '', price: '', salePrice: '', categoryId: '', stock: '', active: true,
    optionType: 'none', variants: [], specs: [],
  }
}

export function formFromProduct(product: SellerProduct): ProductForm {
  const anyColor = product.variants.some((v) => v.color !== null)
  const anySize = product.variants.some((v) => v.size !== null)
  return {
    name: product.name,
    description: product.description,
    price: String(product.price),
    salePrice: product.salePrice === null ? '' : String(product.salePrice),
    categoryId: product.categoryId,
    stock: product.stockQuantity === null ? '' : String(product.stockQuantity),
    active: product.active,
    optionType: product.variants.length === 0 ? 'none' : anyColor && anySize ? 'both' : anyColor ? 'color' : 'size',
    variants: product.variants.map((v) => ({ key: newKey(), color: v.color ?? '', size: v.size ?? '', stock: String(v.stockQuantity) })),
    specs: product.specs.map((s) => ({ key: newKey(), name: s.name, value: s.value })),
  }
}

// Error keys: name, description, price, salePrice, categoryId, stock, variants, specs,
// and per row: variant-<key>-color / -size / -stock, spec-<key>-name / -value.
export type ProductErrors = Record<string, string>

const moneyPattern = /^\d+(\.\d{1,2})?$/
const wholePattern = /^\d+$/

function checkStock(value: string): string | null {
  if (!value.trim()) return 'Enter how many are in stock (0 if none).'
  if (!wholePattern.test(value.trim())) return 'Use a whole number, for example 10.'
  if (Number(value) > limits.maxStock) return `Stock can be at most ${limits.maxStock.toLocaleString('en-PK')}.`
  return null
}

// Blank specification rows (both boxes empty) are ignored, so the seller does not have to delete them.
const filledSpecs = (form: ProductForm) => form.specs.filter((s) => s.name.trim() || s.value.trim())

export function validateProduct(form: ProductForm): ProductErrors {
  const errors: ProductErrors = {}
  const name = form.name.trim()
  if (!name) errors.name = 'Please enter the product name.'
  else if (name.length > 150) errors.name = `Product name can be at most 150 characters (you typed ${name.length}).`
  if (form.description.trim().length > 5000)
    errors.description = `Description can be at most 5000 characters (you typed ${form.description.trim().length}).`

  const price = form.price.trim()
  if (!price) errors.price = 'Please enter the price.'
  else if (!moneyPattern.test(price)) errors.price = 'Use numbers only, with at most 2 decimals, for example 2499 or 2499.50.'
  else if (Number(price) <= 0) errors.price = 'The price must be more than 0.'
  else if (Number(price) > limits.maxPrice) errors.price = `The price can be at most Rs ${limits.maxPrice.toLocaleString('en-PK')}.`

  const sale = form.salePrice.trim()
  if (sale) {
    if (!moneyPattern.test(sale)) errors.salePrice = 'Use numbers only, with at most 2 decimals.'
    else if (Number(sale) <= 0) errors.salePrice = 'The sale price must be more than 0, or leave it empty.'
    else if (!errors.price && Number(sale) >= Number(price)) errors.salePrice = 'The sale price must be lower than the normal price.'
  }
  if (!form.categoryId) errors.categoryId = 'Please choose a category.'

  if (form.optionType === 'none') {
    const stock = checkStock(form.stock)
    if (stock) errors.stock = stock
  } else {
    if (form.variants.length === 0) errors.variants = 'Add at least one option, or choose "No options".'
    if (form.variants.length > limits.maxVariants) errors.variants = `You can add at most ${limits.maxVariants} options.`
    const seen = new Set<string>()
    for (const row of form.variants) {
      const color = row.color.trim()
      const size = row.size.trim()
      if (hasColor(form.optionType)) {
        if (!color) errors[`variant-${row.key}-color`] = 'Enter a colour.'
        else if (color.length > 30) errors[`variant-${row.key}-color`] = 'At most 30 characters.'
      }
      if (hasSize(form.optionType)) {
        if (!size) errors[`variant-${row.key}-size`] = 'Enter a size.'
        else if (size.length > 20) errors[`variant-${row.key}-size`] = 'At most 20 characters.'
      }
      const stock = checkStock(row.stock)
      if (stock) errors[`variant-${row.key}-stock`] = stock
      const id = `${hasColor(form.optionType) ? color.toLowerCase() : ''}|${hasSize(form.optionType) ? size.toLowerCase() : ''}`
      if ((color || size) && seen.has(id)) {
        const field = hasColor(form.optionType) ? 'color' : 'size'
        errors[`variant-${row.key}-${field}`] = 'This option is already listed above.'
      }
      seen.add(id)
    }
  }

  const specs = filledSpecs(form)
  if (specs.length > limits.maxSpecs) errors.specs = `You can add at most ${limits.maxSpecs} specifications.`
  const names = new Set<string>()
  for (const row of specs) {
    const specName = row.name.trim()
    const value = row.value.trim()
    if (!specName) errors[`spec-${row.key}-name`] = 'Enter a name, for example Brand.'
    else if (specName.length > 50) errors[`spec-${row.key}-name`] = 'At most 50 characters.'
    else if (names.has(specName.toLowerCase())) errors[`spec-${row.key}-name`] = 'This name is already listed above.'
    if (!value) errors[`spec-${row.key}-value`] = 'Enter a value, for example Samsung.'
    else if (value.length > 200) errors[`spec-${row.key}-value`] = 'At most 200 characters.'
    names.add(specName.toLowerCase())
  }
  return errors
}

// Build the request body from a valid form. expectedVersion is sent only when editing.
export function productRequest(form: ProductForm, expectedVersion?: number) {
  const options = form.optionType !== 'none'
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price.trim()),
    salePrice: form.salePrice.trim() ? Number(form.salePrice.trim()) : null,
    categoryId: form.categoryId,
    stockQuantity: options ? null : Number(form.stock.trim()),
    active: form.active,
    variants: options ? form.variants.map((row) => ({
      color: hasColor(form.optionType) ? row.color.trim() : null,
      size: hasSize(form.optionType) ? row.size.trim() : null,
      stockQuantity: Number(row.stock.trim()),
    })) : [],
    specs: filledSpecs(form).map((row) => ({ name: row.name.trim(), value: row.value.trim() })),
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  }
}

// Category choices for a select box: "Electronics", "Electronics › Mobile Phones", ...
export function categoryChoices(categories: Category[]): { id: string; label: string }[] {
  return categories.flatMap((root) => [
    { id: root.id, label: root.name },
    ...root.children.map((child) => ({ id: child.id, label: `${root.name} › ${child.name}` })),
  ])
}

// Check a chosen photo in the browser before uploading it. Returns an error message or null.
export async function checkPhoto(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return `"${file.name}" is not a JPEG, PNG or WebP photo.`
  if (file.size > limits.maxPhotoBytes) return `"${file.name}" is larger than 8 MB.`
  try {
    const bitmap = await createImageBitmap(file)
    const small = bitmap.width < limits.minPhotoSide || bitmap.height < limits.minPhotoSide
    bitmap.close()
    return small ? `"${file.name}" is too small. Use a photo of at least ${limits.minPhotoSide} x ${limits.minPhotoSide} pixels.` : null
  } catch {
    return `"${file.name}" could not be opened as a photo.`
  }
}
