import type { ThematicLayer } from '../lib/layers'
import { SOIL_COLOURS, type SoilUnit } from '../lib/soil'

export function Swatch({ colour, className = '' }: { colour: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 w-5 shrink-0 rounded-sm border border-black/25 ${className}`}
      style={{ background: colour }}
    />
  )
}

/** Soil series legend; each row toggles highlighting of that series' polygons on the map. */
export function SoilLegend({
  units,
  highlighted,
  onToggle,
  onClear,
}: {
  units: SoilUnit[]
  highlighted: string[]
  onToggle: (symbol: string) => void
  onClear: () => void
}) {
  const sorted = [...units].sort((a, b) => (b.acreage ?? 0) - (a.acreage ?? 0))
  return (
    <div className="min-w-0">
      <div className="mb-1 flex min-h-6 items-center justify-between gap-2 text-xs text-stone-600">
        <span>{highlighted.length ? `${highlighted.length} highlighted` : 'Select a soil to highlight it'}</span>
        {highlighted.length > 0 && (
          <button type="button" onClick={onClear} className="font-medium text-moss-700 underline-offset-2 hover:underline">
            Clear
          </button>
        )}
      </div>
      <ul className="grid min-w-0 grid-cols-1 gap-0.5 text-xs text-stone-800">
        {sorted.map((u) => {
          const on = highlighted.includes(u.symbol)
          return (
            <li key={u.symbol} className="min-w-0">
              <button
                type="button"
                onClick={() => onToggle(u.symbol)}
                aria-pressed={on}
                className={`flex w-full min-w-0 items-start gap-2 rounded px-1 py-0.5 text-left hover:bg-stone-200/60 focus-visible:outline-2 focus-visible:outline-moss-600 ${
                  on ? 'bg-moss-100 ring-1 ring-moss-500' : ''
                }`}
              >
                <Swatch colour={SOIL_COLOURS[u.symbol] ?? '#ccc'} className="mt-px" />
                <span className="w-10 shrink-0 font-mono text-[11px] break-all text-stone-600">{u.symbol}</span>
                <span className={`min-w-0 flex-1 break-words ${on ? 'font-semibold' : ''}`}>{u.type_name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function LayerLegend({ layer }: { layer: ThematicLayer }) {
  const lg = layer.legend
  if (!lg) return null
  if (Array.isArray(lg)) {
    if (!lg.length) return null
    return (
      <ul className="grid gap-1 text-xs text-stone-800">
        {lg.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            {i.image ? (
              <img src={i.image} alt="" className="size-5 shrink-0 rounded-full border border-black/20" />
            ) : (
              <Swatch colour={i.colour} />
            )}
            <span className="min-w-0 break-words">{i.label}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (!lg.gradient.length) return null
  return (
    <div className="text-xs text-stone-700">
      <div
        aria-hidden="true"
        className="h-3 rounded-sm border border-black/20"
        style={{ background: `linear-gradient(to right, ${lg.gradient.join(',')})` }}
      />
      <div className="mt-0.5 flex justify-between">
        <span>{lg.min}</span>
        <span>{lg.units}</span>
        <span>{lg.max}</span>
      </div>
    </div>
  )
}
