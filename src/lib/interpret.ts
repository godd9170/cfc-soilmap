/** Plain-language translations of classification codes (PRD §12, §13, §16). */

export const CLI_CLASS: Record<string, { label: string; plain: string; colour: string }> = {
  '1': { label: 'Class 1', plain: 'No significant limitations for crops', colour: '#1a6b2f' },
  '2': { label: 'Class 2', plain: 'Moderate limitations that restrict the range of crops or need moderate conservation practices', colour: '#5a9a3c' },
  '3': { label: 'Class 3', plain: 'Moderately severe limitations that restrict the range of crops or need special practices', colour: '#a8c84e' },
  '4': { label: 'Class 4', plain: 'Severe limitations that restrict the range of crops or need special practices', colour: '#f0d264' },
  '5': { label: 'Class 5', plain: 'Very severe limitations; suited to perennial forage crops, and improvement is feasible', colour: '#e8a33c' },
  '6': { label: 'Class 6', plain: 'Suited only to perennial forage or pasture; improvement is not feasible', colour: '#cc6a2c' },
  '7': { label: 'Class 7', plain: 'No capability for arable culture or permanent pasture', colour: '#9b3a2a' },
  '8': { label: 'Organic', plain: 'Organic soils (peat, muck); not rated for capability', colour: '#6d5d50' },
  O: { label: 'Organic', plain: 'Organic soils (peat, muck); not rated for capability', colour: '#6d5d50' },
  '9': { label: 'Unclassified', plain: 'Not classified (urban, water or other)', colour: '#bdbdbd' },
}

export const CLI_SUBCLASS: Record<string, string> = {
  C: 'adverse climate',
  D: 'undesirable soil structure or low permeability',
  E: 'erosion damage',
  F: 'low natural fertility',
  I: 'flooding by streams or lakes',
  M: 'moisture limitation (droughtiness)',
  N: 'salinity',
  P: 'stoniness',
  R: 'shallow soil over bedrock',
  S: 'a combination of soil limitations',
  T: 'adverse topography (slope or pattern)',
  W: 'excess water (poor drainage)',
  X: 'several minor limitations combined',
}

export interface CliComponent {
  class: string
  sub: string
  pct: number
}

export function describeCli(components: CliComponent[]): { value: string; detail: string; raw: string } | null {
  if (!components.length) return null
  const code = (c: CliComponent) => `${c.class === '8' ? 'O' : c.class}${c.sub}`
  const raw = components.map((c) => `${code(c)}${components.length > 1 ? ` (${c.pct}%)` : ''}`).join(' + ')
  const main = components[0]
  const cls = CLI_CLASS[main.class]
  const subs = [...main.sub].map((s) => CLI_SUBCLASS[s]).filter(Boolean)
  let detail = cls ? cls.plain : ''
  if (subs.length) detail += `, mainly due to ${subs.join(' and ')}`
  detail += '.'
  if (components.length > 1) detail += ` The area also includes ${components.slice(1).map((c) => `${c.pct}% class ${code(c)}`).join(' and ')}.`
  return { value: `Class ${code(main)}`, detail, raw: `CLI code: ${raw}` }
}

export const GEOLOGY: Record<string, { colour: string; plain: string }> = {
  '1': { colour: '#f4a6a4', plain: 'Precambrian bedrock (granite and gneiss)' },
  '3': { colour: '#e7b3f0', plain: 'Limestone bedrock at or near the surface, with little or no glacial cover' },
  '5b': { colour: '#8fbf3a', plain: 'Glacial till: a stony mix of silt, sand and limestone fragments left by ice' },
  '6a': { colour: '#f2a81d', plain: 'Ice-contact sand and gravel (kames, eskers, moraines)' },
  '7b': { colour: '#f6cf73', plain: 'Gravelly outwash deposited by glacial meltwater' },
  '8a': { colour: '#8fd8e8', plain: 'Silt and clay laid down in glacial lakes' },
  '9b': { colour: '#f3e64a', plain: 'Sand and gravel from glacial-lake shorelines' },
  '9c': { colour: '#e2d33a', plain: 'Sand and gravel from glacial-lake shorelines and nearshore basins' },
  '12': { colour: '#a87a4f', plain: 'Older river and stream deposits' },
  '14b': { colour: '#fff07a', plain: 'Beach sand and gravel from Lake Ontario' },
  '17': { colour: '#fbf3c4', plain: 'Wind-blown sand (dunes)' },
  '19': { colour: '#c69563', plain: 'Recent river and stream deposits' },
  '20': { colour: '#9a9a9a', plain: 'Organic deposits: peat, muck and marl in wetlands' },
}

/** Depth to bedrock classes derived from the 1948 soil units (observed, not modeled). */
export const DEPTH_CLASSES = [
  { id: 'rock', label: 'Bedrock at or near surface', colour: '#7a1f1f', symbols: ['R'] },
  { id: 'lt30', label: 'Under ~30 cm (1 ft) of soil', colour: '#c8553d', symbols: ['Fl', 'Fl-i'] },
  { id: '30-90', label: '~30–90 cm (1–3 ft) of soil', colour: '#f0a35e', symbols: ['Acl', 'Al', 'Ac-i', 'Asl', 'Gc', 'Hc', 'Ec-s'] },
  { id: 'gt90', label: 'Generally deeper than ~90 cm (3 ft)', colour: '#f6e8b1', symbols: ['Dl', 'Wc', 'Sc', 'SBc', 'SBcl', 'Ec', 'Ecl', 'Bs', 'Bg', 'Pfs', 'Tsl', 'Gs', 'Psl', 'Ps', 'Es'] },
  { id: 'organic', label: 'Organic soil or marsh', colour: '#6d5d50', symbols: ['M', 'Ma'] },
  { id: 'variable', label: 'Variable (bottom land)', colour: '#b7b0c9', symbols: ['B.L.'] },
] as const

export const depthClassFor = (symbol: string) => DEPTH_CLASSES.find((c) => (c.symbols as readonly string[]).includes(symbol)) ?? null
