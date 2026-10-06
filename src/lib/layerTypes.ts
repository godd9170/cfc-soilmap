/**
 * Types shared by every map layer definition in src/layers/.
 * See src/layers/README.md for how to add a dataset.
 */

/** Layer groups, in panel order. `note` is shown under the group's section in the location panel. */
export const GROUPS = [
  { id: 'historical', title: 'Historical' },
  {
    id: 'soil',
    title: 'Soil properties',
    note: 'Modeled values are estimates from statistical soil models at about 100 m resolution. Conditions may vary substantially within a field; these are not field measurements or soil tests. Depth over bedrock is the typical depth for the 1948 soil type.',
  },
  { id: 'land', title: 'Land' },
  { id: 'local', title: 'Local food' },
] as const satisfies readonly { id: string; title: string; note?: string }[]

export type LayerGroup = (typeof GROUPS)[number]['id']

export interface LegendItem {
  colour: string
  label: string
  /** Optional image (e.g. a logo) shown instead of a colour swatch. */
  image?: string
}

export type Legend = LegendItem[] | { gradient: string[]; min: string; max: string; units: string }

export interface Provenance {
  publisher: string
  dataset: string
  year: string
  resolution: string
  methodology: string
  url: string
  licence: string
  limitations: string
  /**
   * observed: historical field mapping; modeled: statistical prediction; compiled: expert
   * interpretation or compilation; reference: a directory or listing (PRD §26).
   */
  nature: 'observed' | 'modeled' | 'compiled' | 'reference'
}

/** A MapLibre style expression. */
export type Expression = unknown[]

/** Where a layer's data comes from and how it is drawn. */
export type LayerSource =
  /** The 1948 polygons, coloured by soil series or by depth class. */
  | { type: 'soil1948'; style: 'series' | 'depth' }
  /** Small polygon layer shipped as one GeoJSON file (under ~2 MB). */
  | { type: 'geojson-polygons'; url: string; fillColour: Expression }
  /** Large polygon layer as vector PMTiles (pipeline/vector_tiles.py). */
  | { type: 'pmtiles-polygons'; url: string; sourceLayer: string; fillColour: Expression }
  /** Tiled raster image in a PMTiles archive. */
  | { type: 'pmtiles-raster'; url: string; maxzoom: number }
  /** Live raster tile service: XYZ, WMS or ArcGIS export URL templates. */
  | { type: 'raster-tiles'; tiles: string[]; tileSize?: number; maxzoom?: number }
  /** Baked value grid from pipeline/fetch_modern.py (grid-<id>.png + grid-<id>-data.png). */
  | { type: 'grid'; id: string }
  /**
   * Point features from a GeoJSON file. Each feature needs a string `properties.id`.
   * `iconProperty` names a property holding an icon image URL (drawn at 2x).
   */
  | { type: 'geojson-points'; url: string; colour: string; iconProperty?: string; labelProperty?: string }

export interface QueryValue {
  value: string
  detail?: string
  raw?: string
}

/** A card describing one clicked feature (used by point layers). */
export interface FeatureCard {
  title: string
  subtitle?: string
  image?: string
  text?: string
  facts?: { label: string; value: string }[]
  links?: { label: string; href: string }[]
  note?: string
}

export interface ThematicLayer {
  /** Short, URL-safe id; appears in shared links (`layers=`). */
  id: string
  title: string
  group: LayerGroup
  description: string
  source: LayerSource
  defaultOpacity: number
  /** Short credit shown in the map's attribution control. */
  attribution: string
  legend?: Legend
  provenance: Provenance
  /** Value at a point, for the location panel and comparison table. */
  query?: (lng: number, lat: number) => Promise<QueryValue | null>
  /** For clickable feature layers (points): describe the clicked feature's properties. */
  describeFeature?: (properties: Record<string, unknown>) => FeatureCard
  /** Shown beside values in the info panel. */
  caveat: string
}

/** `match` expression colouring features by one property; unmatched features are transparent. */
export const matchExpr = (prop: string, pairs: [string, string][], fallback = 'rgba(0,0,0,0)'): Expression => [
  'match',
  ['to-string', ['get', prop]],
  ...pairs.flat(),
  fallback,
]
