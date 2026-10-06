"""Fetch and bake the modern (Phase 2) datasets for Prince Edward County.

Outputs in public/data/:
  grid-<prop>.png       display image (coloured, transparent where no data)
  grid-<prop>-data.png  lossless value grid: R = value * scale, G = source (1 AAFC SLGC, 2 ISRIC SoilGrids), A = valid
  grids.json            grid bounds, scales, ramps and provenance
  cli.geojson           Canada Land Inventory agricultural capability 1:250k, clipped to the county area
  geology.pmtiles       OGS surficial geology (MRD128-REV, 1:50k), clipped, as vector tiles (layer "geology")

Soil grids: AAFC Soil Landscape Grids of Canada (100 m) are preferred; they have large
no-data gaps in PEC, which are filled from ISRIC SoilGrids 2.0 (250 m, resampled to the
same 100 m grid). Values are depth-weighted means over 0-30 cm.
"""
import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

import geopandas as gpd
import numpy as np
import tifffile
from PIL import Image
from vector_tiles import geojson_to_pmtiles

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data"
BBOX = (-77.62, 43.80, -76.80, 44.20)  # lon/lat, EPSG:4326
W, H = 684, 446  # ~100 m cells
DEPTHS = [(-5, "0-5cm", 5), (-15, "5-15cm", 10), (-30, "15-30cm", 15)]  # (SLGC depth, SoilGrids depth, thickness cm)

PROPS = {
    # id: (SLGC service, SLGC variable, SoilGrids property, SoilGrids -> unit divisor, data scale, ramp, range)
    "clay": ("clay", "Clay", "clay", 10, 2, ["#fff7ec", "#fdd49e", "#fc8d59", "#d7301f", "#7f0000"], (0, 60)),
    "sand": ("sand", "Sand", "sand", 10, 2, ["#fffde0", "#f6e27a", "#d9b44a", "#a8782a", "#5c3d10"], (0, 100)),
    "silt": ("silt", "Silt", "silt", 10, 2, ["#f7fcfd", "#bfd3e6", "#8c96c6", "#88419d", "#4d004b"], (0, 80)),
    "soc": ("soil_organic_carbon", "Soil Organic Carbon", "soc", 100, 20, ["#ffffe5", "#d9f0a3", "#78c679", "#238443", "#004529"], (0, 8)),
}


def get(url: str, tries: int = 4) -> bytes:
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "pec-soil-explorer-pipeline"}), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            print("  retry", e)
            time.sleep(3 * (i + 1))
    raise RuntimeError


def slgc(service: str, variable: str, depth: int) -> np.ndarray:
    mr = urllib.parse.quote(json.dumps({"multidimensionalDefinition": [{"variableName": variable, "dimensionName": "Depth", "values": [depth]}]}))
    url = (
        f"https://agriculture.canada.ca/imagery-images/rest/services/soil_landscape_grids_100m/{service}/ImageServer/exportImage"
        f"?bbox={','.join(map(str, BBOX))}&bboxSR=4326&imageSR=4326&size={W},{H}&format=tiff&pixelType=F32"
        f"&noData=-9999&interpolation=RSP_NearestNeighbor&f=image&mosaicRule={mr}"
    )
    a = tifffile.imread(io.BytesIO(get(url))).astype(float)
    a[a <= -9998] = np.nan
    return a


def soilgrids(prop: str, depth: str, divisor: float) -> np.ndarray:
    url = (
        f"https://maps.isric.org/mapserv?map=/map/{prop}.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
        f"&COVERAGEID={prop}_{depth}_mean&FORMAT=image/tiff&SUBSET=long({BBOX[0]},{BBOX[2]})&SUBSET=lat({BBOX[1]},{BBOX[3]})"
        "&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
        f"&SCALESIZE=long({W}),lat({H})"
    )
    a = tifffile.imread(io.BytesIO(get(url))).astype(float)
    a[a <= 0] = np.nan
    return a / divisor


def weighted(layers):
    num = sum(a * t for a, t in layers)
    den = sum(t for _, t in layers)
    return num / den  # NaN if any depth missing


def ramp_rgb(values: np.ndarray, stops: list[str], lo: float, hi: float) -> np.ndarray:
    cols = np.array([[int(s[i : i + 2], 16) for i in (1, 3, 5)] for s in stops], float)
    t = np.clip((values - lo) / (hi - lo), 0, 1) * (len(stops) - 1)
    i = np.clip(np.floor(t).astype(int), 0, len(stops) - 2)
    f = (t - i)[..., None]
    return cols[i] * (1 - f) + cols[i + 1] * f


def build_grids():
    meta = {"bounds": BBOX, "width": W, "height": H, "depth": "0-30 cm (depth-weighted mean)", "props": {}}
    for pid, (svc, var, sgp, div, scale, stops, (lo, hi)) in PROPS.items():
        print("grid", pid)
        a = weighted([(slgc(svc, var, d), t) for d, _, t in DEPTHS])
        b = weighted([(soilgrids(sgp, d, div), t) for _, d, t in DEPTHS])
        src = np.where(~np.isnan(a), 1, np.where(~np.isnan(b), 2, 0))
        v = np.where(src == 1, a, b)
        valid = src > 0
        data = np.zeros((H, W, 4), np.uint8)
        data[..., 0] = np.clip(np.round(np.nan_to_num(v) * scale), 0, 254)
        data[..., 1] = src
        data[..., 3] = valid * 255
        Image.fromarray(data, "RGBA").save(OUT / f"grid-{pid}-data.png", optimize=True)
        rgb = ramp_rgb(np.nan_to_num(v), stops, lo, hi)
        disp = np.dstack([rgb, valid * 255]).astype(np.uint8)
        Image.fromarray(disp, "RGBA").save(OUT / f"grid-{pid}.png", optimize=True)
        meta["props"][pid] = {
            "scale": scale,
            "ramp": stops,
            "range": [lo, hi],
            "coverage": {"slgc": round(float((src == 1).mean()), 3), "soilgrids": round(float((src == 2).mean()), 3)},
        }
        print("  SLGC", (src == 1).mean().round(3), "SoilGrids", (src == 2).mean().round(3))
    (OUT / "grids.json").write_text(json.dumps(meta, indent=1))


def fetch_features(base: str, out_fields: str) -> gpd.GeoDataFrame:
    frames, offset = [], 0
    env = urllib.parse.quote(json.dumps({"xmin": BBOX[0], "ymin": BBOX[1], "xmax": BBOX[2], "ymax": BBOX[3], "spatialReference": {"wkid": 4326}}))
    while True:
        url = (
            f"{base}/query?geometry={env}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects"
            f"&outFields={out_fields}&outSR=4326&f=geojson&resultOffset={offset}&resultRecordCount=1000"
        )
        g = gpd.read_file(io.BytesIO(get(url)))
        if g.empty:
            break
        frames.append(g)
        offset += len(g)
        if len(g) < 1000:
            break
    import pandas as pd

    return gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), crs="EPSG:4326")


def clip(g: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    from shapely.geometry import box

    g = g.copy()
    g["geometry"] = g.geometry.make_valid().intersection(box(*BBOX))
    return g[~g.geometry.is_empty & g.geom_type.isin(["Polygon", "MultiPolygon"])]


def build_cli():
    print("cli")
    g = fetch_features(
        "https://services.arcgis.com/lGOekm0RsNxYnT3j/arcgis/rest/services/cli_agr_cap_250k/FeatureServer/0",
        "MAJOR1," + ",".join(f"CLASS_{c},SUBCLAS_{c}1,SUBCLAS_{c}2,PERCENT_{c}" for c in "ABCDEF"),
    )
    g = clip(g)
    comps = []
    for _, r in g.iterrows():
        parts = []
        for c in "ABCDEF":
            cls = str(r.get(f"CLASS_{c}") or "").strip()
            if not cls:
                continue
            sub = "".join(str(r.get(f"SUBCLAS_{c}{k}") or "").strip() for k in (1, 2))
            pct = str(r.get(f"PERCENT_{c}") or "").strip()
            parts.append({"class": cls, "sub": sub, "pct": int(pct) * 10 if pct.isdigit() else 100})
        comps.append(json.dumps(parts))
    g["components"] = comps
    g["major"] = g["MAJOR1"].astype(str).str.strip()
    g = g[["major", "components", "geometry"]]
    g["geometry"] = g.geometry.simplify(0.00005, preserve_topology=True)
    g.to_file(OUT / "cli.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
    print("  ", len(g), "polygons", g.major.value_counts().to_dict())


def build_geology():
    print("geology")
    g = fetch_features(
        "https://services2.arcgis.com/zVN3OC2fz0Sgv7ip/arcgis/rest/services/SurficialGeologyMRD128REV/FeatureServer/3",
        "UNIT,Deposit,Material,Description",
    )
    g = clip(g)
    g = g.rename(columns={"UNIT": "unit", "Deposit": "deposit", "Material": "material", "Description": "description"})
    def dedupe(v: str) -> str:  # some source strings are accidentally doubled
        v = v.strip()
        h = len(v) // 2
        return v[:h] if len(v) % 2 == 0 and v[:h] == v[h:] else v

    for c in ("unit", "deposit", "material", "description"):
        g[c] = g[c].astype(str).replace({"None": ""}).map(dedupe)
    g = g[["unit", "deposit", "material", "description", "geometry"]]
    tmp = ROOT / "data" / "geology.geojson"
    tmp.parent.mkdir(exist_ok=True)
    g.to_file(tmp, driver="GeoJSON", COORDINATE_PRECISION=6)
    geojson_to_pmtiles(tmp, OUT / "geology.pmtiles", "geology")
    print("  ", len(g), "polygons")
    print("  units", g.groupby("unit").deposit.first().to_dict())


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_grids()
    build_cli()
    build_geology()
