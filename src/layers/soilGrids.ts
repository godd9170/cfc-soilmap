import type { Provenance, ThematicLayer } from '../lib/layerTypes'
import { sampleGrid } from '../lib/lookup'

const GRID_PROVENANCE: Provenance = {
  publisher: 'Agriculture and Agri-Food Canada (AAFC); gaps filled from ISRIC — World Soil Information',
  dataset: 'Soil Landscape Grids of Canada, 100 m (SLGC); ISRIC SoilGrids 2.0 (250 m) where SLGC has no data',
  year: 'SLGC 2025 (flagged as under evaluation); SoilGrids 2.0 2020',
  resolution: '100 m grid (SoilGrids values resampled from 250 m)',
  methodology:
    'Digital soil mapping: machine-learning models trained on soil profile observations and environmental covariates predict properties at standard depths. Values shown are depth-weighted means over 0–30 cm (0–5, 5–15 and 15–30 cm layers). SLGC is used where available; SoilGrids fills the remaining gaps (about 40% of the county’s land).',
  url: 'https://open.canada.ca/data/en/dataset/4d39c9f9-a85c-4bf2-b920-138fdd423384',
  licence: 'SLGC: Open Government Licence – Canada. SoilGrids: CC BY 4.0.',
  limitations:
    'Statistical predictions, not measurements. A 100 m cell averages over a large area, and the models have few calibration points in Prince Edward County. Urban areas, water and some wetlands have no value.',
  nature: 'modeled',
}

/**
 * A soil property baked by pipeline/fetch_modern.py. `id` must match a key in that
 * script's PROPS; the legend gradient and range are read from grids.json at runtime.
 */
function gridLayer(id: string, title: string, units: string, description: string, fmt: (v: number) => string): ThematicLayer {
  return {
    id,
    title,
    group: 'soil',
    description,
    source: { type: 'grid', id },
    defaultOpacity: 0.75,
    attribution: 'Soil grids: AAFC SLGC, ISRIC SoilGrids',
    legend: { gradient: [], min: '', max: '', units },
    provenance: GRID_PROVENANCE,
    caveat: 'Estimated from a statistical soil model at about 100 m resolution. Not a direct field measurement.',
    query: async (lng, lat) => {
      const s = await sampleGrid(id, lng, lat)
      return s ? { value: fmt(s.value), detail: `0–30 cm average · ${s.source}` } : null
    },
  }
}

const pct = (v: number) => `${Math.round(v)}%`

export const clay = gridLayer('clay', 'Clay %', '% clay', 'Predicted clay content, 0–30 cm.', pct)
export const sand = gridLayer('sand', 'Sand %', '% sand', 'Predicted sand content, 0–30 cm.', pct)
export const silt = gridLayer('silt', 'Silt %', '% silt', 'Predicted silt content, 0–30 cm.', pct)
export const soc = gridLayer(
  'soc',
  'Organic carbon',
  '% organic carbon',
  'Predicted soil organic carbon, 0–30 cm. Not equivalent to a recent soil test.',
  (v) => `${v.toFixed(1)}%`,
)
