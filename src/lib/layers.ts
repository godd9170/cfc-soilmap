import { LAYERS } from '../layers'
import { DEPTH_CLASSES } from './interpret'
import { matchExpr, type Expression } from './layerTypes'
import { loadGridsMeta } from './lookup'
import { SOIL_COLOURS } from './soil'

export { LAYERS, SOIL_1948_PROVENANCE } from '../layers'
export * from './layerTypes'

export const LAYER_IDS = new Set(LAYERS.map((l) => l.id))
export const layerById = (id: string) => LAYERS.find((l) => l.id === id)

export const soilFillExpression = (): Expression => matchExpr('symbol', Object.entries(SOIL_COLOURS))
export const soilDepthExpression = (): Expression =>
  matchExpr(
    'symbol',
    DEPTH_CLASSES.flatMap((c) => c.symbols.map((s) => [s, c.colour] as [string, string])),
  )

/** Fill in gradient legends for grid layers from the baked grid metadata. */
export async function hydrateGridLegends(): Promise<void> {
  const meta = await loadGridsMeta()
  for (const l of LAYERS) {
    if (l.source.type !== 'grid' || !l.legend || Array.isArray(l.legend)) continue
    const p = meta.props[l.source.id]
    if (p) l.legend = { ...l.legend, gradient: p.ramp, min: String(p.range[0]), max: `${p.range[1]}+` }
  }
}
