import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'

export interface ProfileHorizon {
  horizon: string | null
  depth: string | null
  description: string
}

export interface SoilUnit {
  symbol: string
  slug: string
  series: string
  type_name: string
  texture: string | null
  phase: string | null
  soil_material: string | null
  parent_material: string | null
  bedrock: string | null
  drainage: string | null
  topography: string | null
  stoniness: string | null
  surface_reaction: string | null
  soil_depth: string | null
  surface_soil_description: string | null
  subsoil_description: string | null
  profile: ProfileHorizon[]
  historical_crop_group: string | null
  /** Per-crop adaptability ratings from report Tables 8–12 (G, G-F, F, F-P, P). */
  historical_crop_ratings: Record<string, string> | null
  historical_crops: string[]
  limitations: string[]
  primary_limitation: string | null
  management_recommendations: string[]
  acreage: number | null
  report_pages: { start: number; end: number } | null
  original_description: string | null
  interpretation: string | null
  historical_wording: string | null
  /** Where the report text and the map legend disagree. */
  data_notes: string[]
}

export interface SoilUnitsFile {
  source: Record<string, unknown>
  units: Record<string, SoilUnit>
}

export type SoilFeature = Feature<Polygon | MultiPolygon, { id: number; symbol: string; area_ha: number }>
export type SoilCollection = FeatureCollection<Polygon | MultiPolygon, SoilFeature['properties']>

/**
 * Display palette for 1948 soil units. Hues follow the original printed map
 * legend (sampled from the scan), adjusted for legibility on a modern basemap.
 */
export const SOIL_COLOURS: Record<string, string> = {
  Fl: '#f2b8a8',
  'Fl-i': '#e39c8c',
  Acl: '#a9b84e',
  Al: '#c7d273',
  'Ac-i': '#8a9a3f',
  Asl: '#d6d23a',
  Gc: '#8fb0a4',
  Hc: '#e07f8a',
  Dl: '#a8685c',
  Wc: '#b7a6c4',
  Sc: '#e9b49a',
  SBc: '#86bdd2',
  SBcl: '#b2d8e4',
  Ec: '#c97f8c',
  Ecl: '#dca2ab',
  'Ec-s': '#a85d6c',
  Bs: '#f2cc2e',
  Bg: '#dfae1c',
  Pfs: '#f0982e',
  Tsl: '#a6a442',
  Gs: '#d9cfa8',
  Psl: '#d9a24e',
  Ps: '#e9c27f',
  Es: '#f7ec7a',
  M: '#7d6f5d',
  Ma: '#9d9a78',
  'B.L.': '#f08f9a',
  R: '#e8743b',
}

let unitsPromise: Promise<SoilUnitsFile> | null = null
export function loadSoilUnits(): Promise<SoilUnitsFile> {
  unitsPromise ??= import('../data/soil-units.json').then((m) => m.default as unknown as SoilUnitsFile)
  return unitsPromise
}

let polygonsPromise: Promise<SoilCollection> | null = null
export function loadSoilPolygons(): Promise<SoilCollection> {
  polygonsPromise ??= fetch('/data/soil-1948.geojson').then((r) => {
    if (!r.ok) throw new Error(`Failed to load soil polygons (${r.status})`)
    return r.json()
  })
  return polygonsPromise
}

function ringContains(ring: Position[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function polygonContains(rings: Position[][], x: number, y: number): boolean {
  if (!ringContains(rings[0], x, y)) return false
  for (let k = 1; k < rings.length; k++) if (ringContains(rings[k], x, y)) return false
  return true
}

/** Point-in-polygon lookup against the full 1948 polygon set (works even when the layer is hidden). */
export function findSoilAt(fc: SoilCollection, lng: number, lat: number): SoilFeature | null {
  for (const f of fc.features) {
    const g = f.geometry
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    if (polys.some((p) => polygonContains(p, lng, lat))) return f as SoilFeature
  }
  return null
}

export const NOT_CLASSIFIED = 'UNK'
