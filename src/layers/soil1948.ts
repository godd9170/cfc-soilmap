import type { Provenance, ThematicLayer } from '../lib/layerTypes'

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

/** The 1948 soil polygons. Its legend and location-panel section are built from src/data/soil-units.json. */
export const soil1948: ThematicLayer = {
  id: 'soil1948',
  title: '1948 Soil Survey',
  group: 'historical',
  description: 'Soil series and types mapped by the 1948 survey, as digital polygons.',
  source: { type: 'soil1948', style: 'series' },
  defaultOpacity: 0.3,
  attribution: '1948 Soil Survey of PEC (AAFC CanSIS)',
  provenance: SOIL_1948_PROVENANCE,
  caveat: 'Boundary interpreted from a historical soil survey. Actual soil transitions may occur gradually.',
}

export const scan1948: ThematicLayer = {
  id: 'scan1948',
  title: 'Original 1948 Map',
  group: 'historical',
  description: 'The printed 1948 soil map, georeferenced onto the modern map.',
  source: { type: 'pmtiles-raster', url: '/data/soil-1948-scan.pmtiles', maxzoom: 14 },
  defaultOpacity: 0.7,
  attribution: '1948 soil map scan (AAFC CanSIS)',
  provenance: {
    ...SOIL_1948_PROVENANCE,
    dataset: 'Soil Map of Prince Edward County, Ontario (Soil Survey Report No. 10), scanned by AAFC CanSIS',
    methodology:
      'Scan georeferenced by fitting a second-order polynomial that aligns the printed boundaries with the digitized polygons (median misfit ≈ 20 m). The printed latitude graticule is offset roughly 5′ from true positions and was not used directly.',
    url: 'https://sis.agr.gc.ca/cansis/publications/surveys/on/on10/on10_map.jpg',
  },
  caveat: 'Historical printed map; registration to modern geography is approximate (tens of metres).',
}
