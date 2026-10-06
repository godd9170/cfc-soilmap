export interface GeocodeResult {
  label: string
  lat: number
  lng: number
  zoom: number
}

// Prince Edward County plus the shoreline around it.
const VIEWBOX = '-77.75,44.25,-76.70,43.78'

const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

/**
 * Geocode with OpenStreetMap Nominatim, limited to the county. Nominatim's usage
 * policy forbids autocomplete, so this only runs when the user submits a search.
 * Plain "lat, lng" input is handled locally.
 */
export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const m = query.match(COORDS)
  if (m) {
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [{ label: `${lat}, ${lng}`, lat, lng, zoom: 15 }]
  }
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'ca',
    viewbox: VIEWBOX,
    bounded: '1',
    addressdetails: '0',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string; addresstype?: string; type?: string }[]
  return rows.map((r) => {
    const kind = r.addresstype ?? r.type ?? ''
    const zoom = ['town', 'village', 'city', 'hamlet'].includes(kind) ? 13 : ['road'].includes(kind) ? 14 : 16
    return {
      label: r.display_name.replace(/, (Ontario|Canada)/g, ''),
      lat: Number(r.lat),
      lng: Number(r.lon),
      zoom,
    }
  })
}
