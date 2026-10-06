Prince Edward County Soil Explorer

Product Requirements Document

Working title: PEC Soil Explorer
Product type: Interactive web mapping application
Primary geography: Prince Edward County, Ontario
Primary historical source: 1948 Soil Survey of Prince Edward County
Status: Initial PRD
Target: Proof of concept followed by public-facing application

⸻

1. Overview

PEC Soil Explorer is an interactive geographic application that allows users to explore the soils, geology, agricultural capability, and land characteristics of Prince Edward County using both historical and modern datasets.

The core experience overlays the original 1948 Soil Survey of Prince Edward County onto a modern interactive map.

Users should be able to move around Prince Edward County, click on a location, and understand:

* what soil was mapped there in the 1948 survey;
* the characteristics of that soil;
* its historical agricultural suitability;
* its primary limitations;
* modern estimates of soil properties;
* underlying surficial geology;
* agricultural capability; and
* where historical and modern datasets agree or differ.

The application should turn difficult-to-use historical soil survey information into an accessible geographic tool useful to farmers, landowners, researchers, planners, gardeners, and residents.

⸻

2. Problem

Prince Edward County has unusually variable agricultural soils.

Shallow limestone bedrock, glacial deposits, clay plains, sandy areas, wetlands, and localized deeper soils can produce dramatically different growing conditions over short distances.

The most detailed traditional soil survey of Prince Edward County dates from 1948.

Although it contains considerable agricultural and geological information, it is difficult to use today because:

* the primary soil map is a static historical document;
* users cannot easily determine which soil corresponds to a modern property or location;
* descriptions are separated from the geography;
* modern roads, parcels, satellite imagery, and landmarks are not visible;
* historical classifications are difficult to compare with modern soil and geological datasets;
* the information is difficult for non-specialists to interpret.

At the same time, newer Canadian and Ontario datasets provide information such as predicted soil texture, depth to bedrock, agricultural capability, and surficial geology.

These datasets exist independently and are difficult for an average user to compare.

PEC Soil Explorer should bring them together into one interface.

⸻

3. Product Vision

Create the definitive public interactive soil map for Prince Edward County.

A user should be able to click anywhere in the County and quickly understand:

What is happening beneath my feet, and what does that mean for farming here?

The product should retain the historical value of the original survey while adding modern geographic context and newer datasets.

⸻

4. Goals

4.1 Primary Goals

Make the 1948 soil survey geographically usable

Overlay the original soil mapping onto a modern basemap and allow users to identify historical soil types by location.

Convert historical soil information into structured data

Each mapped soil unit should connect to meaningful information extracted from the report.

Compare historical and modern soil information

Allow users to view modern predictive soil properties and land capability alongside historical soil classifications.

Support practical agricultural understanding

Translate technical soil data into understandable implications for:

* crop production;
* drainage;
* moisture retention;
* soil depth;
* fertility;
* erosion;
* root development;
* pasture;
* orchards;
* vegetable production.

Preserve provenance

Every data point should clearly identify its source, date, and level of certainty.

⸻

5. Non-Goals

The initial product will not:

* provide agronomic prescriptions;
* tell farmers exactly what crop they should plant;
* replace professional soil testing;
* provide exact parcel-level legal boundaries;
* make guarantees about soil depth at a specific point;
* infer current fertility from historical classifications;
* serve as a land appraisal tool;
* provide official planning or zoning determinations;
* replace field observations or soil sampling.

Modern predictive soil maps must be presented as estimates rather than ground truth.

⸻

6. Target Users

6.1 Farmers

Farmers evaluating:

* new fields;
* crop suitability;
* drainage;
* shallow soil;
* moisture retention;
* land purchases;
* field variability.

6.2 Market Gardeners

Small-scale growers interested in:

* soil texture;
* depth;
* drainage;
* organic matter;
* horticultural suitability.

6.3 Landowners

People curious about the physical characteristics of their property.

6.4 Prospective Land Buyers

Users performing early-stage agricultural due diligence.

6.5 Researchers and Students

Users studying:

* agriculture;
* geology;
* geography;
* environmental history;
* land use.

6.6 Municipal and Community Organizations

Groups interested in preserving agricultural land or understanding County land resources.

6.7 General Public

Residents interested in the agricultural and natural history of Prince Edward County.

⸻

7. Core User Stories

Historical Soil Map

As a user, I want to pan and zoom around Prince Edward County so I can explore soils in places I recognize.

As a user, I want to enable the 1948 Soil Survey layer so I can see historical soil classifications.

As a user, I want to control the opacity of the historical layer so I can compare it with modern roads and landmarks.

As a user, I want to click a soil area and see its soil series and texture.

As a user, I want to read the original report’s description of that soil.

⸻

Modern Data

As a farmer, I want to see modeled depth to bedrock so I can identify areas likely to have shallow rooting depth.

As a grower, I want to view predicted clay, sand, and silt content.

As a landowner, I want to compare historical soil classifications with modern modeled soil properties.

As a user, I want to see Canada’s agricultural capability classification for a location.

As a user, I want to understand the underlying geology that contributes to the soil.

⸻

Location Discovery

As a user, I want to search for an address or place name.

As a user, I want to click the map and get information for that exact location.

As a farmer, I want to save or share a link to a particular location.

⸻

8. Core Product Experience

The primary interface consists of:

1. interactive map;
2. layer selector;
3. location search;
4. map legend;
5. soil information panel;
6. source and methodology information.

The map should occupy most of the screen.

On desktop, selecting a location opens a persistent side panel.

On mobile, the information panel opens as a bottom sheet.

⸻

9. Map Layers

9.1 Basemap

The application should support at minimum:

Streets

OpenStreetMap-derived cartography.

Displays:

* roads;
* towns;
* water;
* geographic labels;
* landmarks.

Satellite

Optional satellite imagery should be considered for Phase 2.

This is particularly useful to farmers because field boundaries and land use become visible.

⸻

10. Historical Soil Survey Layer

The defining feature of the product.

10.1 Source

1948 Soil Survey of Prince Edward County.

The application should support two representations.

Original Map Overlay

A georeferenced raster representation of the original printed map.

Purpose:

* preserve historical presentation;
* allow direct comparison with the original document;
* validate vectorization;
* provide an initial implementation while vector conversion is underway.

The layer should include an opacity slider.

⸻

10.2 Vector Soil Layer

The preferred long-term representation.

Historical soil boundaries should be represented as geographic polygons.

Potential sources, in order of preference:

1. existing Ontario digital soil polygons that preserve historical PEC mapping;
2. AAFC soil GIS data;
3. semi-automatic vectorization of the historical survey;
4. manual tracing where necessary.

Each polygon should contain structured attributes.

Example:

{
  "soil_series": "Farmington",
  "texture": "Loam",
  "symbol": "Fa",
  "drainage": "Well drained",
  "parent_material": "Shallow calcareous till",
  "bedrock": "Limestone",
  "historical_crop_rating": "Fair to poor",
  "primary_limitation": "Shallow soil",
  "survey_year": 1948
}

⸻

11. Modern Soil Layers

Modern soil information should appear as optional layers rather than replacing the historical mapping.

11.1 Predicted Depth to Bedrock

One of the highest-value modern layers for Prince Edward County.

Display predicted depth to bedrock using a continuous colour scale.

Possible classifications:

* 0–25 cm;
* 25–50 cm;
* 50–100 cm;
* 100–200 cm;
* 200 cm.

Exact breaks should ultimately reflect source data and UX testing.

⸻

11.2 Clay Content

Predicted clay percentage.

Available by soil depth where supported.

Suggested initial depth:

0–30 cm.

Future users may select additional depth intervals.

⸻

11.3 Sand Content

Predicted sand percentage.

⸻

11.4 Silt Content

Predicted silt percentage.

⸻

11.5 Soil Organic Carbon

Display predicted soil organic carbon where available.

Care must be taken not to imply this is equivalent to a recent field soil test.

⸻

11.6 Additional Soil Properties

Potential future layers:

* bulk density;
* pH;
* available water capacity;
* drainage likelihood;
* soil moisture;
* topographic wetness.

Only scientifically defensible datasets should be included.

⸻

12. Agricultural Capability Layer

Include Canada Land Inventory agricultural capability mapping.

Display:

* capability class;
* subclass;
* limiting factor.

Example:

Class 3R

Meaning:

* moderate agricultural limitations;
* restricted by shallow soil over bedrock.

The UI should translate classification codes into plain English.

⸻

13. Surficial Geology Layer

Provide Ontario surficial geology as a selectable map layer.

Examples may include:

* limestone bedrock;
* glacial till;
* clay deposits;
* sand;
* gravel;
* organic deposits;
* exposed bedrock.

This helps users understand why soil characteristics vary.

⸻

14. Location Information Panel

Clicking anywhere on the map should produce a consolidated location summary.

Example:

Selected Location

Historical soil

Hillier Clay Loam

1948 Soil Survey

Drainage: Good
Soil depth: Shallow
Parent material: Calcareous till over limestone
Historical crop rating: Good to fair

Primary limitation

Shallow bedrock limits rooting depth and water storage.

⸻

Modern modeled properties

Depth to bedrock
32 cm

Clay
36%

Sand
28%

Silt
36%

Values should state:

Modeled estimate. Conditions may vary substantially within a field.

⸻

Agricultural capability

Class 3R

Moderate limitations due to restricted soil depth.

⸻

Surficial geology

Shallow glacial deposits over limestone bedrock.

⸻

Source

1948 Soil Survey of Prince Edward County
AAFC Soil Landscape Grids
Canada Land Inventory
Ontario Geological Survey

⸻

15. Soil Series Profiles

Every historical soil series should have its own profile.

Example URL:

/soil/farmington-loam

Profiles should contain:

* soil series name;
* map symbol;
* texture;
* parent material;
* drainage;
* typical soil profile;
* depth characteristics;
* historical agricultural suitability;
* historical crops;
* common limitations;
* historical management recommendations;
* acreage reported in 1948;
* photograph or diagram where possible;
* locations where the soil occurs;
* citation to original report pages.

The profile should distinguish historical observations from modern interpretation.

⸻

16. Interpretation Layer

Raw terminology should be complemented by modern plain-language explanations.

Example:

Historical wording

“Fair to poor crop land.”

Plain-language interpretation

Farmington soils can support agriculture but are frequently restricted by shallow limestone bedrock. Limited rooting depth also reduces the amount of water available to crops during dry summer conditions.

Interpretations must avoid overstating certainty.

⸻

17. Historical vs Modern Comparison

One of the most valuable features should be the ability to compare datasets.

A location could show:

Dataset	Result
1948 soil survey	Farmington Loam
Predicted bedrock depth	27 cm
Predicted clay	31%
Agricultural capability	3R
Surficial geology	shallow till over limestone

This allows users to understand whether modern information supports the original survey interpretation.

⸻

18. Layer Controls

Users should be able to enable and disable datasets independently.

Example:

Historical

* 1948 Soil Survey
* Original 1948 Map

Soil Properties

* Depth to bedrock
* Clay %
* Sand %
* Silt %
* Organic carbon

Land

* Agricultural capability
* Surficial geology

Reference

* Roads
* Place labels
* Satellite

Each active thematic layer should display a legend.

⸻

19. Opacity Controls

Layers should support opacity adjustment.

This is particularly important for:

* historical survey raster;
* soil polygons;
* geology;
* agricultural capability;
* satellite comparison.

Recommended interaction:

1948 Soil Survey
────────────●────
          70%

⸻

20. Search

Users should be able to search for:

* street addresses;
* towns;
* roads;
* landmarks;
* farms where publicly indexed.

Search should geocode the location and centre the map.

Possible implementation:

OpenStreetMap Nominatim or another geocoder with suitable usage terms.

⸻

21. Shareable Locations

Map state should be encoded into the URL.

Example:

/?lat=44.032&lng=-77.061&zoom=14&layers=soil1948,bedrock

This allows users to send another person a link to exactly what they are viewing.

⸻

22. Map Technology

Recommended stack

MapLibre GL JS

Primary map rendering library.

Reasons:

* open source;
* strong vector tile support;
* excellent interaction performance;
* support for raster overlays;
* GeoJSON support;
* styling support;
* works well with OpenStreetMap-derived basemaps;
* avoids dependency on proprietary Google Maps APIs.

⸻

Why Not D3 as the Main Map Engine

D3 is excellent for:

* charts;
* custom visualizations;
* legends;
* graphical analysis.

It is not ideal as the primary interactive geographic map renderer.

MapLibre should handle:

* panning;
* zooming;
* vector tiles;
* raster layers;
* geographic projection;
* interactions.

D3 can optionally supplement MapLibre for specialized charts.

⸻

23. Geographic Data Formats

GeoJSON

Use for:

* prototypes;
* individual soil polygons;
* small datasets;
* exports;
* development.

GeoJSON is human-readable and easy to work with.

⸻

GeoPackage

Recommended source/archive format for GIS datasets.

Useful for:

* QGIS editing;
* spatial processing;
* dataset preservation.

⸻

PMTiles

Recommended production distribution format for larger vector layers.

Advantages:

* static hosting;
* efficient viewport-based loading;
* no dedicated tile server required;
* well suited to MapLibre.

Preferred architecture:

GeoPackage → processing → PMTiles → browser

⸻

GeoTIFF / Raster Tiles

Use for:

* predicted soil grids;
* original georeferenced historical survey;
* continuous soil-property surfaces.

Large rasters should be converted into appropriate web tiles or cloud-optimized GeoTIFF workflows.

⸻

24. Data Processing Pipeline

Historical Survey Pipeline

Step 1

Acquire highest-resolution historical map.

Step 2

Georeference historical image.

Use known geographic control points such as:

* shoreline features;
* road intersections;
* settlement centres;
* bridges;
* concession roads.

Step 3

Assess distortion.

Historical maps may contain nonuniform distortion.

If required, use polynomial or spline transformation rather than simple affine alignment.

Step 4

Compare against existing digital Ontario soil polygons.

Step 5

Reuse existing geometry wherever reliable.

Step 6

Digitize missing or inaccurate areas.

Step 7

Associate polygon symbols with soil series metadata.

Step 8

Validate using historical raster.

⸻

25. Historical Report Data Extraction

The written report should be converted into structured data.

Proposed schema:

SoilSeries
id
name
map_symbol
texture
parent_material
drainage
topography
bedrock
soil_depth
surface_soil_description
subsoil_description
historical_crop_rating
historical_crops
limitations
management_recommendations
acreage
report_page_start
report_page_end
source_year

Where multiple soil phases exist, they should be represented separately.

⸻

26. Data Provenance

Every dataset must clearly expose:

* publisher;
* dataset name;
* publication year;
* resolution;
* methodology;
* source link;
* licensing;
* known limitations.

Users should be able to distinguish:

observed historical mapping

from:

modern modeled predictions.

This distinction is critical.

⸻

27. Confidence and Accuracy

The application should explicitly communicate spatial uncertainty.

Examples:

Historical polygon

Boundary interpreted from a historical soil survey. Actual soil transitions may occur gradually.

Predictive soil grid

Estimated from a statistical soil model at approximately 100 m resolution. This value should not be interpreted as a direct field measurement.

Property use

Site-specific decisions should be confirmed through field observation or soil sampling.

⸻

28. Mobile Experience

The application should function well in the field.

Mobile requirements:

* touch-friendly map controls;
* location button where browser permission is granted;
* bottom-sheet location details;
* large layer toggles;
* searchable locations;
* share link;
* clear legend.

A farmer standing in a field should be able to open the application and see the mapped soil beneath them.

⸻

29. Desktop Experience

Desktop should optimize comparison and exploration.

Recommended layout:

┌──────────────────────────────────────────────────────┐
│ PEC Soil Explorer      Search...        About        │
├───────────┬──────────────────────────────┬────────────┤
│ Layers    │                              │ Location   │
│           │                              │ Details    │
│ 1948 ☑    │             MAP              │            │
│ Bedrock ☐ │                              │ Farmington │
│ Clay ☐    │                              │ Loam       │
│ CLI ☐     │                              │            │
│           │                              │ ...        │
└───────────┴──────────────────────────────┴────────────┘

⸻

30. Visual Design

The product should feel:

* scientific;
* agricultural;
* calm;
* historical without feeling old;
* practical rather than academic.

Map colours should prioritize clarity.

Historical soil colours should reference the original survey palette where practical.

Modern layers should use distinct, accessible colour scales.

Avoid excessive simultaneous overlays.

⸻

31. Performance

Target map interaction should feel immediate.

Requirements:

* map begins rendering within approximately 2 seconds on broadband;
* panning should remain smooth;
* vector datasets should load by viewport;
* large GeoJSON files should not be downloaded wholesale;
* raster layers should use tiled delivery;
* mobile use should remain practical on rural connections.

PMTiles or equivalent vector tiling is strongly recommended.

⸻

32. Accessibility

Requirements:

* keyboard-accessible controls;
* sufficient contrast;
* avoid relying exclusively on colour;
* textual descriptions of map classifications;
* screen-reader-friendly information panels;
* responsive font sizing.

⸻

33. Recommended Application Architecture

Frontend

Possible stack:

* React;
* TypeScript;
* Vite or Next.js;
* MapLibre GL JS;
* Tailwind CSS.

A fully static deployment should remain possible.

⸻

Data Storage

Structured soil descriptions can initially live as:

* JSON;
* SQLite;
* PostgreSQL/PostGIS.

For a first public release, a server database may not be necessary.

Static assets could include:

/public/data/
  soil-series.json
  soil-1948.pmtiles
  cli.pmtiles
  geology.pmtiles
  historical-map/

⸻

Backend

The MVP may require little or no application backend.

A backend becomes useful for:

* saved locations;
* user accounts;
* annotations;
* custom farm boundaries;
* analytics;
* uploaded soil tests.

These should not block the initial launch.

⸻

34. Suggested Hosting

A simple production architecture could be:

Application

Vercel or Cloudflare Pages.

Vector tiles

PMTiles stored in:

* Cloudflare R2;
* S3-compatible storage;
* static CDN.

Raster tiles

Cloud-optimized files or pre-generated tiles served from object storage/CDN.

This architecture minimizes infrastructure and operating costs.

⸻

35. MVP

The MVP should prove the core concept.

MVP Features

Map

* interactive OpenStreetMap basemap;
* PEC boundary;
* road/place labels.

Historical Mapping

* georeferenced 1948 raster;
* opacity slider;
* vector soil polygons if existing digital geometry can be identified.

Soil Lookup

Click map to display:

* soil series;
* texture;
* drainage;
* historical agricultural rating;
* primary limitation;
* original report description.

Search

Address/place search.

Sharing

URL retains map location.

Documentation

About page explaining sources and limitations.

⸻

36. MVP Success Criterion

A user should be able to enter a modern Prince Edward County address and answer:

What soil did the 1948 survey identify here, and what did the survey say about it?

If the application does that accurately and intuitively, the MVP succeeds.

⸻

37. Phase 2

Add modern datasets.

Features:

* predicted depth to bedrock;
* clay percentage;
* sand percentage;
* silt percentage;
* agricultural capability;
* surficial geology;
* satellite basemap;
* historical vs modern comparison panel.

⸻

38. Phase 3

Add advanced agricultural tools.

Possible features:

Draw a Farm

Users draw or upload a field/property boundary.

The application calculates:

* soil-series composition;
* average modeled bedrock depth;
* texture distribution;
* capability classes.

Example:

Your selected 23-acre field consists of approximately:

61% Hillier Clay Loam
29% Farmington Loam
10% exposed/shallow bedrock area

⸻

Field Summary

Generate a printable or shareable farm soil report.

⸻

Elevation and Slope

Add DEM-derived:

* elevation;
* slope;
* aspect;
* drainage indicators.

⸻

Soil Sampling

Allow users to record soil test locations.

These remain private unless deliberately shared.

⸻

39. Phase 4 Opportunities

Potential longer-term features:

* historical aerial imagery;
* historical land use;
* groundwater mapping;
* wetness modeling;
* agricultural tile drainage;
* watershed boundaries;
* frost-risk mapping;
* climate normals;
* drought vulnerability;
* vineyard suitability;
* vegetable-production suitability;
* tree-fruit suitability;
* pasture suitability.

These would turn the application into a broader PEC agricultural land intelligence platform.

⸻

40. Research Questions to Resolve Before Development

The following questions should be answered during technical discovery.

Historical polygons

Do Ontario’s existing soil GIS datasets contain the same PEC boundaries as the 1948 survey?

If yes, manual digitization may be largely unnecessary.

Historical raster

What is the highest-resolution version of the soil map available?

Coordinate reference

What projection was used on the original map?

Modern soil grids

Can AAFC soil prediction layers be distributed or consumed directly through public web services?

Licensing

What attribution and redistribution requirements apply to each dataset?

Soil descriptions

Can soil-series descriptions be reliably extracted from the report into structured records?

⸻

41. Key Technical Risk

The largest uncertainty is not application development.

It is historical geographic data preparation.

Specifically:

* matching old map geometry to modern geography;
* determining whether existing digitized polygons preserve the historical survey;
* resolving inconsistent soil symbols;
* handling historical map distortion;
* ensuring soil descriptions map correctly to polygons.

A discovery phase should resolve this before substantial frontend work.

⸻

42. Suggested Discovery Spike

Before building the full application, complete one representative area.

Recommended pilot area:

Cressy / southeastern Prince Edward County.

The spike should:

1. obtain the historical map;
2. obtain modern soil GIS data;
3. compare polygon boundaries;
4. georeference the historical map;
5. extract soil descriptions;
6. create a MapLibre prototype;
7. overlay historical soils on OpenStreetMap;
8. support click-to-identify soil;
9. add one modern dataset, ideally depth to bedrock.

This will determine whether the concept scales easily to the entire County.

⸻

43. Prototype Acceptance Criteria

The prototype is successful when:

* historical soil boundaries align plausibly with modern geography;
* at least three distinct soil types can be identified;
* clicking a polygon displays correct historical information;
* users can fade the historical map against OpenStreetMap;
* modern depth-to-bedrock data can be displayed in the same coordinate system;
* the application performs smoothly in a modern browser.

⸻

44. Product Principles

Show the Source

Users should always know where information came from.

Historical Does Not Mean Wrong

The 1948 survey is valuable observational data and should be treated respectfully rather than dismissed because of its age.

Modeled Does Not Mean Measured

Modern predictive maps should never appear more precise than they actually are.

Geography First

The central interaction is always the map.

Explain, Don’t Overwhelm

Scientific classifications should be translated into understandable language.

Keep the Raw Data Accessible

Advanced users should still be able to see original codes, classifications, and sources.

⸻

45. Long-Term Vision

PEC Soil Explorer begins as a digital reconstruction of an important historical agricultural survey.

Over time it could become a comprehensive agricultural land intelligence tool for Prince Edward County.

A farmer considering a new field could eventually select the land and immediately see:

* historical soil type;
* soil depth;
* texture;
* geology;
* slope;
* drainage;
* agricultural capability;
* historical land use;
* moisture constraints;
* relevant climate characteristics.

The value of the product is not any single dataset.

The value is making 80 years of land knowledge spatially comparable in one place.

At its best, the product should help people understand why agriculture works differently from one field to the next—and why Prince Edward County’s unusual limestone landscape produces both its agricultural opportunities and its limitations.
