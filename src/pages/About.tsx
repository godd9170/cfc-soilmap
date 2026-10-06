import { Link } from 'react-router'
import { LAYERS } from '../lib/layers'
import Page from './Page'

const NATURE_LABEL = {
  observed: 'Observed historical mapping',
  modeled: 'Modern modeled prediction',
  compiled: 'Compiled interpretive mapping',
  reference: 'Reference listing',
}

export default function About() {
  return (
    <Page title="About the data">
      <h1 className="font-serif text-4xl text-stone-900">About PEC Soil Explorer</h1>
      <div className="mt-4 space-y-4 text-stone-800">
        <p>
          PEC Soil Explorer puts the 1948 <cite>Soil Survey of Prince Edward County</cite> on a modern map. You can click
          anywhere in the County to see what soil the survey mapped there and what the report said about it. Modern soil,
          capability and geology datasets sit alongside it for comparison.
        </p>
        <p>
          The 1948 survey was field-mapped in the summer of 1943 by N. R. Richards and F. F. Morwick for the Ontario Soil
          Survey. It is careful observational work and remains the most detailed soil map of the County. Historical does not
          mean wrong.
        </p>
      </div>

      <section className="mt-10" aria-labelledby="principles">
        <h2 id="principles" className="font-serif text-2xl">How to read this map</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-stone-800">
          <li>
            <strong>Observed vs. modeled.</strong> The 1948 survey is <em>observed</em> historical mapping. Layers marked
            “Modeled” are statistical predictions. They are estimates, not measurements.
          </li>
          <li>
            <strong>Boundaries are approximate.</strong> Soil boundaries were drawn at 1 inch to the mile. Real soils change
            gradually, and small pockets of other soils occur inside every mapped area.
          </li>
          <li>
            <strong>Modeled values are coarse.</strong> Predicted soil grids represent areas of about 100–250 m. Conditions
            can vary a lot within a single field.
          </li>
          <li>
            <strong>Historical ratings describe 1948 farming.</strong> Crop ratings reflect the crops, equipment and practices
            of the 1940s. They say nothing about current fertility.
          </li>
          <li>
            <strong>Not advice.</strong> This tool does not give agronomic prescriptions, appraisals, legal boundaries or
            planning determinations. Confirm site-specific decisions through field observation or soil sampling.
          </li>
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="sources">
        <h2 id="sources" className="font-serif text-2xl">Datasets</h2>
        <div className="mt-4 space-y-8">
          {LAYERS.map((l) => (
            <article key={l.id} id={l.id} className="scroll-mt-20 rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-stone-900">{l.title}</h3>
              <p className="text-xs font-semibold tracking-wide text-stone-600 uppercase">
                {NATURE_LABEL[l.provenance.nature]}
              </p>
              <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
                <dt className="text-stone-600">Dataset</dt>
                <dd>{l.provenance.dataset}</dd>
                <dt className="text-stone-600">Publisher</dt>
                <dd>{l.provenance.publisher}</dd>
                <dt className="text-stone-600">Year</dt>
                <dd>{l.provenance.year}</dd>
                <dt className="text-stone-600">Resolution</dt>
                <dd>{l.provenance.resolution}</dd>
                <dt className="text-stone-600">Methodology</dt>
                <dd>{l.provenance.methodology}</dd>
                <dt className="text-stone-600">Licence</dt>
                <dd>{l.provenance.licence}</dd>
                <dt className="text-stone-600">Known limitations</dt>
                <dd>{l.provenance.limitations}</dd>
                <dt className="text-stone-600">Source</dt>
                <dd className="break-all">
                  <a href={l.provenance.url} target="_blank" rel="noreferrer" className="text-moss-700 underline">
                    {l.provenance.url}
                  </a>
                </dd>
              </dl>
            </article>
          ))}
          <article className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-stone-900">Basemap, imagery and search</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-800">
              <li>
                Streets basemap: © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>,
                served by <a className="underline" href="https://openfreemap.org">OpenFreeMap</a> (OpenMapTiles schema).
              </li>
              <li>Satellite imagery: Esri World Imagery (© Esri, Maxar, Earthstar Geographics and the GIS User Community).</li>
              <li>
                Search: <a className="underline" href="https://nominatim.org">OpenStreetMap Nominatim</a>. Searches run only
                when you submit them, as Nominatim's usage policy requires.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="method">
        <h2 id="method" className="font-serif text-2xl">How the 1948 survey was prepared</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-stone-800">
          <li>
            The soil polygons come from Agriculture and Agri-Food Canada's digitized version of the survey (CanSIS dataset
            ond170). That file puts the County exactly 6° of longitude too far west, because it was un-projected using the
            wrong UTM zone. We shift it back and convert it from NAD27 to WGS84. The digitized acreages match the 1948 legend
            to within a few percent.
          </li>
          <li>
            The printed map scan was georeferenced by fitting a second-order polynomial. The fit aligns the printed colour
            boundaries with the digitized polygons (median misfit about 20 m). The printed latitude graticule sits about 5′
            off true positions, so it was not used.
          </li>
          <li>
            Descriptions, profiles, crop ratings and management notes for each soil type were transcribed from the report and
            cross-checked against the map legend. Where the report and legend disagree, each soil's profile page notes it.
          </li>
          <li>
            Modern soil properties (clay, sand, silt and organic carbon) were baked into a 100 m grid over the County. AAFC
            Soil Landscape Grids are used where they have values, and ISRIC SoilGrids 2.0 fills the gaps. Each value is the
            depth-weighted mean of the 0–5, 5–15 and 15–30 cm predictions. The location panel names which model supplied
            each value.
          </li>
          <li>
            No scientifically defensible modeled depth-to-bedrock grid is available for Prince Edward County. Global models
            predict several metres of soil over limestone that the 1948 surveyors found within a foot of the surface. The
            depth layer therefore shows the 1948 survey's own depth classes. The Ontario Geological Survey's overburden
            thickness mapping (MRD207) is the most promising future source.
          </li>
          <li>
            The “modern plain-language interpretations” were written for this site from the report. They are kept separate
            from the historical text.
          </li>
        </ol>
        <p className="mt-4 text-sm text-stone-700">
          The processing scripts are in the project's <code>pipeline/</code> directory.
        </p>
      </section>

      <p className="mt-10">
        <Link to="/" className="font-medium text-moss-700 underline">← Back to the map</Link>
      </p>
    </Page>
  )
}
