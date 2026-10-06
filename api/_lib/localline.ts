/**
 * Server-side client for the County Farm Collective's Local Line storefront API.
 *
 * Calls must come from here, not the browser: the API sends no CORS headers for our domain, and
 * it answers any request carrying X-Forwarded-Host (as a Vercel rewrite would add) with
 * `{"redirect_url": "https://localline.ca"}`.
 */
import { PRICE_LIST, STOREFRONT, type Product } from '../../src/lib/storefront.js'

const API = 'https://localline.ca/api/storefront/v2'
const SUBDOMAIN = 'cfc'

// Reused across requests while a function instance stays warm.
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
  // Refresh a minute before the JWT's expiry; fall back to five minutes if it can't be read.
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
  const data = (await res.json()) as T & { redirect_url?: string }
  // Local Line answers requests it can't tie to a store with a 200 and a redirect.
  if (data && typeof data === 'object' && 'redirect_url' in data) throw new Error(`Local Line ${path}: redirected`)
  return data
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

export async function vendorProducts(vendorId: number): Promise<Product[]> {
  // The products endpoint only accepts the price list's pk (its slug returns a 500).
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
