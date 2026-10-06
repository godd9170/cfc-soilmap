import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { CLI_CLASS, describeCli, type CliComponent } from '../lib/interpret'
import { matchExpr, type ThematicLayer } from '../lib/layerTypes'
import { featureAt, loadJson } from '../lib/lookup'

const URL = '/data/cli.geojson'
type CliFC = FeatureCollection<Polygon | MultiPolygon, { major: string; components: string | CliComponent[] }>

export const cli: ThematicLayer = {
  id: 'cli',
  title: 'Agricultural capability (CLI)',
  group: 'land',
  description: 'Canada Land Inventory soil capability for agriculture, 1:250,000.',
  source: {
    type: 'geojson-polygons',
    url: URL,
    fillColour: matchExpr('major', Object.entries(CLI_CLASS).map(([k, v]) => [k, v.colour])),
  },
  defaultOpacity: 0.6,
  attribution: 'CLI: AAFC',
  legend: ['1', '2', '3', '4', '5', '6', '7', '8'].map((k) => ({
    colour: CLI_CLASS[k].colour,
    label: `${CLI_CLASS[k].label} — ${CLI_CLASS[k].plain.split(';')[0]}`,
  })),
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
    const f = featureAt(await loadJson<CliFC>(URL), lng, lat)
    if (!f) return null
    const c = f.properties.components
    return describeCli(typeof c === 'string' ? (JSON.parse(c) as CliComponent[]) : c)
  },
}
