/** County Farm Collective storefront details shared by the browser and the api/ endpoints. */

export const STOREFRONT = 'https://cfc.localline.ca'

/** The default price list: storefront URLs use its slug, the API only accepts its pk. */
export const PRICE_LIST = { id: 5271, slug: 'resto' }

/** A product as returned by /api/vendor-products. */
export interface Product {
  /** Price-list entry id: the id in the storefront's /{price list slug}/product/{id} URL. */
  id: number
  name: string
  image: string | null
  /** Lowest package price, with the package name when there's only one. */
  price: number | null
  unit: string | null
  multiplePrices: boolean
  /** Charged by actual weight, so the price is an estimate. */
  estimated: boolean
  soldOut: boolean
  url: string
}

export const vendorUrl = (slug: string) => `${STOREFRONT}/${PRICE_LIST.slug}/vendor/${slug}`

// The info panel is mounted twice (desktop aside + mobile sheet), so share requests briefly.
const FRESH_MS = 60_000
const cache = new Map<number, { at: number; promise: Promise<Product[]> }>()

export function vendorProducts(vendorId: number): Promise<Product[]> {
  const hit = cache.get(vendorId)
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise
  const promise = fetch(`/api/vendor-products?vendor=${vendorId}`).then((r) => {
    if (!r.ok) throw new Error(`vendor-products: HTTP ${r.status}`)
    return r.json() as Promise<Product[]>
  })
  promise.catch(() => cache.delete(vendorId))
  cache.set(vendorId, { at: Date.now(), promise })
  return promise
}
