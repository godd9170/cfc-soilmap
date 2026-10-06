import { useState } from 'react'
import { Link } from 'react-router'
import { GROUPS, LAYERS } from '../lib/layers'
import type { SoilUnit } from '../lib/soil'
import type { Basemap } from '../lib/urlState'
import { LayerLegend, SoilLegend } from './Legend'

interface Props {
  active: string[]
  opacity: Record<string, number>
  basemap: Basemap
  showRoads: boolean
  showLabels: boolean
  units: SoilUnit[]
  highlightedSoils: string[]
  onToggleSoil: (symbol: string) => void
  onClearSoils: () => void
  /** Desktop only: collapses the panel to a rail. */
  onCollapse?: () => void
  onToggle: (id: string) => void
  onOpacity: (id: string, v: number) => void
  onBasemap: (b: Basemap) => void
  onRoads: (v: boolean) => void
  onLabels: (v: boolean) => void
}

function Toggle({ id, label, checked, onChange, badge }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; badge?: string }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-moss-700"
      />
      <span className="min-w-0 flex-1 text-sm font-medium text-stone-900">{label}</span>
      {badge && (
        <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-stone-700 uppercase">
          {badge}
        </span>
      )}
    </label>
  )
}

export default function LayerPanel(p: Props) {
  const [legendOpen, setLegendOpen] = useState(true)
  return (
    <nav aria-label="Map layers" className="flex min-w-0 flex-col gap-5 p-4">
      {p.onCollapse && (
        <div className="-mt-1 -mb-3 flex justify-end">
          <button
            type="button"
            onClick={p.onCollapse}
            aria-label="Collapse layer panel"
            title="Collapse layer panel"
            className="flex size-8 items-center justify-center rounded text-lg leading-none text-stone-600 hover:bg-stone-200 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-moss-600"
          >
            «
          </button>
        </div>
      )}
      {GROUPS.map((group) => {
        const layers = LAYERS.filter((l) => l.group === group.id)
        if (!layers.length) return null
        return (
          <section key={group.id} className="min-w-0" aria-labelledby={`grp-${group.id}`}>
            <h2 id={`grp-${group.id}`} className="mb-1 text-xs font-semibold tracking-wider text-stone-600 uppercase">
              {group.title}
            </h2>
            <ul className="divide-y divide-stone-200">
              {layers.map((l) => {
                const on = p.active.includes(l.id)
                const op = Math.round((p.opacity[l.id] ?? l.defaultOpacity) * 100)
                return (
                  <li key={l.id} className="min-w-0 py-1">
                    <Toggle
                      id={`layer-${l.id}`}
                      label={l.title}
                      checked={on}
                      onChange={() => p.onToggle(l.id)}
                      badge={l.provenance.nature === 'modeled' ? 'Modeled' : undefined}
                    />
                    {on && (
                      <div className="mb-2 ml-8 grid min-w-0 grid-cols-1 gap-2">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`op-${l.id}`} className="sr-only">
                            {l.title} opacity
                          </label>
                          <input
                            id={`op-${l.id}`}
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={op}
                            onChange={(e) => p.onOpacity(l.id, Number(e.target.value) / 100)}
                            className="pec-range h-6 min-w-0 flex-1"
                            aria-valuetext={`${op}% opacity`}
                          />
                          <output htmlFor={`op-${l.id}`} className="w-10 shrink-0 text-right text-xs text-stone-700 tabular-nums">
                            {op}%
                          </output>
                        </div>
                        <p className="text-xs text-stone-600">{l.description}</p>
                        {l.source.type === 'soil1948' && l.source.style === 'series' ? (
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setLegendOpen((o) => !o)}
                              aria-expanded={legendOpen}
                              className="mb-1 text-xs font-medium text-moss-700 underline-offset-2 hover:underline"
                            >
                              {legendOpen ? 'Hide legend' : 'Show legend'}
                            </button>
                            {legendOpen && (
                              <SoilLegend
                                units={p.units}
                                highlighted={p.highlightedSoils}
                                onToggle={p.onToggleSoil}
                                onClear={p.onClearSoils}
                              />
                            )}
                          </div>
                        ) : (
                          <LayerLegend layer={l} />
                        )}
                        <Link to={`/about#${l.id}`} className="text-xs text-moss-700 underline underline-offset-2">
                          Source &amp; limitations
                        </Link>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <section aria-labelledby="grp-ref">
        <h2 id="grp-ref" className="mb-1 text-xs font-semibold tracking-wider text-stone-600 uppercase">
          Reference
        </h2>
        <Toggle id="ref-roads" label="Roads" checked={p.showRoads} onChange={p.onRoads} />
        <Toggle id="ref-labels" label="Place labels" checked={p.showLabels} onChange={p.onLabels} />
        <Toggle
          id="ref-sat"
          label="Satellite imagery"
          checked={p.basemap === 'satellite'}
          onChange={(v) => p.onBasemap(v ? 'satellite' : 'streets')}
        />
      </section>
    </nav>
  )
}
