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
import { GRID_BOUNDS, LAYERS, soilDepthExpression, soilFillExpression, type ThematicLayer } from '../lib/layers'
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
  onSelect: (p: { lat: number; lng: number }) => void
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

  // Create the map once.
  useEffect(() => {
    if (!container.current) return
    ensurePmtilesProtocol()
    const { initialView } = propsRef.current
    const map = new MapLibreMap({
      container: container.current,
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

      // Shared source for the 1948 polygons (used by the soil and depth layers and the selection outline).
      const soilLayer = LAYERS.find((l) => l.kind === 'soil-vector')!
      map.addSource('pec-soil1948', { type: 'geojson', data: '/data/soil-1948.geojson', attribution: soilLayer.attribution })

      // Thematic layers, bottom to top in reverse registry order so the 1948 survey sits on top.
      for (const layer of [...LAYERS].reverse()) {
        const id = `pec-${layer.id}`
        if (layer.kind === 'soil-vector' || layer.kind === 'soil-depth') {
          map.addLayer(
            {
              id: `${id}-fill`,
              type: 'fill',
              source: 'pec-soil1948',
              layout: { visibility: 'none' },
              paint: {
                'fill-color': (layer.kind === 'soil-vector' ? soilFillExpression() : soilDepthExpression()) as never,
              },
            },
            firstAbove,
          )
          map.addLayer(
            {
              id: `${id}-line`,
              type: 'line',
              source: 'pec-soil1948',
              layout: { visibility: 'none' },
              filter: ['!=', ['get', 'symbol'], 'UNK'],
              paint: {
                'line-color': '#4a3b2f',
                'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 14, 1.2],
              },
            },
            firstAbove,
          )
        } else if (layer.kind === 'vector') {
          map.addSource(id, { type: 'geojson', data: layer.geojsonUrl!, attribution: layer.attribution })
          map.addLayer(
            {
              id: `${id}-fill`,
              type: 'fill',
              source: id,
              layout: { visibility: 'none' },
              paint: { 'fill-color': layer.fillColour as never },
            },
            firstAbove,
          )
          map.addLayer(
            {
              id: `${id}-line`,
              type: 'line',
              source: id,
              layout: { visibility: 'none' },
              paint: { 'line-color': '#333', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.2, 14, 0.9] },
            },
            firstAbove,
          )
        } else if (layer.kind === 'grid') {
          const [w, s, e, n] = GRID_BOUNDS
          map.addSource(id, {
            type: 'image',
            url: `/data/grid-${layer.id}.png`,
            coordinates: [
              [w, n],
              [e, n],
              [e, s],
              [w, s],
            ],
          })
          map.addLayer(
            {
              id: `${id}-raster`,
              type: 'raster',
              source: id,
              layout: { visibility: 'none' },
              // Show grid cells honestly rather than smoothing them into false detail.
              paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 },
            },
            firstAbove,
          )
        } else {
          map.addSource(id, {
            type: 'raster',
            url: `pmtiles://${layer.pmtilesUrl}`,
            tileSize: 256,
            maxzoom: layer.maxzoom ?? 18,
            attribution: layer.attribution,
          })
          map.addLayer(
            {
              id: `${id}-raster`,
              type: 'raster',
              source: id,
              layout: { visibility: 'none' },
              paint: { 'raster-fade-duration': 150 },
            },
            firstAbove,
          )
        }
      }

      map.addLayer({
        id: 'pec-soil1948-label',
        type: 'symbol',
        source: 'pec-soil1948',
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
        source: 'pec-soil1948',
        filter: ['==', ['get', 'id'], -1],
        paint: { 'line-color': '#111', 'line-width': 3 },
      })

      loaded.current = true
      syncAll()
    })

    map.on('moveend', () => {
      const c = map.getCenter()
      propsRef.current.onViewChange({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })
    })
    map.on('click', (e) => propsRef.current.onSelect({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
    map.getCanvas().style.cursor = 'crosshair'

    return () => {
      map.remove()
      mapRef.current = null
      loaded.current = false
    }
  }, [])

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
      const on = p.activeLayers.includes(layer.id)
      const op = opacityOf(layer, p.opacity)
      const id = `pec-${layer.id}`
      const vis = on ? 'visible' : 'none'
      if (layer.kind === 'grid' || layer.kind === 'pmtiles-raster') {
        map.setLayoutProperty(`${id}-raster`, 'visibility', vis)
        map.setPaintProperty(`${id}-raster`, 'raster-opacity', op)
      } else {
        map.setLayoutProperty(`${id}-fill`, 'visibility', vis)
        map.setLayoutProperty(`${id}-line`, 'visibility', vis)
        map.setPaintProperty(`${id}-fill`, 'fill-opacity', op)
        map.setPaintProperty(`${id}-line`, 'line-opacity', Math.min(1, op * 0.8))
      }
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
