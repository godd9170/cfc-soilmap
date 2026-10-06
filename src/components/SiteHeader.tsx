import { Link, NavLink } from 'react-router'

export default function SiteHeader({ search }: { search?: React.ReactNode }) {
  const nav = ({ isActive }: { isActive: boolean }) =>
    `rounded px-2 py-1.5 text-sm font-medium ${isActive ? 'text-white underline underline-offset-4' : 'text-moss-100 hover:text-white'}`
  return (
    <header className="z-30 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 bg-moss-900 px-3 py-2 text-white sm:flex-nowrap sm:px-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-stone-900">
        Skip to content
      </a>
      <Link to="/" className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="font-serif text-lg font-semibold tracking-tight">PEC Soil Explorer</span>
        <span className="hidden text-xs text-moss-200 md:inline">Prince Edward County · 1948 soil survey</span>
      </Link>
      <div className="order-last w-full sm:order-none sm:ml-auto sm:max-w-md sm:flex-1">{search}</div>
      <nav aria-label="Site" className="ml-auto flex gap-1 sm:ml-0">
        <NavLink to="/soil" className={nav}>
          Soils
        </NavLink>
        <NavLink to="/about" className={nav}>
          About
        </NavLink>
      </nav>
    </header>
  )
}
