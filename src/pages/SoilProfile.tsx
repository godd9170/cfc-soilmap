import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Swatch } from '../components/Legend'
import { SOIL_COLOURS, loadSoilPolygons, loadSoilUnits, type SoilCollection, type SoilUnit } from '../lib/soil'
import Page from './Page'

const REPORT_PDF = 'https://sis.agr.gc.ca/cansis/publications/surveys/on/on10/on10_report.pdf'
const RATING_LABEL: Record<string, string> = { G: 'Good', 'G-F': 'Good to fair', F: 'Fair', 'F-P': 'Fair to poor', P: 'Poor' }
const CROP_LABEL: Record<string, string> = { hay_and_pasture: 'Hay and pasture', tree_fruits: 'Tree fruits' }

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm text-stone-600">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-stone-900">{title}</h3>
      <ul className="mt-1 list-disc pl-5 text-stone-800">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

/** Where the unit occurs: polygon count, total area and the centre of its largest polygon. */
function useOccurrence(symbol: string | undefined) {
  const [fc, setFc] = useState<SoilCollection | null>(null)
  useEffect(() => {
    loadSoilPolygons().then(setFc, () => undefined)
  }, [])
  return useMemo(() => {
    if (!fc || !symbol) return null
    const fs = fc.features.filter((f) => f.properties.symbol === symbol)
    if (!fs.length) return null
    const largest = fs.reduce((a, b) => (b.properties.area_ha > a.properties.area_ha ? b : a))
    const ring = largest.geometry.type === 'Polygon' ? largest.geometry.coordinates[0] : largest.geometry.coordinates[0][0]
    const xs = ring.map((p) => p[0])
    const ys = ring.map((p) => p[1])
    return {
      count: fs.length,
      hectares: fs.reduce((s, f) => s + f.properties.area_ha, 0),
      lng: (Math.min(...xs) + Math.max(...xs)) / 2,
      lat: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }, [fc, symbol])
}

export default function SoilProfile() {
  const { slug } = useParams()
  const [units, setUnits] = useState<SoilUnit[] | null>(null)
  useEffect(() => {
    loadSoilUnits().then((u) => setUnits(Object.values(u.units)))
  }, [])
  const unit = units?.find((u) => u.slug === slug)
  const occ = useOccurrence(unit?.symbol)
  const related = units?.filter((u) => unit && u.series === unit.series && u.symbol !== unit.symbol) ?? []

  if (units && !unit)
    return (
      <Page title="Soil not found">
        <h1 className="font-serif text-3xl">Soil not found</h1>
        <p className="mt-4">
          <Link to="/soil" className="text-moss-700 underline">See all soils</Link>
        </p>
      </Page>
    )
  if (!unit) return <Page title="Loading">Loading…</Page>

  const ratings = Object.entries(unit.historical_crop_ratings ?? {}).filter(([, v]) => v)

  return (
    <Page title={unit.type_name}>
      <nav aria-label="Breadcrumb" className="text-sm text-stone-600">
        <Link to="/soil" className="underline underline-offset-2">Soils</Link> / {unit.series}
      </nav>
      <header className="mt-3 flex items-start gap-4">
        <Swatch colour={SOIL_COLOURS[unit.symbol] ?? '#ccc'} className="mt-2 h-8 w-12" />
        <div>
          <h1 className="font-serif text-4xl leading-tight text-stone-900">{unit.type_name}</h1>
          <p className="mt-1 text-stone-700">
            Map symbol <span className="font-mono">{unit.symbol}</span>
            {unit.acreage ? ` · ${unit.acreage.toLocaleString()} acres reported in 1948` : ''}
            {unit.historical_crop_group ? ` · ${unit.historical_crop_group} crop land (1948)` : ''}
          </p>
        </div>
      </header>

      {unit.interpretation && (
        <section aria-labelledby="interp" className="mt-6 rounded-lg border border-moss-200 bg-moss-50 p-4">
          <h2 id="interp" className="text-xs font-semibold tracking-wider text-moss-800 uppercase">
            Modern plain-language interpretation
          </h2>
          <p className="mt-2 text-stone-900">{unit.interpretation}</p>
          <p className="mt-2 text-xs text-stone-600">
            Written for PEC Soil Explorer from the 1948 report; not part of the original survey. Confirm site conditions
            with field observation or soil testing.
          </p>
        </section>
      )}

      <section aria-labelledby="hist" className="mt-8">
        <h2 id="hist" className="font-serif text-2xl text-stone-900">From the 1948 survey</h2>
        <dl className="mt-2 divide-y divide-stone-200">
          <Field label="Series" value={unit.series} />
          <Field label="Texture" value={unit.texture} />
          <Field label="Phase" value={unit.phase} />
          <Field label="Soil material" value={unit.soil_material} />
          <Field label="Parent material" value={unit.parent_material} />
          <Field label="Bedrock" value={unit.bedrock} />
          <Field label="Depth" value={unit.soil_depth} />
          <Field label="Natural drainage" value={unit.drainage} />
          <Field label="Topography" value={unit.topography} />
          <Field label="Surface stoniness" value={unit.stoniness} />
          <Field label="Surface reaction" value={unit.surface_reaction} />
          <Field label="Surface soil" value={unit.surface_soil_description} />
          <Field label="Subsoil" value={unit.subsoil_description} />
          <Field
            label="Crop rating"
            value={
              unit.historical_crop_group
                ? `${unit.historical_crop_group}${unit.historical_wording ? ` — “${unit.historical_wording}”` : ''}`
                : unit.historical_wording
            }
          />
        </dl>

        {unit.primary_limitation && (
          <div className="mt-4 rounded-md border-l-4 border-amber-600 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">Primary limitation</p>
            <p className="text-stone-900">{unit.primary_limitation}</p>
          </div>
        )}
        <List title="Limitations" items={unit.limitations} />
        <List title="Crops noted in 1948" items={unit.historical_crops} />
        <List title="1948 management recommendations" items={unit.management_recommendations} />

        {unit.profile.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-stone-900">Typical soil profile</h3>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-stone-600">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">Horizon</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Depth</th>
                  <th scope="col" className="py-1 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {unit.profile.map((h, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 font-mono align-top">{h.horizon ?? '—'}</td>
                    <td className="py-1.5 pr-3 align-top whitespace-nowrap">{h.depth ?? '—'}</td>
                    <td className="py-1.5 align-top">{h.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ratings.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-stone-900">1948 crop adaptability ratings</h3>
            <table className="mt-2 w-full max-w-md text-left text-sm">
              <tbody className="divide-y divide-stone-200">
                {ratings.map(([crop, r]) => (
                  <tr key={crop}>
                    <th scope="row" className="py-1.5 pr-3 font-normal capitalize text-stone-700">
                      {CROP_LABEL[crop] ?? crop.replace(/_/g, ' ')}
                    </th>
                    <td className="py-1.5">
                      {RATING_LABEL[r] ?? r} <span className="font-mono text-xs text-stone-500">({r})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-stone-600">From the report’s crop adaptability tables (Tables 8–12).</p>
          </div>
        )}

        {unit.original_description && (
          <figure className="mt-8">
            <h3 className="font-semibold text-stone-900">Original report text</h3>
            <blockquote className="mt-2 border-l-2 border-stone-300 pl-4 font-serif whitespace-pre-line text-stone-800">
              {unit.original_description}
            </blockquote>
            {unit.report_pages && (
              <figcaption className="mt-2 text-sm text-stone-600">
                Richards, N. R. &amp; Morwick, F. F. (1948). <cite>Soil Survey of Prince Edward County</cite>, Report No. 10
                of the Ontario Soil Survey, pp. {unit.report_pages.start}
                {unit.report_pages.end !== unit.report_pages.start ? `–${unit.report_pages.end}` : ''}.{' '}
                <a
                  href={`${REPORT_PDF}#page=${unit.report_pages.start}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-moss-700 underline"
                >
                  Open the scanned report
                </a>
              </figcaption>
            )}
          </figure>
        )}
      </section>

      <section aria-labelledby="where" className="mt-8">
        <h2 id="where" className="font-serif text-2xl text-stone-900">Where it occurs</h2>
        {occ ? (
          <p className="mt-2 text-stone-800">
            Mapped as {occ.count} area{occ.count === 1 ? '' : 's'} totalling about{' '}
            {Math.round(occ.hectares).toLocaleString()} ha ({Math.round(occ.hectares * 2.471).toLocaleString()} acres) in the
            digitized survey.{' '}
            <Link
              to={`/?lat=${occ.lat.toFixed(5)}&lng=${occ.lng.toFixed(5)}&zoom=13&layers=soil1948&sel=${occ.lat.toFixed(5)},${occ.lng.toFixed(5)}`}
              className="font-medium text-moss-700 underline"
            >
              View the largest area on the map →
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-stone-600">Loading…</p>
        )}
        {related.length > 0 && (
          <p className="mt-3 text-stone-800">
            Other {unit.series} types:{' '}
            {related.map((r, i) => (
              <span key={r.symbol}>
                {i > 0 && ', '}
                <Link to={`/soil/${r.slug}`} className="text-moss-700 underline">{r.type_name}</Link>
              </span>
            ))}
          </p>
        )}
      </section>

      {unit.data_notes.length > 0 && (
        <details className="mt-8 text-sm text-stone-700">
          <summary className="cursor-pointer font-medium">Data notes ({unit.data_notes.length})</summary>
          <ul className="mt-2 list-disc pl-5">
            {unit.data_notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </Page>
  )
}
