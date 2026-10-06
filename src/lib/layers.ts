import {
  CLI_CLASS,
  DEPTH_CLASSES,
  GEOLOGY,
  depthClassFor,
  describeCli,
  type CliComponent,
} from './interpret'
import { featureAt, loadGridsMeta, loadJson, sampleGrid } from './lookup'
import { SOIL_COLOURS, findSoilAt, loadSoilPolygons } from './soil'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export type LayerGroup = 'Historical' | 'Soil properties' | 'Land'

export interface LegendItem {
  colour: string
  label: string
}

export interface Provenance {
  publisher: string
  dataset: string
  year: string
  resolution: string
  methodology: string
  url: string
  licence: string
  limitations: string
  /** Observed historical mapping vs. modern modeled prediction (PRD §26). */
  nature: 'observed' | 'modeled' | 'compiled'
}

export interface QueryValue {
  value: string
  detail?: string
  raw?: string
}

export interface ThematicLayer {
  id: string
  title: string
  group: LayerGroup
  description: string
  /**
   * soil-vector: the 1948 polygons; soil-depth: the same polygons styled by depth class;
   * pmtiles-raster: tiled raster; grid: baked value grid shown as an image; vector: GeoJSON polygons.
   */
  kind: 'soil-vector' | 'soil-depth' | 'pmtiles-raster' | 'grid' | 'vector'
  pmtilesUrl?: string
  maxzoom?: number
  /** For kind 'vector': GeoJSON URL and fill-color expression. */
  geojsonUrl?: string
  fillColour?: unknown[]
  defaultOpacity: number
  /** Short credit shown in the map's attribution control. */
  attribution: string
  legend: LegendItem[] | { gradient: string[]; min: string; max: string; units: string }
  provenance: Provenance
  /** Value at a point, for the location panel and comparison table. */
  query?: (lng: number, lat: number) => Promise<QueryValue | null>
  /** Shown beside values in the info panel. */
  caveat: string
}

export const SOIL_1948_PROVENANCE: Provenance = {
  publisher: 'Ontario Soil Survey (Experimental Farms Service & Ontario Agricultural College); digitized by AAFC CanSIS',
  dataset: 'Soil Survey of Prince Edward County, Report No. 10 (N. R. Richards & F. F. Morwick); NSDB detailed soil survey ond170',
  year: 'Field survey 1943; published 1948; digitized 2000',
  resolution: '1:63,360 (1 inch = 1 mile)',
  methodology:
    'Field soil survey mapped by hand on 1:63,360 base maps. Polygons digitized by Agriculture and Agri-Food Canada. The CanSIS file places the county 6° west of its true position (a UTM zone 17/18 error); PEC Soil Explorer corrects this and converts NAD27 to WGS84.',
  url: 'https://sis.agr.gc.ca/cansis/publications/surveys/on/on10/index.html',
  licence: 'Government of Canada — may be copied and reused provided it is accurately reproduced and the source is credited.',
  limitations:
    'Boundaries were interpreted in the field in 1943 at 1 inch to the mile. Real soil transitions are often gradual, and small inclusions of other soils are not shown.',
  nature: 'observed',
}

const matchExpr = (prop: string, pairs: [string, string][], fallback = 'rgba(0,0,0,0)'): unknown[] => [
  'match',
  ['to-string', ['get', prop]],
  ...pairs.flat(),
  fallback,
]

export const soilFillExpression = (): unknown[] => matchExpr('symbol', Object.entries(SOIL_COLOURS))
export const soilDepthExpression = (): unknown[] =>
  matchExpr(
    'symbol',
    DEPTH_CLASSES.flatMap((c) => c.symbols.map((s) => [s, c.colour] as [string, string])),
  )

/* ---------- Modeled soil property grids ---------- */

/** Must match BBOX in pipeline/fetch_modern.py. */
export const GRID_BOUNDS = [-77.62, 43.8, -76.8, 44.2] as const

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

function gridLayer(id: string, title: string, units: string, description: string, fmt: (v: number) => string): ThematicLayer {
  return {
    id,
    title,
    group: 'Soil properties',
    description,
    kind: 'grid',
    defaultOpacity: 0.75,
    attribution: 'Soil grids: AAFC SLGC, ISRIC SoilGrids',
    legend: { gradient: [], min: '', max: '', units }, // filled from grids.json at runtime
    provenance: GRID_PROVENANCE,
    caveat: 'Estimated from a statistical soil model at about 100 m resolution. Not a direct field measurement.',
    query: async (lng, lat) => {
      const s = await sampleGrid(id, lng, lat)
      return s ? { value: fmt(s.value), detail: `0–30 cm average · ${s.source}` } : null
    },
  }
}

/* ---------- Registry ---------- */

type CliFC = FeatureCollection<Polygon | MultiPolygon, { major: string; components: string | CliComponent[] }>
type GeoFC = FeatureCollection<Polygon | MultiPolygon, { unit: string; deposit: string; material: string; description: string }>

export const LAYERS: ThematicLayer[] = [
  {
    id: 'soil1948',
    title: '1948 Soil Survey',
    group: 'Historical',
    description: 'Soil series and types mapped by the 1948 survey, as digital polygons.',
    kind: 'soil-vector',
    defaultOpacity: 0.65,
    attribution: '1948 Soil Survey of PEC (AAFC CanSIS)',
    legend: [], // built from soil units at runtime
    provenance: SOIL_1948_PROVENANCE,
    caveat: 'Boundary interpreted from a historical soil survey. Actual soil transitions may occur gradually.',
  },
  {
    id: 'scan1948',
    title: 'Original 1948 Map',
    group: 'Historical',
    description: 'The printed 1948 soil map, georeferenced onto the modern map.',
    kind: 'pmtiles-raster',
    pmtilesUrl: '/data/soil-1948-scan.pmtiles',
    maxzoom: 14,
    defaultOpacity: 0.7,
    attribution: '1948 soil map scan (AAFC CanSIS)',
    legend: [],
    provenance: {
      ...SOIL_1948_PROVENANCE,
      dataset: 'Soil Map of Prince Edward County, Ontario (Soil Survey Report No. 10), scanned by AAFC CanSIS',
      methodology:
        'Scan georeferenced by fitting a second-order polynomial that aligns the printed boundaries with the digitized polygons (median misfit ≈ 20 m). The printed latitude graticule is offset roughly 5′ from true positions and was not used directly.',
      url: 'https://sis.agr.gc.ca/cansis/publications/surveys/on/on10/on10_map.jpg',
    },
    caveat: 'Historical printed map; registration to modern geography is approximate (tens of metres).',
  },
  {
    id: 'depth1948',
    title: 'Soil depth over bedrock',
    group: 'Soil properties',
    description:
      'Depth classes from the 1948 survey’s soil descriptions. No defensible modeled depth-to-bedrock grid is available for the County yet.',
    kind: 'soil-depth',
    defaultOpacity: 0.7,
    attribution: '1948 Soil Survey of PEC (AAFC CanSIS)',
    legend: DEPTH_CLASSES.map((c) => ({ colour: c.colour, label: c.label })),
    provenance: {
      ...SOIL_1948_PROVENANCE,
      dataset: 'Depth classes derived from the 1948 Soil Survey of Prince Edward County',
      methodology:
        'Each 1948 soil type is assigned the depth to bedrock its report description gives (e.g. Farmington: less than one foot; Ameliasburg, Hillier, Gerow, Athol: one to three feet). No modeling is involved.',
      limitations:
        'Depth classes describe the typical soil in each mapped area; depth varies within every polygon and bedrock can be closer to the surface than the class suggests. Modeled bedrock-depth grids that cover Ontario (e.g. SoilGrids 2017) predict implausibly deep values here and are not shown.',
      nature: 'compiled',
    },
    caveat: 'Typical depth for the mapped 1948 soil type; depth varies within every area.',
    query: async (lng, lat) => {
      const f = findSoilAt(await loadSoilPolygons(), lng, lat)
      const c = f && depthClassFor(f.properties.symbol)
      return c ? { value: c.label, detail: `From the 1948 description of soil ${f.properties.symbol}` } : null
    },
  },
  gridLayer('clay', 'Clay %', '% clay', 'Predicted clay content, 0–30 cm.', (v) => `${Math.round(v)}%`),
  gridLayer('sand', 'Sand %', '% sand', 'Predicted sand content, 0–30 cm.', (v) => `${Math.round(v)}%`),
  gridLayer('silt', 'Silt %', '% silt', 'Predicted silt content, 0–30 cm.', (v) => `${Math.round(v)}%`),
  gridLayer(
    'soc',
    'Organic carbon',
    '% organic carbon',
    'Predicted soil organic carbon, 0–30 cm. Not equivalent to a recent soil test.',
    (v) => `${v.toFixed(1)}%`,
  ),
  {
    id: 'cli',
    title: 'Agricultural capability (CLI)',
    group: 'Land',
    description: 'Canada Land Inventory soil capability for agriculture, 1:250,000.',
    kind: 'vector',
    geojsonUrl: '/data/cli.geojson',
    fillColour: matchExpr(
      'major',
      Object.entries(CLI_CLASS).map(([k, v]) => [k, v.colour] as [string, string]),
    ),
    defaultOpacity: 0.6,
    attribution: 'CLI: AAFC',
    legend: ['1', '2', '3', '4', '5', '6', '7', '8'].map((k) => ({ colour: CLI_CLASS[k].colour, label: `${CLI_CLASS[k].label} — ${CLI_CLASS[k].plain.split(';')[0]}` })),
    provenance: {
      publisher: 'Agriculture and Agri-Food Canada (Canada Land Inventory)',
      dataset: 'Canada Land Inventory — Soil Capability for Agriculture, 1:250,000',
      year: 'Mapping 1960s–1970s; open data release 2013',
      resolution: '1:250,000',
      methodology:
        'Expert interpretation of soil survey information into seven capability classes for common field crops, with subclasses naming the main limitation. Polygons may contain up to six components with percentages.',
      url: 'https://open.canada.ca/data/en/dataset/abf04733-8225-4d3c-83fa-9a5b60d43f2e',
      licence: 'Open Government Licence – Canada',
      limitations:
        'Very generalized (1:250,000); one polygon can cover several square kilometres and mixes soils. Ratings reflect mid-20th-century field-crop practices.',
      nature: 'compiled',
    },
    caveat: 'Generalized 1:250,000 rating; a single polygon spans many fields.',
    query: async (lng, lat) => {
      const f = featureAt(await loadJson<CliFC>('/data/cli.geojson'), lng, lat)
      if (!f) return null
      const c = f.properties.components
      return describeCli(typeof c === 'string' ? (JSON.parse(c) as CliComponent[]) : c)
    },
  },
  {
    id: 'geology',
    title: 'Surficial geology',
    group: 'Land',
    description: 'Ontario Geological Survey surficial geology: the material the soil formed in.',
    kind: 'vector',
    geojsonUrl: '/data/geology.geojson',
    fillColour: matchExpr(
      'unit',
      Object.entries(GEOLOGY).map(([k, v]) => [k, v.colour] as [string, string]),
    ),
    defaultOpacity: 0.6,
    attribution: 'Surficial geology: Ontario Geological Survey',
    legend: ['3', '5b', '8a', '9c', '6a', '7b', '14b', '17', '19', '20'].map((k) => ({ colour: GEOLOGY[k].colour, label: GEOLOGY[k].plain })),
    provenance: {
      publisher: 'Ontario Geological Survey',
      dataset: 'Surficial Geology of Southern Ontario (MRD128-REV, revision of EDS 014)',
      year: '2010',
      resolution: '1:50,000',
      methodology: 'Compilation of field mapping, air-photo interpretation and borehole records into surficial geological units.',
      url: 'https://www.geologyontario.mines.gov.on.ca/persistent-linking?publication=MRD128-REV',
      licence: 'Open Government Licence – Ontario (to be confirmed on the OGS record)',
      limitations: 'Boundaries are interpretive at 1:50,000. Thin drift over bedrock may be mapped as either unit.',
      nature: 'compiled',
    },
    caveat: 'Interpretive 1:50,000 mapping of the geological material beneath the soil.',
    query: async (lng, lat) => {
      const f = featureAt(await loadJson<GeoFC>('/data/geology.geojson'), lng, lat)
      if (!f) return null
      const p = f.properties
      return { value: GEOLOGY[p.unit]?.plain ?? p.deposit, detail: p.description || p.material, raw: `OGS unit ${p.unit}` }
    },
  },
]

export const LAYER_IDS = new Set(LAYERS.map((l) => l.id))
export const layerById = (id: string) => LAYERS.find((l) => l.id === id)

/** Fill in gradient legends from the baked grid metadata. */
export async function hydrateGridLegends(): Promise<void> {
  const meta = await loadGridsMeta()
  for (const l of LAYERS) {
    const p = meta.props[l.id]
    if (l.kind !== 'grid' || !p || Array.isArray(l.legend)) continue
    l.legend = { ...l.legend, gradient: p.ramp, min: String(p.range[0]), max: `${p.range[1]}+` }
  }
}
