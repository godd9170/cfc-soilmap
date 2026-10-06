"""Sample each soil unit's printed colour from the georeferenced 1948 scan."""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
Image.MAX_IMAGE_PIXELS = None
P = json.loads((ROOT / "pipeline/georef.json").read_text())


def to_src(lon, lat):
    u, v = (lon + 77.2) * 10, (lat - 44.0) * 10
    t = np.array([1, u, v, u * u, u * v, v * v])
    return float(np.dot(P["x"], t)), float(np.dot(P["y"], t))


def main():
    im = np.asarray(Image.open(ROOT / "data/raw/on10_map.jpg").convert("RGB"))
    g = gpd.read_file(ROOT / "public/data/soil-1948.geojson").to_crs("EPSG:26918")
    out = {}
    for sym, grp in g.groupby("symbol"):
        if sym == "UNK":
            continue
        samples = []
        for geom in grp.geometry:
            inner = geom.buffer(-40)  # stay away from boundary lines
            if inner.is_empty:
                continue
            minx, miny, maxx, maxy = inner.bounds
            rng = np.random.default_rng(0)
            pts = gpd.GeoSeries(gpd.points_from_xy(rng.uniform(minx, maxx, 60), rng.uniform(miny, maxy, 60)), crs=g.crs)
            pts = pts[pts.within(inner)].to_crs("EPSG:4326")
            for p in pts:
                x, y = to_src(p.x, p.y)
                samples.append(im[int(y) - 3:int(y) + 4, int(x) - 3:int(x) + 4].reshape(-1, 3).mean(0))
        s = np.array(samples)
        # drop dark samples (text, roads), take median of the rest
        s = s[s.sum(1) > np.percentile(s.sum(1), 30)]
        rgb = np.median(s, 0).round().astype(int)
        out[sym] = "#%02x%02x%02x" % tuple(rgb)
        print(sym, out[sym], len(samples))
    (ROOT / "src/data").mkdir(parents=True, exist_ok=True)
    (ROOT / "src/data/soil-colours.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
