import { useEffect, useState } from 'react'
import { vendorProducts, vendorUrl, type Product } from '../lib/storefront'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ok'; products: Product[] }

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function priceLabel(p: Product) {
  if (p.price == null) return null
  return `${p.multiplePrices ? 'from ' : ''}${p.estimated ? '~' : ''}${money.format(p.price)}`
}

/** Live product grid for one storefront vendor; loads on its own so the rest of the panel isn't held up. */
export default function VendorProducts({ vendor }: { vendor: { id: number; slug: string } }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    vendorProducts(vendor.id).then(
      (products) => !cancelled && setState({ status: 'ok', products }),
      () => !cancelled && setState({ status: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [vendor.id])

  const storeLink = vendorUrl(vendor.slug)

  return (
    <div className="mt-4" aria-live="polite" aria-busy={state.status === 'loading'}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold tracking-wider text-stone-600 uppercase">
          Products{state.status === 'ok' && state.products.length > 0 ? ` · ${state.products.length}` : ''}
        </h4>
        <a href={storeLink} target="_blank" rel="noreferrer" className="text-xs font-medium text-moss-700 underline underline-offset-2">
          Shop this farm ↗
        </a>
      </div>

      {state.status === 'loading' && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Loading products">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="aspect-square animate-pulse rounded-md bg-stone-200" />
          ))}
        </ul>
      )}

      {state.status === 'error' && (
        <p className="text-stone-600">
          Products couldn’t be loaded right now.{' '}
          <a href={storeLink} target="_blank" rel="noreferrer" className="text-moss-700 underline underline-offset-2">
            See them on the storefront
          </a>
          .
        </p>
      )}

      {state.status === 'ok' && state.products.length === 0 && <p className="text-stone-600">No products listed right now.</p>}

      {state.status === 'ok' && state.products.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {state.products.map((p) => {
            const price = priceLabel(p)
            return (
              <li key={p.id}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  title={p.name}
                  className="group relative block aspect-square overflow-hidden rounded-md border border-stone-200 bg-stone-100 focus-visible:outline-2 focus-visible:outline-moss-700"
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      loading="lazy"
                      className={`size-full object-cover transition-transform duration-200 group-hover:scale-105 ${p.soldOut ? 'opacity-50 grayscale' : ''}`}
                    />
                  ) : (
                    <span className="grid size-full place-items-center p-2 pb-8 text-center text-xs leading-tight text-stone-600">{p.name}</span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pt-5 pb-1 text-white">
                    <span className="sr-only">{p.name}, </span>
                    {p.soldOut ? (
                      <span className="text-[11px] font-semibold">Sold out</span>
                    ) : (
                      price && <span className="text-xs font-semibold tabular-nums">{price}</span>
                    )}
                    {p.image && <span className="block truncate text-[10px] leading-tight opacity-90" aria-hidden>{p.name}</span>}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
