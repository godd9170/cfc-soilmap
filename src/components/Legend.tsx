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

export function SoilLegend({ units }: { units: SoilUnit[] }) {
  const sorted = [...units].sort((a, b) => (b.acreage ?? 0) - (a.acreage ?? 0))
  return (
    <ul className="grid gap-1 text-xs text-stone-800">
      {sorted.map((u) => (
        <li key={u.symbol} className="flex items-center gap-2">
          <Swatch colour={SOIL_COLOURS[u.symbol] ?? '#ccc'} />
          <span className="w-9 shrink-0 font-mono text-[11px] text-stone-600">{u.symbol}</span>
          <span className="truncate">{u.type_name}</span>
        </li>
      ))}
    </ul>
  )
}

export function LayerLegend({ layer }: { layer: ThematicLayer }) {
  const lg = layer.legend
  if (Array.isArray(lg)) {
    if (!lg.length) return null
    return (
      <ul className="grid gap-1 text-xs text-stone-800">
        {lg.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <Swatch colour={i.colour} />
            <span>{i.label}</span>
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
