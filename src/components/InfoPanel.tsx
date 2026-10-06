import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { LAYERS, SOIL_1948_PROVENANCE, type ThematicLayer } from '../lib/layers'
import { SOIL_COLOURS, type SoilFeature, type SoilUnit } from '../lib/soil'
import { Swatch } from './Legend'

interface Props {
  point: { lat: number; lng: number }
  feature: SoilFeature | null
  unit: SoilUnit | null
  loading: boolean
  onClose: () => void
  onShare: () => void
  shareStatus: string
}

type QueryResult =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ok'; value: string; detail?: string; raw?: string }

const QUERY_LAYERS = LAYERS.filter((l) => l.query)

function useModernValues(point: { lat: number; lng: number }) {
  const [values, setValues] = useState<Record<string, QueryResult>>({})
  useEffect(() => {
    setValues(Object.fromEntries(QUERY_LAYERS.map((l) => [l.id, { status: 'loading' } as QueryResult])))
    let cancelled = false
    for (const l of QUERY_LAYERS) {
      l.query!(point.lng, point.lat).then(
        (v) => !cancelled && setValues((s) => ({ ...s, [l.id]: v ? { status: 'ok', ...v } : { status: 'empty' } })),
        () => !cancelled && setValues((s) => ({ ...s, [l.id]: { status: 'error' } })),
      )
    }
    return () => {
      cancelled = true
    }
  }, [point.lat, point.lng])
  return values
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1">
      <dt className="text-stone-600">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  )
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="border-t border-stone-200 px-4 py-4">
      <h3 id={id} className="mb-2 text-xs font-semibold tracking-wider text-stone-600 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ValueText({ r }: { r: QueryResult | undefined }) {
  if (!r || r.status === 'loading') return <span className="text-stone-500">Loading…</span>
  if (r.status === 'error') return <span className="text-stone-500">Unavailable</span>
  if (r.status === 'empty') return <span className="text-stone-500">No data here</span>
  return (
    <span>
      <span className="font-semibold">{r.value}</span>
      {r.detail && <span className="block text-xs text-stone-700">{r.detail}</span>}
      {r.raw && <span className="block font-mono text-[11px] text-stone-500">{r.raw}</span>}
    </span>
  )
}

function ModernBlock({ layers, values }: { layers: ThematicLayer[]; values: Record<string, QueryResult> }) {
  return (
    <dl className="text-sm">
      {layers.map((l) => (
        <div key={l.id} className="grid grid-cols-[8.5rem_1fr] gap-2 py-1">
          <dt className="text-stone-600">
            {l.title}
            {l.provenance.nature === 'modeled' && (
              <span className="ml-1 rounded bg-stone-200 px-1 text-[10px] font-semibold text-stone-700 uppercase">Modeled</span>
            )}
          </dt>
          <dd className="text-stone-900">
            <ValueText r={values[l.id]} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function InfoPanel({ point, feature, unit, loading, onClose, onShare, shareStatus }: Props) {
  const values = useModernValues(point)
  const [showOriginal, setShowOriginal] = useState(false)
  useEffect(() => setShowOriginal(false), [unit?.symbol])

  const soilProps = QUERY_LAYERS.filter((l) => l.group === 'Soil properties')
  const capability = QUERY_LAYERS.filter((l) => l.id === 'cli')
  const geology = QUERY_LAYERS.filter((l) => l.id === 'geology')
  const status = (id: string) => {
    const r = values[id]
    return r?.status === 'ok' ? r.value : r?.status === 'loading' ? '…' : '—'
  }

  return (
    <article aria-labelledby="info-title" className="text-sm">
      <header className="sticky top-0 z-10 flex items-start gap-2 border-b border-stone-200 bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex-1">
          <h2 id="info-title" className="text-xs font-semibold tracking-wider text-stone-600 uppercase">
            Selected location
          </h2>
          <p className="font-mono text-xs text-stone-700">
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </p>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="min-h-9 rounded-md border border-stone-300 bg-white px-3 text-xs font-medium text-stone-800 hover:bg-stone-50"
        >
          {shareStatus || 'Share link'}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close location details"
          className="grid size-9 place-items-center rounded-md text-xl leading-none text-stone-700 hover:bg-stone-200"
        >
          ×
        </button>
      </header>

      <section aria-labelledby="hist-title" className="px-4 py-4" aria-live="polite">
        <h3 id="hist-title" className="mb-2 text-xs font-semibold tracking-wider text-stone-600 uppercase">
          Historical soil · 1948 survey
        </h3>
        {loading ? (
          <p className="text-stone-600">Loading 1948 survey…</p>
        ) : !feature || feature.properties.symbol === 'UNK' ? (
          <p className="text-stone-700">
            This location was not classified by the 1948 survey — it is outside Prince Edward County, open water, or an
            unclassified area (such as a town site).
          </p>
        ) : !unit ? (
          <p className="text-stone-700">
            Mapped as <span className="font-mono">{feature.properties.symbol}</span>; no description is available for this
            symbol.
          </p>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <Swatch colour={SOIL_COLOURS[unit.symbol] ?? '#ccc'} className="mt-1.5 h-5 w-7" />
              <div>
                <p className="font-serif text-2xl leading-tight text-stone-900">{unit.type_name}</p>
                <p className="text-xs text-stone-600">
                  Map symbol <span className="font-mono">{unit.symbol}</span>
                  {unit.phase ? ` · ${unit.phase} phase` : ''} · polygon of {feature.properties.area_ha.toLocaleString()} ha
                </p>
              </div>
            </div>
            <dl className="mt-3 text-sm">
              <Row label="Drainage" value={unit.drainage} />
              <Row label="Soil depth" value={unit.soil_depth} />
              <Row label="Parent material" value={unit.parent_material ?? unit.soil_material} />
              <Row label="Topography" value={unit.topography} />
              <Row label="Stoniness" value={unit.stoniness} />
              <Row
                label="Historical crop rating"
                value={
                  unit.historical_crop_group
                    ? `${unit.historical_crop_group}${unit.historical_wording ? ` — “${unit.historical_wording}”` : ''}`
                    : unit.historical_wording
                }
              />
            </dl>
            {unit.primary_limitation && (
              <div className="mt-3 rounded-md border-l-4 border-amber-600 bg-amber-50 px-3 py-2">
                <p className="text-xs font-semibold text-amber-900">Primary limitation</p>
                <p className="text-stone-900">{unit.primary_limitation}</p>
              </div>
            )}
            {unit.interpretation && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-stone-700">What this means today (modern interpretation)</p>
                <p className="mt-1 text-stone-800">{unit.interpretation}</p>
              </div>
            )}
            {unit.original_description && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowOriginal((s) => !s)}
                  aria-expanded={showOriginal}
                  className="text-sm font-medium text-moss-700 underline underline-offset-2"
                >
                  {showOriginal ? 'Hide' : 'Read'} the 1948 report’s description
                </button>
                {showOriginal && (
                  <blockquote className="mt-2 border-l-2 border-stone-300 pl-3 font-serif whitespace-pre-line text-stone-800">
                    {unit.original_description}
                    {unit.report_pages && (
                      <footer className="mt-1 font-sans text-xs text-stone-600">
                        — Soil Survey of Prince Edward County (1948), pp. {unit.report_pages.start}
                        {unit.report_pages.end !== unit.report_pages.start ? `–${unit.report_pages.end}` : ''}
                      </footer>
                    )}
                  </blockquote>
                )}
              </div>
            )}
            <p className="mt-3">
              <Link to={`/soil/${unit.slug}`} className="font-medium text-moss-700 underline underline-offset-2">
                Full {unit.type_name} profile →
              </Link>
            </p>
          </>
        )}
        <p className="mt-3 text-xs text-stone-600 italic">{LAYERS[0].caveat}</p>
      </section>

      {soilProps.length > 0 && (
        <Section title="Soil properties" id="modern-title">
          <ModernBlock layers={soilProps} values={values} />
          <p className="mt-2 text-xs text-stone-600 italic">
            Modeled values are estimates from statistical soil models at about 100 m resolution. Conditions may vary
            substantially within a field; these are not field measurements or soil tests. Depth over bedrock is the typical
            depth for the 1948 soil type.
          </p>
        </Section>
      )}
      {capability.length > 0 && (
        <Section title="Agricultural capability" id="cli-title">
          <ModernBlock layers={capability} values={values} />
        </Section>
      )}
      {geology.length > 0 && (
        <Section title="Surficial geology" id="geo-title">
          <ModernBlock layers={geology} values={values} />
        </Section>
      )}

      {QUERY_LAYERS.length > 0 && (
        <Section title="Historical vs. modern" id="cmp-title">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Comparison of datasets at this location</caption>
            <thead>
              <tr className="text-xs text-stone-600">
                <th scope="col" className="py-1 font-medium">Dataset</th>
                <th scope="col" className="py-1 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              <tr>
                <th scope="row" className="py-1.5 pr-2 font-normal text-stone-700">1948 soil survey <span className="text-[10px] text-stone-500 uppercase">observed</span></th>
                <td className="py-1.5">{unit?.type_name ?? '—'}</td>
              </tr>
              {QUERY_LAYERS.map((l) => (
                <tr key={l.id}>
                  <th scope="row" className="py-1.5 pr-2 font-normal text-stone-700">
                    {l.title}{' '}
                    <span className="text-[10px] text-stone-500 uppercase">{l.provenance.nature}</span>
                  </th>
                  <td className="py-1.5">{status(l.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="Sources" id="src-title">
        <ul className="grid gap-1 text-xs text-stone-700">
          <li>
            <a href={SOIL_1948_PROVENANCE.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
              1948 Soil Survey of Prince Edward County
            </a>{' '}
            (observed historical mapping)
          </li>
          {QUERY_LAYERS.filter(
            (l, i, all) =>
              l.provenance.nature !== 'observed' &&
              l.provenance.dataset !== SOIL_1948_PROVENANCE.dataset &&
              all.findIndex((o) => o.provenance.dataset === l.provenance.dataset) === i &&
              !l.provenance.dataset.includes('1948'),
          ).map((l) => (
            <li key={l.id}>
              <a href={l.provenance.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                {l.provenance.dataset}
              </a>{' '}
              — {l.provenance.publisher}, {l.provenance.year}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-600">
          Site-specific decisions should be confirmed through field observation or soil sampling.{' '}
          <Link to="/about" className="underline underline-offset-2">About the data</Link>
        </p>
      </Section>
    </article>
  )
}
