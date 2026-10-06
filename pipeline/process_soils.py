"""Convert the CanSIS digitized 1948 PEC soil polygons into web-ready GeoJSON.

Source: AAFC CanSIS National Soil DataBase, detailed soil survey ond170
(https://sis.agr.gc.ca/cansis/nsdb/dss/v2/on/prince_edward.zip).

Known defect in the source: coordinates were un-projected from UTM using
zone 17 instead of zone 18, which places the county exactly 6 degrees of
longitude too far west. Because UTM zones are identical apart from their
central meridian, adding 6 degrees of longitude is an exact correction.
"""
import json
from pathlib import Path

import geopandas as gpd
import pyproj
from shapely.affinity import translate

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "prince_edward"
OUT = ROOT / "public" / "data"

pyproj.network.set_network_enabled(True)  # use NTv2 grids for NAD27 -> WGS84 when available


def main():
    g = gpd.read_file(RAW / "soil.shp")
    g["geometry"] = g.geometry.apply(lambda geom: translate(geom, xoff=6.0))
    g = g.set_crs("EPSG:4267", allow_override=True).to_crs("EPSG:4326")

    sym = g["MAPUNIT"].str.replace("ONOND170", "", regex=False)
    sym = sym.replace({"": "UNK", "unclassified": "UNK", "ZZ": "W"})
    g["symbol"] = sym
    g = g[["symbol", "geometry"]]
    g = g[g.geometry.notna() & ~g.geometry.is_empty]
    # Water polygons are drawn by the basemap; keep only land units.
    land = g[g.symbol != "W"].copy()
    # Area (ha) for each polygon, computed in UTM 18N.
    land["area_ha"] = land.to_crs("EPSG:26918").area.div(10_000).round(1)
    land = land.reset_index(drop=True)
    land["id"] = land.index + 1
    # ~2 m simplification keeps fidelity to a 1:63,360 map while shrinking the file.
    land["geometry"] = land.geometry.simplify(0.00002, preserve_topology=True)

    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / "soil-1948.geojson"
    land.to_file(out, driver="GeoJSON", COORDINATE_PRECISION=5)
    print(f"wrote {out} ({out.stat().st_size/1e6:.2f} MB), {len(land)} polygons")
    print("bounds", land.total_bounds.round(4).tolist())
    print(land.symbol.value_counts().to_dict())

    # County outline = dissolved land units (incl. marsh), lightly smoothed.
    county = land[land.symbol != "UNK"].to_crs("EPSG:26918")
    outline = county.dissolve().geometry.buffer(30).buffer(-30).simplify(15).to_crs("EPSG:4326")
    gpd.GeoDataFrame(geometry=outline.boundary, crs="EPSG:4326").to_file(
        OUT / "pec-outline.geojson", driver="GeoJSON", COORDINATE_PRECISION=5
    )
    meta = {"bounds": [round(v, 5) for v in land.total_bounds.tolist()]}
    (OUT / "soil-1948.meta.json").write_text(json.dumps(meta))


if __name__ == "__main__":
    main()
