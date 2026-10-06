import type { ThematicLayer } from '../lib/layerTypes'

/** Built by pipeline/build_vendors.py from a Local Line vendor export. */
export const vendors: ThematicLayer = {
  id: 'vendors',
  title: 'County Farm Collective vendors',
  group: 'local',
  description: 'Farms selling through the County Farm Collective. Select a logo to see the farm and the soil beneath it.',
  source: {
    type: 'geojson-points',
    url: '/data/vendors.geojson',
    colour: '#435326',
    iconProperty: 'icon',
    labelProperty: 'name',
  },
  defaultOpacity: 1,
  attribution: 'Vendors: County Farm Collective',
  legend: [
    { colour: '#435326', label: 'Vendor farm (logo shown when zoomed in)' },
    { colour: '#ffffff', label: 'Hollow marker: location approximate' },
  ],
  provenance: {
    publisher: 'County Farm Collective',
    dataset: 'County Farm Collective vendor directory',
    year: '2026',
    resolution: 'Civic address points',
    methodology:
      'Vendor listings exported from Local Line. Addresses are located with Prince Edward County’s NG9-1-1 civic address points, falling back to OpenStreetMap Nominatim. Logos come from the County Farm Collective vendors page.',
    url: 'https://www.countyfarmcollective.com/vendors',
    licence: 'Listing content © the vendors and the County Farm Collective.',
    limitations: 'Only vendors with a public address are shown. Pins mark the civic address, not field locations.',
    nature: 'reference',
  },
  caveat: 'Pin marks the farm’s civic address; fields may extend well beyond it.',
  describeFeature: (p) => {
    const s = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : '')
    const links = [
      s('website') && { label: 'Website', href: s('website') },
      s('email') && { label: s('email'), href: `mailto:${s('email')}` },
      s('phone') && { label: s('phone'), href: `tel:${s('phone').replace(/[^\d+]/g, '')}` },
    ].filter(Boolean) as { label: string; href: string }[]
    return {
      title: s('name'),
      subtitle: s('address'),
      image: s('logo') || undefined,
      text: s('description') || undefined,
      facts: [
        s('certifications') && { label: 'Certifications', value: s('certifications') },
        s('since') && { label: 'Vendor since', value: s('since') },
      ].filter(Boolean) as { label: string; value: string }[],
      links,
      note: p.approx ? 'Location is approximate: the address matched a road, not a specific property.' : undefined,
    }
  },
}
