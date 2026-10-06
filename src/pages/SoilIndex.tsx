import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Swatch } from '../components/Legend'
import { SOIL_COLOURS, loadSoilUnits, type SoilUnit } from '../lib/soil'
import Page from './Page'

export default function SoilIndex() {
  const [units, setUnits] = useState<SoilUnit[]>([])
  useEffect(() => {
    loadSoilUnits().then((u) => setUnits(Object.values(u.units)))
  }, [])
  const groups = new Map<string, SoilUnit[]>()
  for (const u of units) {
    const k = u.soil_material ?? 'Miscellaneous'
    groups.set(k, [...(groups.get(k) ?? []), u])
  }
  return (
    <Page title="Soils of the 1948 survey">
      <h1 className="font-serif text-3xl text-stone-900">Soils of the 1948 survey</h1>
      <p className="mt-3 text-stone-700">
        The 1948 Soil Survey of Prince Edward County mapped {units.length} soil types and phases, grouped below by the
        material they formed in. Acreages are those reported in 1948.
      </p>
      {[...groups].map(([material, list]) => (
        <section key={material} className="mt-8">
          <h2 className="border-b border-stone-300 pb-1 text-sm font-semibold tracking-wider text-stone-600 uppercase">
            {material}
          </h2>
          <ul className="mt-2 divide-y divide-stone-200">
            {list.map((u) => (
              <li key={u.symbol}>
                <Link to={`/soil/${u.slug}`} className="flex items-center gap-3 py-2.5 hover:bg-moss-50">
                  <Swatch colour={SOIL_COLOURS[u.symbol] ?? '#ccc'} className="h-5 w-7" />
                  <span className="w-12 font-mono text-sm text-stone-600">{u.symbol}</span>
                  <span className="flex-1 font-medium text-stone-900">{u.type_name}</span>
                  <span className="hidden text-sm text-stone-600 sm:inline">{u.historical_crop_group ?? '—'}</span>
                  <span className="w-20 text-right text-sm text-stone-600 tabular-nums">
                    {u.acreage ? `${u.acreage.toLocaleString()} ac` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  )
}
