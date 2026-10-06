import { useEffect } from 'react'
import { useLocation } from 'react-router'
import SiteHeader from '../components/SiteHeader'

/** Shared layout for the text pages (about, soil profiles). */
export default function Page({ title, children }: { title: string; children: React.ReactNode }) {
  const { hash } = useLocation()
  useEffect(() => {
    document.title = `${title} · PEC Soil Explorer`
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [title, hash])
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
