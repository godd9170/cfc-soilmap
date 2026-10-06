import { DEPTH_CLASSES, depthClassFor } from '../lib/interpret'
import type { ThematicLayer } from '../lib/layerTypes'
import { findSoilAt, loadSoilPolygons } from '../lib/soil'
import { SOIL_1948_PROVENANCE } from './soil1948'

export const depth1948: ThematicLayer = {
  id: 'depth1948',
  title: 'Soil depth over bedrock',
  group: 'soil',
  description:
    'Depth classes from the 1948 survey’s soil descriptions. No defensible modeled depth-to-bedrock grid is available for the County yet.',
  source: { type: 'soil1948', style: 'depth' },
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
}
