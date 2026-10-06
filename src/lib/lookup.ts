import { VectorTile } from '@mapbox/vector-tile'
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'
import { PbfReader } from 'pbf'
import { PMTiles } from 'pmtiles'

/* ---------- GeoJSON point-in-polygon ---------- */

type PolyFeature<P> = Feature<Polygon | MultiPolygon, P>

const cache = new Map<string, Promise<unknown>>()
export function loadJson<T>(url: string): Promise<T> {
  if (!cache.has(url))
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`)
        return r.json()
      }),
    )
  return cache.get(url) as Promise<T>
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

export function featureAt<P>(fc: FeatureCollection<Polygon | MultiPolygon, P>, lng: number, lat: number): PolyFeature<P> | null {
  for (const f of fc.features) {
    const g = f.geometry
    if (!g) continue
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    if (polys.some((p) => polygonContains(p, lng, lat))) return f
  }
  return null
}

/* ---------- Baked value grids (see pipeline/fetch_modern.py) ---------- */

export interface GridsMeta {
  bounds: [number, number, number, number]
  width: number
  height: number
  depth: string
  props: Record<string, { scale: number; ramp: string[]; range: [number, number]; coverage: { slgc: number; soilgrids: number } }>
}

export const loadGridsMeta = () => loadJson<GridsMeta>('/data/grids.json')

const gridData = new Map<string, Promise<ImageData>>()
function loadGridData(id: string): Promise<ImageData> {
  if (!gridData.has(id))
    gridData.set(
      id,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          // Lossless value data: disable colour management side-effects by drawing 1:1.
          const ctx = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' })!
          ctx.drawImage(img, 0, 0)
          resolve(ctx.getImageData(0, 0, img.width, img.height))
        }
        img.onerror = () => reject(new Error(`Failed to load grid ${id}`))
        img.src = `/data/grid-${id}-data.png`
      }),
    )
  return gridData.get(id)!
}

export interface GridSample {
  value: number
  source: 'AAFC Soil Landscape Grids (100 m)' | 'ISRIC SoilGrids 2.0 (250 m)'
}

export async function sampleGrid(id: string, lng: number, lat: number): Promise<GridSample | null> {
  const [meta, data] = await Promise.all([loadGridsMeta(), loadGridData(id)])
  const [w, s, e, n] = meta.bounds
  if (lng < w || lng >= e || lat <= s || lat > n) return null
  const x = Math.floor(((lng - w) / (e - w)) * meta.width)
  const y = Math.floor(((n - lat) / (n - s)) * meta.height)
  const i = (y * data.width + x) * 4
  if (data.data[i + 3] < 128) return null
  return {
    value: data.data[i] / meta.props[id].scale,
    source: data.data[i + 1] === 1 ? 'AAFC Soil Landscape Grids (100 m)' : 'ISRIC SoilGrids 2.0 (250 m)',
  }
}

/* ---------- Vector PMTiles (large polygon layers, fetched one tile at a time) ---------- */

const archives = new Map<string, PMTiles>()

/**
 * Properties of the polygon under a point in a vector PMTiles archive. Reads only the
 * single max-zoom tile containing the point, so large layers never download wholesale.
 */
export async function pmtilesFeatureAt(
  url: string,
  sourceLayer: string,
  lng: number,
  lat: number,
): Promise<Record<string, unknown> | null> {
  let archive = archives.get(url)
  if (!archive) archives.set(url, (archive = new PMTiles(url)))
  const header = await archive.getHeader()
  const z = header.maxZoom
  const n = 2 ** z
  const fx = ((lng + 180) / 360) * n
  const fy = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  const tx = Math.floor(fx)
  const ty = Math.floor(fy)
  const tile = await archive.getZxy(z, tx, ty)
  if (!tile) return null
  const layer = new VectorTile(new PbfReader(new Uint8Array(tile.data))).layers[sourceLayer]
  if (!layer) return null
  const px = (fx - tx) * layer.extent
  const py = (fy - ty) * layer.extent
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i)
    if (f.type !== 3) continue
    // Even-odd test across all rings handles holes and multipolygons alike.
    let inside = false
    for (const ring of f.loadGeometry()) {
      for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
        const p = ring[a]
        const q = ring[b]
        if (p.y > py !== q.y > py && px < ((q.x - p.x) * (py - p.y)) / (q.y - p.y) + p.x) inside = !inside
      }
    }
    if (inside) return f.properties
  }
  return null
}
