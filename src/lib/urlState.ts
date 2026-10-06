export type Basemap = 'streets' | 'satellite'

export interface MapUrlState {
  lat: number
  lng: number
  zoom: number
  layers: string[]
  opacity: Record<string, number>
  basemap: Basemap
  selected: { lat: number; lng: number } | null
  /** A selected clickable feature, e.g. a vendor: `feat=vendors:brackens`. */
  feature: { layerId: string; id: string } | null
}

export const DEFAULT_STATE: MapUrlState = {
  lat: 43.985,
  lng: -77.2,
  zoom: 10.2,
  layers: ['vendors', 'soil1948'],
  opacity: {},
  basemap: 'streets',
  selected: null,
  feature: null,
}

const num = (v: string | null, min: number, max: number): number | null => {
  if (v === null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

export function parseUrlState(search: string, knownLayers: Set<string>): MapUrlState {
  const p = new URLSearchParams(search)
  const s: MapUrlState = { ...DEFAULT_STATE, opacity: {} }
  s.lat = num(p.get('lat'), -90, 90) ?? s.lat
  s.lng = num(p.get('lng'), -180, 180) ?? s.lng
  s.zoom = num(p.get('zoom'), 0, 22) ?? s.zoom
  if (p.has('layers')) s.layers = (p.get('layers') ?? '').split(',').filter((l) => knownLayers.has(l))
  for (const pair of (p.get('op') ?? '').split(',')) {
    const [id, v] = pair.split(':')
    const n = num(v ?? null, 0, 100)
    if (id && knownLayers.has(id) && n !== null) s.opacity[id] = n / 100
  }
  if (p.get('base') === 'satellite') s.basemap = 'satellite'
  const sel = (p.get('sel') ?? '').split(',')
  const slat = num(sel[0] ?? null, -90, 90)
  const slng = num(sel[1] ?? null, -180, 180)
  if (slat !== null && slng !== null) s.selected = { lat: slat, lng: slng }
  const [fl, ...fid] = (p.get('feat') ?? '').split(':')
  if (fl && knownLayers.has(fl) && fid.length && s.selected) s.feature = { layerId: fl, id: fid.join(':') }
  return s
}

export function serializeUrlState(s: MapUrlState): string {
  const p = new URLSearchParams()
  p.set('lat', s.lat.toFixed(5))
  p.set('lng', s.lng.toFixed(5))
  p.set('zoom', s.zoom.toFixed(2))
  p.set('layers', s.layers.join(','))
  const op = Object.entries(s.opacity).map(([id, v]) => `${id}:${Math.round(v * 100)}`)
  if (op.length) p.set('op', op.join(','))
  if (s.basemap !== 'streets') p.set('base', s.basemap)
  if (s.selected) p.set('sel', `${s.selected.lat.toFixed(5)},${s.selected.lng.toFixed(5)}`)
  if (s.selected && s.feature) p.set('feat', `${s.feature.layerId}:${s.feature.id}`)
  // Keep commas and colons readable in shared links.
  return '?' + p.toString().replace(/%2C/g, ',').replace(/%3A/g, ':')
}
