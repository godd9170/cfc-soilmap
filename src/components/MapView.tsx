import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  GeolocateControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  addProtocol,
  setWorkerUrl,
  type LayerSpecification,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { LAYERS, type ThematicLayer } from '../lib/layers'
import { loadGridsMeta, type GridsMeta } from '../lib/lookup'
import { SOIL_SOURCE, addLayerToMap, type LayerHandle } from './mapLayers'
import type { Basemap } from '../lib/urlState'

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const PEC_BOUNDS: [number, number, number, number] = [-78.2, 43.5, -76.2, 44.5]

let protocolAdded = false
function ensurePmtilesProtocol() {
  if (protocolAdded) return
  // MapLibre computes its worker URL at runtime, which bundlers can't rewrite; point it at the emitted asset.
  setWorkerUrl(maplibreWorkerUrl)
  const protocol = new Protocol()
  addProtocol('pmtiles', protocol.tile)
  protocolAdded = true
}

export interface ViewState {
  lat: number
  lng: number
  zoom: number
}

interface Props {
  initialView: ViewState
  /** When this object changes identity the map flies to it (used by search). */
  flyTo: (ViewState & { key: number }) | null
  /** Incrementing counter; each change selects the current map centre (keyboard-friendly identify). */
  identifyCentre: number
  activeLayers: string[]
  opacity: Record<string, number>
  basemap: Basemap
  showRoads: boolean
  showLabels: boolean
  selected: { lat: number; lng: number } | null
  selectedPolygonId: number | null
  onViewChange: (v: ViewState) => void
  /** A map click. `feature` is set when a clickable feature (e.g. a vendor point) was hit. */
  onSelect: (p: { lat: number; lng: number }, feature?: SelectedFeature) => void
}

export interface SelectedFeature {
  layerId: string
  id: string
}

const opacityOf = (l: ThematicLayer, opacity: Record<string, number>) => opacity[l.id] ?? l.defaultOpacity

const isRoadLayer = (l: LayerSpecification) =>
  l.type === 'line' && /highway|tunnel|road|railway|bridge|aeroway/.test(l.id)
const isBaseFill = (l: LayerSpecification) =>
  (l.type === 'fill' || l.type === 'background' || l.type === 'fill-extrusion') && !l.id.startsWith('pec-')

export default function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const loaded = useRef(false)
  const propsRef = useRef(props)
  propsRef.current = props

  const handles = useRef(new Map<string, LayerHandle>())

  // Create the map once (after the small grid metadata file, which gives grid image bounds).
  useEffect(() => {
    let map: MapLibreMap | null = null
    let cancelled = false
    loadGridsMeta()
      .catch(() => null)
      .then((grids) => {
        if (!cancelled && container.current) map = createMap(container.current, grids)
      })
    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
      loaded.current = false
      handles.current.clear()
    }
  }, [])

  function createMap(el: HTMLDivElement, grids: GridsMeta | null): MapLibreMap {
    ensurePmtilesProtocol()
    const { initialView } = propsRef.current
    const map = new MapLibreMap({
      container: el,
      style: BASEMAP_STYLE,
      center: [initialView.lng, initialView.lat],
      zoom: initialView.zoom,
      maxBounds: PEC_BOUNDS,
      minZoom: 8,
      maxZoom: 18,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })
    mapRef.current = map
    if (import.meta.env.DEV) {
      ;(window as unknown as { __map: MapLibreMap }).__map = map
      map.on('error', (e) => console.error('[map]', e.error?.message ?? e))
    }
    map.touchZoomRotate.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    const geolocate = new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false })
    map.addControl(geolocate, 'top-right')
    // A farmer standing in a field should see the soil beneath them (PRD §28).
    geolocate.on('geolocate', (pos) =>
      propsRef.current.onSelect({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    )
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    // Start with the compact attribution collapsed; it expands on tap.
    map.once('idle', () =>
      container.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'),
    )
    map.getCanvas().setAttribute('aria-label', 'Interactive soil map of Prince Edward County. Click a location for details.')

    map.once('style.load', () => {
      const style = map.getStyle()
      const firstAbove =
        style.layers.find((l) => l.id === 'waterway')?.id ?? style.layers.find((l) => l.type === 'symbol')?.id

      map.addSource('pec-satellite', {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      })
      map.addLayer(
        { id: 'pec-satellite', type: 'raster', source: 'pec-satellite', layout: { visibility: 'none' } },
        style.layers.find((l) => l.type !== 'background')?.id,
      )

      // Shared source for the 1948 polygons (soil and depth layers, labels, selection outline).
      map.addSource(SOIL_SOURCE, { type: 'geojson', data: '/data/soil-1948.geojson', attribution: LAYERS.find((l) => l.source.type === 'soil1948')!.attribution })

      // Registry order is top-first, so add in reverse: each fill/raster is inserted just under the basemap's
      // roads and labels, above the previous one. Point layers are added last, on top of everything.
      const ordered = [...LAYERS].reverse()
      for (const layer of ordered.filter((l) => l.source.type !== 'geojson-points'))
        handles.current.set(layer.id, addLayerToMap(map, layer, firstAbove, grids))

      map.addLayer({
        id: 'pec-soil1948-label',
        type: 'symbol',
        source: SOIL_SOURCE,
        minzoom: 12,
        layout: {
          visibility: 'none',
          'text-field': ['get', 'symbol'],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11, 16, 15],
          'text-padding': 4,
        },
        filter: ['all', ['!=', ['get', 'symbol'], 'UNK'], ['>', ['get', 'area_ha'], 4]],
        paint: { 'text-color': '#2b2118', 'text-halo-color': 'rgba(255,255,255,0.85)', 'text-halo-width': 1.4 },
      })

      // County boundary, always shown.
      map.addSource('pec-outline', { type: 'geojson', data: '/data/pec-outline.geojson' })
      map.addLayer({
        id: 'pec-outline',
        type: 'line',
        source: 'pec-outline',
        paint: { 'line-color': '#2f3b2a', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 2.5], 'line-opacity': 0.8 },
      })

      map.addLayer({
        id: 'pec-selected-line',
        type: 'line',
        source: SOIL_SOURCE,
        filter: ['==', ['get', 'id'], -1],
        paint: { 'line-color': '#111', 'line-width': 3 },
      })

      for (const layer of ordered.filter((l) => l.source.type === 'geojson-points'))
        handles.current.set(layer.id, addLayerToMap(map, layer, undefined, grids))

      loaded.current = true
      syncAll()
    })

    map.on('moveend', () => {
      const c = map.getCenter()
      propsRef.current.onViewChange({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })
    })
    const clickable = () =>
      [...handles.current.entries()]
        .filter(([id]) => propsRef.current.activeLayers.includes(id))
        .flatMap(([, h]) => h.clickable ?? [])
    const hitAt = (pt: { x: number; y: number }) => {
      const layers = clickable()
      if (!layers.length || !loaded.current) return null
      const box: [[number, number], [number, number]] = [
        [pt.x - 6, pt.y - 6],
        [pt.x + 6, pt.y + 6],
      ]
      return map.queryRenderedFeatures(box, { layers })[0] ?? null
    }
    map.on('click', (e) => {
      const hit = hitAt(e.point)
      if (hit && hit.geometry.type === 'Point') {
        const [lng, lat] = hit.geometry.coordinates
        const layerId = [...handles.current.entries()].find(([, h]) => h.ids.includes(hit.layer.id))?.[0]
        if (layerId) return propsRef.current.onSelect({ lat, lng }, { layerId, id: String(hit.properties.id) })
      }
      propsRef.current.onSelect({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    })
    map.on('mousemove', (e) => {
      map.getCanvas().style.cursor = hitAt(e.point) ? 'pointer' : 'crosshair'
    })
    map.getCanvas().style.cursor = 'crosshair'
    return map
  }

  function syncAll() {
    const map = mapRef.current
    if (!map || !loaded.current) return
    const p = propsRef.current
    const satellite = p.basemap === 'satellite'
    for (const l of map.getStyle().layers) {
      if (l.id.startsWith('pec-')) continue
      let visible = true
      if (isBaseFill(l)) visible = !satellite || l.type === 'background'
      if (isRoadLayer(l)) visible = p.showRoads
      if (l.type === 'symbol') visible = p.showLabels
      map.setLayoutProperty(l.id, 'visibility', visible ? 'visible' : 'none')
    }
    map.setLayoutProperty('pec-satellite', 'visibility', satellite ? 'visible' : 'none')

    for (const layer of LAYERS) {
      const h = handles.current.get(layer.id)
      if (!h) continue
      const on = p.activeLayers.includes(layer.id)
      for (const id of h.ids) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
      h.setOpacity(map, opacityOf(layer, p.opacity))
    }
    map.setLayoutProperty('pec-soil1948-label', 'visibility', p.activeLayers.includes('soil1948') ? 'visible' : 'none')
    map.setFilter('pec-selected-line', ['==', ['get', 'id'], p.selectedPolygonId ?? -1])
  }

  useEffect(syncAll, [
    props.activeLayers,
    props.opacity,
    props.basemap,
    props.showRoads,
    props.showLabels,
    props.selectedPolygonId,
  ])

  // Selected-point marker.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!props.selected) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    if (!markerRef.current) {
      const el = document.createElement('div')
      el.className = 'pec-marker'
      el.setAttribute('aria-hidden', 'true')
      markerRef.current = new Marker({ element: el })
    }
    markerRef.current.setLngLat([props.selected.lng, props.selected.lat]).addTo(map)
  }, [props.selected])

  useEffect(() => {
    if (!props.identifyCentre || !mapRef.current) return
    const c = mapRef.current.getCenter()
    propsRef.current.onSelect({ lat: c.lat, lng: c.lng })
  }, [props.identifyCentre])

  useEffect(() => {
    if (!props.flyTo || !mapRef.current) return
    mapRef.current.flyTo({ center: [props.flyTo.lng, props.flyTo.lat], zoom: props.flyTo.zoom, essential: true })
  }, [props.flyTo])

  // MapLibre sets position:relative on its container, so size it from an absolutely positioned wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" />
    </div>
  )
}
