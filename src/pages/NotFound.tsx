import { Link } from 'react-router'
import Page from './Page'

export default function NotFound() {
  return (
    <Page title="Not found">
      <h1 className="font-serif text-3xl">Page not found</h1>
      <p className="mt-4">
        <Link to="/" className="text-moss-700 underline">Back to the map</Link>
      </p>
    </Page>
  )
}
