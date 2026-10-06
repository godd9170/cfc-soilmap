"""Fit a lon/lat -> pixel transform for the scanned 1948 soil map.

The printed graticule is internally consistent but its latitude labels sit
roughly 5' south of true positions, so instead of trusting it we register the
scan against the CanSIS polygons (which were digitized from this same map and
are correctly located). We start from the graticule-derived scale, then fit a
2nd-order polynomial that minimises the distance from sampled polygon
boundaries to colour edges in the scan (one-sided chamfer matching).
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from PIL import Image
from scipy import ndimage, optimize

ROOT = Path(__file__).resolve().parent.parent
Image.MAX_IMAGE_PIXELS = None
DS = 4  # work at 1/4 resolution


def design(lon, lat):
    u = (lon + 77.2) * 10
    v = (lat - 44.0) * 10
    return np.stack([np.ones_like(u), u, v, u * u, u * v, v * v], 1)


def main():
    im = np.asarray(Image.open(ROOT / "data/raw/on10_map.jpg").convert("RGB"))[::DS, ::DS].astype(float)
    lab = ndimage.gaussian_filter(im, (1.2, 1.2, 0))
    grad = sum(np.hypot(ndimage.sobel(lab[..., c], 0), ndimage.sobel(lab[..., c], 1)) for c in range(3))
    edges = grad > np.percentile(grad, 88)
    dist = ndimage.distance_transform_edt(~edges)
    H, W = dist.shape

    g = gpd.read_file(ROOT / "public/data/soil-1948.geojson")
    g = g[g.symbol != "UNK"]
    pts = []
    for geom in g.boundary:
        for line in getattr(geom, "geoms", [geom]):
            n = max(2, int(line.length / 0.0015))
            pts += [line.interpolate(t, normalized=True).coords[0] for t in np.linspace(0, 1, n, endpoint=False)]
    pts = np.array(pts)
    A = design(pts[:, 0], pts[:, 1])
    print("boundary samples", len(pts))

    def cost(params, trunc=15.0):
        px, py = A @ params[:6], A @ params[6:]
        inside = (px >= 0) & (px < W - 1) & (py >= 0) & (py < H - 1)
        d = ndimage.map_coordinates(dist, [py.clip(0, H - 1), px.clip(0, W - 1)], order=1)
        d = np.where(inside, np.minimum(d, trunc), trunc)
        return d.mean()

    # Graticule: x = 510 + (lon + 77.6) * 60 * 247.6 ; y = y0 - (lat - lat0) * 60 * 348 (full-res px)
    sx, sy = 60 * 247.6 / 10 / DS, -60 * 348 / 10 / DS  # per design unit (0.1 deg)
    x0 = (510 + (-77.2 + 77.6) * 60 * 247.6) / DS
    best = None
    for dy in np.arange(-3000, 3001, 50):  # brute-force latitude offset (full-res px)
        y0 = (2922 + dy) / DS
        p = np.array([x0, sx, 0, 0, 0, 0, y0, 0, sy, 0, 0, 0])
        c = cost(p)
        if best is None or c < best[0]:
            best = (c, p)
    print("initial", best[0])
    p = best[1]
    for trunc in (15, 8, 4):
        p = optimize.minimize(lambda q: cost(q, trunc), p, method="Powell", options={"maxiter": 40000, "xtol": 1e-3}).x
        print("trunc", trunc, "cost", cost(p, trunc))
    params = (p * DS).tolist()  # back to full-resolution pixels
    out = {"order": 2, "normalize": "u=(lon+77.2)*10, v=(lat-44)*10", "x": params[:6], "y": params[6:]}
    (ROOT / "pipeline/georef.json").write_text(json.dumps(out, indent=1))
    d = ndimage.map_coordinates(dist, [A @ p[6:], A @ p[:6]], order=1) * DS
    print("median boundary->edge distance (full-res px):", np.median(d), "~", np.median(d) * 0.0254 / 300 * 63360, "m")


if __name__ == "__main__":
    main()
