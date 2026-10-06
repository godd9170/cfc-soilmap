import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { soilDepthExpression, soilFillExpression, type ThematicLayer } from '../lib/layers'
import type { GridsMeta } from '../lib/lookup'

/** What MapView needs to drive one registry layer once it is on the map. */
export interface LayerHandle {
  /** MapLibre layer ids that toggle together. */
  ids: string[]
  setOpacity: (map: MapLibreMap, opacity: number) => void
  /** Layer ids whose features can be clicked to open a feature card. */
  clickable?: string[]
}

export const SOIL_SOURCE = 'pec-soil1948'

const hidden = { visibility: 'none' as const }

function addFill(map: MapLibreMap, id: string, source: string, fillColour: unknown, beforeId?: string, sourceLayer?: string): LayerHandle {
  const base = { source, ...(sourceLayer ? { 'source-layer': sourceLayer } : {}) }
  map.addLayer({ id: `${id}-fill`, type: 'fill', ...base, layout: hidden, paint: { 'fill-color': fillColour as never } }, beforeId)
  map.addLayer(
    {
      id: `${id}-line`,
      type: 'line',
      ...base,
      layout: hidden,
      ...(source === SOIL_SOURCE ? { filter: ['!=', ['get', 'symbol'], 'UNK'] } : {}),
      paint: {
        'line-color': source === SOIL_SOURCE ? '#4a3b2f' : '#333',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.25, 14, 1.1],
      },
    },
    beforeId,
  )
  return {
    ids: [`${id}-fill`, `${id}-line`],
    setOpacity: (m, op) => {
      m.setPaintProperty(`${id}-fill`, 'fill-opacity', op)
      m.setPaintProperty(`${id}-line`, 'line-opacity', Math.min(1, op * 0.8))
    },
  }
}

function addRaster(map: MapLibreMap, id: string, beforeId?: string, fade = 150): LayerHandle {
  map.addLayer(
    {
      id: `${id}-raster`,
      type: 'raster',
      source: id,
      layout: hidden,
      // Grids show their cells honestly rather than smoothing them into false detail.
      paint: { 'raster-fade-duration': fade, ...(fade === 0 ? { 'raster-resampling': 'nearest' as const } : {}) },
    },
    beforeId,
  )
  return { ids: [`${id}-raster`], setOpacity: (m, op) => m.setPaintProperty(`${id}-raster`, 'raster-opacity', op) }
}

/** Load each feature's icon image (named by its URL, drawn at 2x) so symbol layers can use ['get', iconProperty]. */
async function loadIcons(map: MapLibreMap, url: string, iconProperty: string) {
  const fc = (await fetch(url).then((r) => r.json())) as GeoJSON.FeatureCollection
  const urls = new Set(fc.features.map((f) => f.properties?.[iconProperty]).filter((u): u is string => typeof u === 'string' && !!u))
  await Promise.all(
    [...urls].map(async (u) => {
      if (map.hasImage(u)) return
      const img = await map.loadImage(u)
      if (!map.hasImage(u)) map.addImage(u, img.data, { pixelRatio: 2 })
    }),
  )
}

/** Add one registry layer's sources and MapLibre layers. Fills/rasters go below `beforeId`; points go on top. */
export function addLayerToMap(map: MapLibreMap, layer: ThematicLayer, beforeId: string | undefined, grids: GridsMeta | null): LayerHandle {
  const id = `pec-${layer.id}`
  const src = layer.source
  switch (src.type) {
    case 'soil1948':
      return addFill(map, id, SOIL_SOURCE, src.style === 'series' ? soilFillExpression() : soilDepthExpression(), beforeId)

    case 'geojson-polygons':
      map.addSource(id, { type: 'geojson', data: src.url, attribution: layer.attribution })
      return addFill(map, id, id, src.fillColour, beforeId)

    case 'pmtiles-polygons':
      map.addSource(id, { type: 'vector', url: `pmtiles://${src.url}`, attribution: layer.attribution })
      return addFill(map, id, id, src.fillColour, beforeId, src.sourceLayer)

    case 'pmtiles-raster':
      map.addSource(id, { type: 'raster', url: `pmtiles://${src.url}`, tileSize: 256, maxzoom: src.maxzoom, attribution: layer.attribution })
      return addRaster(map, id, beforeId)

    case 'raster-tiles':
      map.addSource(id, {
        type: 'raster',
        tiles: src.tiles,
        tileSize: src.tileSize ?? 256,
        maxzoom: src.maxzoom ?? 18,
        attribution: layer.attribution,
      })
      return addRaster(map, id, beforeId)

    case 'grid': {
      if (!grids) return { ids: [], setOpacity: () => undefined }
      const [w, s, e, n] = grids.bounds
      map.addSource(id, {
        type: 'image',
        url: `/data/grid-${src.id}.png`,
        coordinates: [
          [w, n],
          [e, n],
          [e, s],
          [w, s],
        ],
      })
      return addRaster(map, id, beforeId, 0)
    }

    case 'geojson-points': {
      map.addSource(id, { type: 'geojson', data: src.url, attribution: layer.attribution })
      const approx: ExpressionSpecification = ['==', ['get', 'approx'], true]
      map.addLayer({
        id: `${id}-circle`,
        type: 'circle',
        source: id,
        layout: hidden,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7],
          'circle-color': ['case', approx, '#ffffff', src.colour],
          'circle-stroke-color': src.colour,
          'circle-stroke-width': 2,
        },
      })
      const ids = [`${id}-circle`]
      if (src.iconProperty) {
        map.addLayer({
          id: `${id}-icon`,
          type: 'symbol',
          source: id,
          minzoom: 10,
          layout: {
            ...hidden,
            'icon-image': ['coalesce', ['get', src.iconProperty], ''],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 14, 1.1],
            'icon-allow-overlap': true,
            ...(src.labelProperty
              ? {
                  'text-field': ['step', ['zoom'], '', 12, ['get', src.labelProperty]],
                  'text-font': ['Noto Sans Bold'],
                  'text-size': 12,
                  'text-offset': [0, 1.9],
                  'text-anchor': 'top',
                  'text-optional': true,
                }
              : {}),
          },
          paint: { 'text-color': '#2f3b2a', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
        })
        ids.push(`${id}-icon`)
        loadIcons(map, src.url, src.iconProperty).catch((e) => console.warn('[map] icons', e))
      }
      return {
        ids,
        clickable: ids,
        setOpacity: (m, op) => {
          m.setPaintProperty(`${id}-circle`, 'circle-opacity', op)
          m.setPaintProperty(`${id}-circle`, 'circle-stroke-opacity', op)
          if (src.iconProperty) m.setPaintProperty(`${id}-icon`, 'icon-opacity', op)
        },
      }
    }
  }
}
