# PEC Soil Explorer

An interactive map of the 1948 *Soil Survey of Prince Edward County* (Ontario Soil Survey Report No. 10), shown alongside modern soil, capability and geology data. See [PRD.md](PRD.md) for the product requirements.

The site is fully static: React, TypeScript, Vite, Tailwind CSS, MapLibre GL JS and PMTiles.

## Running locally

```bash
pnpm install
```

```bash
pnpm dev
```

Production build (static files in `dist/`, deployable to Vercel or Cloudflare Pages):

```bash
pnpm build
```

`vercel.json` adds the SPA rewrite so that `/soil/:slug` and `/about` resolve to the app.

## Routes

| Path | What |
| --- | --- |
| `/?lat=&lng=&zoom=&layers=&op=&base=&sel=` | Map. All state is in the URL, so any view can be shared. `op` holds per-layer opacity (`scan1948:70`); `sel` holds the selected point. |
| `/soil` | Index of every 1948 soil type and phase. |
| `/soil/:slug` | Soil profile page, e.g. `/soil/farmington-loam`. |
| `/about` | Sources, methodology, licensing and limitations. |

## Data

| File | Built by | Source |
| --- | --- | --- |
| `public/data/soil-1948.geojson` | `pipeline/process_soils.py` | AAFC CanSIS NSDB detailed survey `ond170` (the "prince_edward" zip) |
| `public/data/soil-1948-scan.pmtiles` | `pipeline/georef_fit.py` then `pipeline/tile_raster.py` | CanSIS scan of the printed 1948 map (`on10_map.jpg`) |
| `src/data/soil-units.json` | Transcribed from the report (`pipeline/build_soil_units.py`) and checked against the map legend | `on10_report.pdf` |
| `public/data/grid-{clay,sand,silt,soc}.png`, `grid-*-data.png`, `grids.json` | `pipeline/fetch_modern.py` | AAFC Soil Landscape Grids 100 m, gaps filled from ISRIC SoilGrids 2.0. The `-data.png` files hold lossless values that the browser samples for click lookups. |
| `public/data/cli.geojson`, `geology.geojson` | `pipeline/fetch_modern.py` | CLI 1:250k agricultural capability (AAFC); OGS surficial geology MRD128-REV |
| `src/data/soil-colours.json` | `pipeline/sample_colours.py` | Printed colours sampled from the scan (reference for the display palette in `src/lib/soil.ts`) |

### Rebuilding the data

Raw inputs go in `data/raw/`, which is git-ignored:

```bash
mkdir -p data/raw && cd data/raw && curl -LO https://sis.agr.gc.ca/cansis/nsdb/dss/v2/on/prince_edward.zip && unzip -o prince_edward.zip -d prince_edward && curl -LO https://sis.agr.gc.ca/cansis/publications/surveys/on/on10/on10_map.jpg && curl -LO https://sis.agr.gc.ca/cansis/publications/surveys/on/on10/on10_report.pdf
```

Then run the pipeline with [uv](https://docs.astral.sh/uv/):

```bash
uv run --with geopandas --with pyogrio --with pyproj python pipeline/process_soils.py
```

```bash
uv run --with geopandas --with pyogrio --with scipy --with pillow python pipeline/georef_fit.py
```

```bash
uv run --with pmtiles --with pillow --with numpy python pipeline/tile_raster.py
```

```bash
uv run --with geopandas --with pyogrio --with tifffile --with pillow --with pandas python pipeline/fetch_modern.py
```

`pipeline/services.json` records the public web services that were evaluated for the modern layers, with tested URLs, CORS behaviour and provenance.

### Things worth knowing about the sources

- **The CanSIS polygons are 6° too far west.** They were un-projected from UTM with zone 17 instead of zone 18. UTM zones differ only in their central meridian, so adding 6° of longitude is an exact fix. After the fix, total area per soil symbol matches the 1948 legend acreages to within a few percent.
- **The printed graticule is offset.** The map's latitude labels sit about 5′ south of true positions, though longitude is correct. The scan is therefore registered against the digitized polygons rather than the graticule. A second-order polynomial is fitted by one-sided chamfer matching of polygon boundaries to colour edges in the scan; the median misfit is about 4 scan pixels (about 20 m).
- **No modeled depth-to-bedrock layer.** SoilGrids' 2017 bedrock-depth model predicts about 5 m at Picton, which is implausible on PEC's shallow limestone, so the "Soil depth over bedrock" layer uses the 1948 depth classes instead. OGS MRD207 (overburden thickness) is the best candidate to add later; it has to be downloaded manually from GeologyOntario.
- **AAFC's 100 m grids have gaps in PEC** (around West Lake, Wellington and several round holes). ISRIC SoilGrids fills them, and the location panel names which model supplied each value.
- **`UNK` polygons** are areas the survey did not classify. Most are on the mainland outside the county. The app draws no fill for them.
