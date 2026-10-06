# Adding a dataset

Every map layer is one file in this folder, plus one line in [`index.ts`](index.ts). The layer panel, legend, map styling, click lookups, location panel, comparison table, `/about` provenance and shareable links all come from that definition. You don't need to touch any components.

## 1. Get the data into `public/data/`

Put fetch and clean-up steps in a script under `pipeline/` so the data can be rebuilt, and publish only public fields.

| Data | Format | Pipeline helper |
| --- | --- | --- |
| Points (addresses, sites) | GeoJSON; each feature needs a string `properties.id` | [`pipeline/build_vendors.py`](../../pipeline/build_vendors.py) is a full example: CSV in, geocoded with the County's civic address points, logos fetched |
| Polygons, under about 2 MB | GeoJSON | geopandas `to_file(..., driver="GeoJSON")` |
| Polygons, larger | Vector PMTiles | `geojson_to_pmtiles()` in [`pipeline/vector_tiles.py`](../../pipeline/vector_tiles.py) (needs `brew install tippecanoe`) |
| Continuous soil property | Baked grid | Add a line to `PROPS` in [`pipeline/fetch_modern.py`](../../pipeline/fetch_modern.py) |
| Raster image | Raster PMTiles | [`pipeline/tile_raster.py`](../../pipeline/tile_raster.py) |
| Live tile service (XYZ, WMS, ArcGIS) | Nothing to download | Use a `raster-tiles` source. Check CORS before relying on it |

## 2. Describe the layer

Create `src/layers/<name>.ts` exporting a `ThematicLayer` (types are in [`../lib/layerTypes.ts`](../lib/layerTypes.ts)):

```ts
import { matchExpr, type ThematicLayer } from '../lib/layerTypes'
import { pmtilesFeatureAt } from '../lib/lookup'

export const wetlands: ThematicLayer = {
  id: 'wetlands',                 // appears in shared links: ?layers=wetlands
  title: 'Provincially significant wetlands',
  group: 'land',                  // 'historical' | 'soil' | 'land' | 'local' (GROUPS in layerTypes.ts)
  description: 'One line shown under the toggle.',
  source: {
    type: 'pmtiles-polygons',
    url: '/data/wetlands.pmtiles',
    sourceLayer: 'wetlands',
    fillColour: matchExpr('class', [['PSW', '#4a90a4'], ['other', '#9cc3cf']]),
  },
  defaultOpacity: 0.6,
  attribution: 'Wetlands: Ontario MNR',
  legend: [{ colour: '#4a90a4', label: 'Provincially significant' }],
  provenance: { publisher: '…', dataset: '…', year: '…', resolution: '…', methodology: '…', url: '…', licence: '…', limitations: '…', nature: 'compiled' },
  caveat: 'Shown next to this layer’s value in the location panel.',
  // Optional: a value at a clicked point (location panel and comparison table).
  query: async (lng, lat) => {
    const p = await pmtilesFeatureAt('/data/wetlands.pmtiles', 'wetlands', lng, lat)
    return p ? { value: String(p.name), detail: String(p.class) } : null
  },
}
```

Source types:

| `source.type` | Draws | Click lookup helper |
| --- | --- | --- |
| `geojson-points` | Circles, plus round icons from `iconProperty` from zoom 10 and labels from zoom 12. Features with `approx: true` draw hollow. | Add `describeFeature(props)` to show a card when the point is clicked |
| `geojson-polygons` | Fill and outline coloured by `fillColour` | `featureAt(await loadJson(url), lng, lat)` |
| `pmtiles-polygons` | Fill and outline from vector tiles | `pmtilesFeatureAt(url, sourceLayer, lng, lat)` |
| `grid` | Baked grid image with nearest-neighbour cells | `sampleGrid(id, lng, lat)` |
| `pmtiles-raster` | Tiled image | none |
| `raster-tiles` | Live tiles from `tiles: [urlTemplate]`; use `{bbox-epsg-3857}` for WMS or ArcGIS export | Usually a `fetch` to the service's identify or query endpoint |

Use `provenance.nature` to keep observed, modeled and compiled data visibly distinct (PRD §26): `observed`, `modeled` (gets a "Modeled" badge), `compiled` or `reference`.

## 3. Register it

Add the import to [`index.ts`](index.ts) and place the layer in `LAYERS`. List order is panel order, and earlier entries draw above later ones. Point layers always draw on top.

To add a new group (a new heading in the panel and a new section in the location panel), add an entry to `GROUPS` in `layerTypes.ts`.
