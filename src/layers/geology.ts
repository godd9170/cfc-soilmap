import { GEOLOGY } from '../lib/interpret'
import { matchExpr, type ThematicLayer } from '../lib/layerTypes'
import { pmtilesFeatureAt } from '../lib/lookup'

const URL = '/data/geology.pmtiles'
const SOURCE_LAYER = 'geology'

export const geology: ThematicLayer = {
  id: 'geology',
  title: 'Surficial geology',
  group: 'land',
  description: 'Ontario Geological Survey surficial geology: the material the soil formed in.',
  source: {
    type: 'pmtiles-polygons',
    url: URL,
    sourceLayer: SOURCE_LAYER,
    fillColour: matchExpr('unit', Object.entries(GEOLOGY).map(([k, v]) => [k, v.colour])),
  },
  defaultOpacity: 0.6,
  attribution: 'Surficial geology: Ontario Geological Survey',
  legend: ['3', '5b', '8a', '9c', '6a', '7b', '14b', '17', '19', '20'].map((k) => ({
    colour: GEOLOGY[k].colour,
    label: GEOLOGY[k].plain,
  })),
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
    const p = (await pmtilesFeatureAt(URL, SOURCE_LAYER, lng, lat)) as
      | { unit: string; deposit: string; material: string; description: string }
      | null
    if (!p) return null
    return { value: GEOLOGY[p.unit]?.plain ?? p.deposit, detail: p.description || p.material, raw: `OGS unit ${p.unit}` }
  },
}
