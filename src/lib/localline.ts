/**
 * Live product listings from the County Farm Collective's Local Line storefront.
 *
 * Local Line's storefront API sends no CORS headers, so requests go through a same-origin
 * proxy at /localline (vite.config.ts in dev, vercel.json in production) that forwards to
 * https://localline.ca/api/storefront/v2. Every call needs a short-lived anonymous token.
 */
const API = '/localline'
const SUBDOMAIN = 'cfc'
export const STOREFRONT = 'https://cfc.localline.ca'

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

interface Package {
  name: string
  package_price: number
  is_by_weight: boolean
  number_of_packages_available: number | null
}

interface Entry {
  id: number
  name: string
  thumbnail: string | null
  display: string | null
  track_inventory: boolean
  package_price_list_entries: Package[]
}

let token: { value: string; expires: number } | null = null

async function getToken(): Promise<string> {
  if (token && token.expires > Date.now()) return token.value
  const res = await fetch(`${API}/token/anonymous/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Subdomain: SUBDOMAIN },
    body: '{}',
  })
  if (!res.ok) throw new Error(`Local Line token: HTTP ${res.status}`)
  const { access } = (await res.json()) as { access: string }
  // Read the expiry from the JWT and refresh a minute early; fall back to five minutes.
  let expires = Date.now() + 5 * 60_000
  try {
    expires = JSON.parse(atob(access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000 - 60_000
  } catch {
    /* keep fallback */
  }
  token = { value: access, expires }
  return access
}

async function api<T>(path: string, retry = true): Promise<T> {
  const res = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${await getToken()}` } })
  if (res.status === 401 && retry) {
    token = null
    return api(path, false)
  }
  if (!res.ok) throw new Error(`Local Line ${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// The default price list. The storefront URLs use its slug, but the products endpoint only
// accepts its pk; `price-lists/default/` can't be used to look it up because Local Line answers
// it with a redirect when called through the proxy.
export const PRICE_LIST = { id: 5271, slug: 'resto' }

// The info panel is mounted twice (desktop aside + mobile sheet), so share requests briefly.
const FRESH_MS = 60_000
const productCache = new Map<number, { at: number; promise: Promise<Product[]> }>()

export function vendorProducts(vendorId: number): Promise<Product[]> {
  const hit = productCache.get(vendorId)
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise
  const promise = fetchVendorProducts(vendorId)
  promise.catch(() => productCache.delete(vendorId))
  productCache.set(vendorId, { at: Date.now(), promise })
  return promise
}

async function fetchVendorProducts(vendorId: number): Promise<Product[]> {
  const data = await api<{ results: Entry[] }>(`price-lists/${PRICE_LIST.id}/products/?vendors=${vendorId}&page_size=100`)
  return data.results.map((e) => {
    const packs = [...e.package_price_list_entries].sort((a, b) => a.package_price - b.package_price)
    const cheapest = packs[0]
    return {
      id: e.id,
      name: e.name,
      image: e.display ?? e.thumbnail,
      price: cheapest?.package_price ?? null,
      unit: packs.length === 1 ? cheapest.name : null,
      multiplePrices: packs.length > 1,
      estimated: !!cheapest?.is_by_weight,
      soldOut: e.track_inventory && packs.every((p) => (p.number_of_packages_available ?? 0) <= 0),
      url: `${STOREFRONT}/${PRICE_LIST.slug}/product/${e.id}`,
    }
  })
}
