import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import InfoPanel from '../components/InfoPanel'
import LayerPanel from '../components/LayerPanel'
import MapView, { type SelectedFeature, type ViewState } from '../components/MapView'
import SearchBox from '../components/SearchBox'
import SiteHeader from '../components/SiteHeader'
import { LAYER_IDS, hydrateGridLegends, layerById, type FeatureCard, type ThematicLayer } from '../lib/layers'
import { loadJson } from '../lib/lookup'
import {
  findSoilAt,
  loadSoilPolygons,
  loadSoilUnits,
  type SoilCollection,
  type SoilUnit,
} from '../lib/soil'
import { parseUrlState, serializeUrlState, type Basemap } from '../lib/urlState'

export default function Explorer() {
  const initial = useMemo(() => parseUrlState(window.location.search, LAYER_IDS), [])
  const [view, setView] = useState<ViewState>({ lat: initial.lat, lng: initial.lng, zoom: initial.zoom })
  const [flyTo, setFlyTo] = useState<(ViewState & { key: number }) | null>(null)
  const [active, setActive] = useState<string[]>(initial.layers)
  const [opacity, setOpacity] = useState<Record<string, number>>(initial.opacity)
  const [basemap, setBasemap] = useState<Basemap>(initial.basemap)
  const [showRoads, setShowRoads] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [selected, setSelected] = useState(initial.selected)
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(initial.feature)
  const [card, setCard] = useState<{ layer: ThematicLayer; card: FeatureCard } | null>(null)
  const [layersOpen, setLayersOpen] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [identifyCentre, setIdentifyCentre] = useState(0)

  useEffect(() => {
    if (!layersOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLayersOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [layersOpen])

  const [polygons, setPolygons] = useState<SoilCollection | null>(null)
  const [units, setUnits] = useState<Record<string, SoilUnit>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [, setLegendsReady] = useState(false)

  useEffect(() => {
    loadSoilPolygons().then(setPolygons, (e: Error) => setLoadError(e.message))
    loadSoilUnits().then((u) => setUnits(u.units))
    hydrateGridLegends().then(() => setLegendsReady(true), () => undefined)
  }, [])

  // Keep the URL in sync so any view can be shared (PRD §21).
  const urlState = useMemo(
    () => serializeUrlState({ ...view, layers: active, opacity, basemap, selected, feature: selectedFeature }),
    [view, active, opacity, basemap, selected, selectedFeature],
  )
  useEffect(() => {
    const t = setTimeout(() => window.history.replaceState(null, '', `/${urlState}`), 250)
    return () => clearTimeout(t)
  }, [urlState])

  // Resolve the clicked feature (e.g. a vendor) into a card via its layer's describeFeature.
  useEffect(() => {
    setCard(null)
    const layer = selectedFeature && layerById(selectedFeature.layerId)
    if (!layer?.describeFeature || layer.source.type !== 'geojson-points') return
    let cancelled = false
    loadJson<GeoJSON.FeatureCollection>(layer.source.url).then((fc) => {
      const f = fc.features.find((x) => String(x.properties?.id) === selectedFeature!.id)
      if (!cancelled && f?.properties) setCard({ layer, card: layer.describeFeature!(f.properties) })
    })
    return () => {
      cancelled = true
    }
  }, [selectedFeature])

  const feature = useMemo(
    () => (polygons && selected ? findSoilAt(polygons, selected.lng, selected.lat) : null),
    [polygons, selected],
  )
  const unit = feature ? (units[feature.properties.symbol] ?? null) : null

  const toggleLayer = useCallback(
    (id: string) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id])),
    [],
  )

  const flyCounter = useRef(0)
  const onSearchPick = useCallback((r: { lat: number; lng: number; zoom: number }) => {
    setFlyTo({ lat: r.lat, lng: r.lng, zoom: r.zoom, key: ++flyCounter.current })
    setSelected({ lat: r.lat, lng: r.lng })
    setSelectedFeature(null)
    setSheetExpanded(false)
  }, [])

  const onSelect = useCallback((p: { lat: number; lng: number }, f?: SelectedFeature) => {
    setSelected(p)
    setSelectedFeature(f ?? null)
    setSheetExpanded(false)
  }, [])

  async function share() {
    const url = `${window.location.origin}/${urlState}`
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'PEC Soil Explorer', url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareStatus('Link copied')
    } catch {
      setShareStatus('Copy failed')
    }
    setTimeout(() => setShareStatus(''), 2000)
  }

  const unitList = useMemo(() => Object.values(units), [units])
  const layerPanel = (
    <LayerPanel
      active={active}
      opacity={opacity}
      basemap={basemap}
      showRoads={showRoads}
      showLabels={showLabels}
      units={unitList}
      onToggle={toggleLayer}
      onOpacity={(id, v) => setOpacity((o) => ({ ...o, [id]: v }))}
      onBasemap={setBasemap}
      onRoads={setShowRoads}
      onLabels={setShowLabels}
    />
  )

  const info = selected && (
    <InfoPanel
      point={selected}
      feature={feature}
      unit={unit}
      loading={!polygons && !loadError}
      onClose={() => {
        setSelected(null)
        setSelectedFeature(null)
      }}
      card={card}
      onShare={share}
      shareStatus={shareStatus}
    />
  )

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader search={<SearchBox onPick={onSearchPick} />} />

      <div className="relative flex min-h-0 flex-1">
        {/* Desktop layer panel */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-stone-200 bg-paper lg:block">
          {layerPanel}
        </aside>

        <main id="main" className="relative min-w-0 flex-1" aria-label="Map">
          <MapView
            initialView={view}
            flyTo={flyTo}
            identifyCentre={identifyCentre}
            activeLayers={active}
            opacity={opacity}
            basemap={basemap}
            showRoads={showRoads}
            showLabels={showLabels}
            selected={selected}
            selectedPolygonId={feature && feature.properties.symbol !== 'UNK' ? feature.properties.id : null}
            onViewChange={setView}
            onSelect={onSelect}
          />

          {loadError && (
            <p role="alert" className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded bg-red-50 px-3 py-2 text-sm text-red-900 shadow">
              Could not load the 1948 soil data. Please reload the page.
            </p>
          )}

          {!selected && (
            <p className="pointer-events-none absolute top-3 left-3 z-10 hidden rounded-md bg-white/90 px-3 py-2 text-sm text-stone-800 shadow sm:block">
              Click anywhere on the map to see what lies beneath.
            </p>
          )}

          {/* Crosshair + identify-centre control for keyboard and touch users */}
          <button
            type="button"
            onClick={() => setIdentifyCentre((n) => n + 1)}
            className="absolute bottom-9 left-1/2 z-10 min-h-10 -translate-x-1/2 rounded-full border border-stone-300 bg-white/95 px-4 text-sm font-medium text-stone-900 shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-moss-600"
          >
            What’s at the map centre?
          </button>
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 text-xl leading-none text-stone-900/50">
            +
          </span>

          {/* Mobile layers button */}
          <button
            type="button"
            onClick={() => setLayersOpen(true)}
            className="absolute top-3 left-3 z-10 min-h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-900 shadow lg:hidden"
            aria-haspopup="dialog"
          >
            Layers
          </button>
        </main>

        {/* Desktop info panel */}
        {selected && (
          <aside
            aria-label="Location details"
            className="hidden w-[26rem] shrink-0 overflow-y-auto border-l border-stone-200 bg-paper lg:block"
          >
            {info}
          </aside>
        )}

        {/* Mobile bottom sheet */}
        {selected && (
          <aside
            aria-label="Location details"
            className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-t border-stone-300 bg-paper shadow-[0_-4px_16px_rgba(0,0,0,0.15)] lg:hidden ${
              sheetExpanded ? 'h-[85%]' : 'h-[42%]'
            } transition-[height] duration-200`}
          >
            <button
              type="button"
              onClick={() => setSheetExpanded((e) => !e)}
              aria-expanded={sheetExpanded}
              aria-label={sheetExpanded ? 'Collapse details' : 'Expand details'}
              className="flex h-6 w-full shrink-0 items-center justify-center"
            >
              <span className="h-1.5 w-12 rounded-full bg-stone-400" />
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto">{info}</div>
          </aside>
        )}

        {/* Mobile layer drawer */}
        {layersOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Map layers">
            <div className="absolute inset-0 bg-black/40" onClick={() => setLayersOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-paper shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2">
                <h2 className="font-semibold">Layers</h2>
                <button
                  type="button"
                  onClick={() => setLayersOpen(false)}
                  className="min-h-11 px-3 text-sm font-medium text-moss-700"
                  autoFocus
                >
                  Done
                </button>
              </div>
              {layerPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
