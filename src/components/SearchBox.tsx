import { useId, useRef, useState } from 'react'
import { geocode, type GeocodeResult } from '../lib/geocode'

export default function SearchBox({ onPick }: { onPick: (r: GeocodeResult) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [active, setActive] = useState(0)
  const abort = useRef<AbortController | null>(null)
  const listId = useId()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    abort.current?.abort()
    abort.current = new AbortController()
    setStatus('loading')
    try {
      const r = await geocode(q.trim(), abort.current.signal)
      setResults(r)
      setActive(0)
      setStatus('idle')
      if (r.length === 1) pick(r[0])
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('error')
    }
  }

  function pick(r: GeocodeResult) {
    onPick(r)
    setResults(null)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!results?.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Escape') {
      setResults(null)
    } else if (e.key === 'Enter' && results.length > 1) {
      e.preventDefault()
      pick(results[active])
    }
  }

  return (
    <div className="relative w-full">
      <form role="search" onSubmit={submit} className="flex">
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search an address or place in Prince Edward County
        </label>
        <input
          id={`${listId}-input`}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setResults(null)
          }}
          onKeyDown={onKeyDown}
          placeholder="Search address or place…"
          autoComplete="off"
          role="combobox"
          aria-expanded={!!results?.length}
          aria-controls={listId}
          aria-activedescendant={results?.length ? `${listId}-${active}` : undefined}
          className="min-w-0 flex-1 rounded-l-md border border-r-0 border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-2 focus:outline-offset-[-1px] focus:outline-moss-600"
        />
        <button
          type="submit"
          className="rounded-r-md border border-moss-700 bg-moss-700 px-3 text-sm font-medium text-white hover:bg-moss-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-600"
          aria-label="Search"
        >
          {status === 'loading' ? '…' : 'Go'}
        </button>
      </form>
      <div aria-live="polite" className="sr-only">
        {status === 'error' ? 'Search failed.' : results ? `${results.length} results` : ''}
      </div>
      {status === 'error' && (
        <p className="absolute top-full mt-1 rounded bg-white px-3 py-2 text-sm text-red-800 shadow">
          Search is unavailable right now. Try again shortly.
        </p>
      )}
      {results && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 text-sm shadow-lg"
        >
          {results.length === 0 && <li className="px-3 py-2 text-stone-600">No matches in Prince Edward County.</li>}
          {results.map((r, i) => (
            <li
              key={`${r.lat},${r.lng},${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(r)
              }}
              className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-moss-50 text-moss-900' : 'text-stone-800'}`}
            >
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
