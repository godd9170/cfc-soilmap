/**
 * The map's layer registry, in panel order. Earlier entries draw above later ones; point
 * layers always draw above polygons and rasters. To add a dataset, see ./README.md.
 */
import type { ThematicLayer } from '../lib/layerTypes'
import { cli } from './cli'
import { depth1948 } from './depth1948'
import { geology } from './geology'
import { scan1948, soil1948 } from './soil1948'
import { clay, sand, silt, soc } from './soilGrids'
import { vendors } from './vendors'

export const LAYERS: ThematicLayer[] = [
  soil1948,
  scan1948,
  depth1948,
  clay,
  sand,
  silt,
  soc,
  cli,
  geology,
  vendors,
]

export { SOIL_1948_PROVENANCE } from './soil1948'
