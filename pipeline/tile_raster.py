"""Warp the scanned 1948 map into Web Mercator WebP tiles packed as PMTiles.

Uses the polynomial fitted by georef_fit.py (lon/lat WGS84 -> scan pixel).
Pixels outside the map neatline are transparent.
"""
import io
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from pmtiles.tile import Compression, TileType, zxy_to_tileid
from pmtiles.writer import Writer

ROOT = Path(__file__).resolve().parent.parent
Image.MAX_IMAGE_PIXELS = None
MINZ, MAXZ = 8, 14
NEAT = (515, 840, 11893, 8142)  # inner neatline in scan pixels (x0, y0, x1, y1)
BOUNDS = (-77.62, 43.80, -76.80, 44.20)  # lon/lat area to tile

P = json.loads((ROOT / "pipeline/georef.json").read_text())
PX, PY = np.array(P["x"]), np.array(P["y"])


def to_src(lon, lat):
    u, v = (lon + 77.2) * 10, (lat - 44.0) * 10
    terms = [np.ones_like(u), u, v, u * u, u * v, v * v]
    return sum(c * t for c, t in zip(PX, terms)), sum(c * t for c, t in zip(PY, terms))


def tile_range(z):
    def xy(lon, lat):
        n = 2**z
        x = (lon + 180) / 360 * n
        y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
        return int(x), int(y)
    x0, y0 = xy(BOUNDS[0], BOUNDS[3])
    x1, y1 = xy(BOUNDS[2], BOUNDS[1])
    return range(x0, x1 + 1), range(y0, y1 + 1)


def main():
    src = Image.open(ROOT / "data/raw/on10_map.jpg").convert("RGB")
    # Pyramid so low zooms sample a pre-filtered image (avoids aliasing).
    pyramid = {1: np.asarray(src)}
    for f in (2, 4, 8, 16, 32):
        pyramid[f] = np.asarray(src.resize((src.width // f, src.height // f), Image.LANCZOS))
    src_mpp = 1336.0 / 247.6  # metres per scan pixel (1' lon at 44N over 247.6 px)

    out = ROOT / "public/data/soil-1948-scan.pmtiles"
    count = 0
    with open(out, "wb") as fh:
        w = Writer(fh)
        for z in range(MINZ, MAXZ + 1):
            out_mpp = 156543.03 * math.cos(math.radians(44)) / 2**z
            f = max(k for k in pyramid if k <= max(1, out_mpp / src_mpp))
            img = pyramid[f]
            H, W = img.shape[:2]
            xs, ys = tile_range(z)
            for tx in xs:
                for ty in ys:
                    n = 2**z
                    px = (tx + (np.arange(256) + 0.5) / 256) / n
                    py = (ty + (np.arange(256) + 0.5) / 256) / n
                    lon = px * 360 - 180
                    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * py))))
                    LON, LAT = np.meshgrid(lon, lat)
                    sx, sy = to_src(LON, LAT)
                    valid = (sx >= NEAT[0]) & (sx < NEAT[2]) & (sy >= NEAT[1]) & (sy < NEAT[3])
                    if not valid.any():
                        continue
                    # bilinear sample at pyramid level f
                    fx, fy = sx / f - 0.5, sy / f - 0.5
                    x0 = np.clip(np.floor(fx).astype(int), 0, W - 2)
                    y0 = np.clip(np.floor(fy).astype(int), 0, H - 2)
                    ax = np.clip(fx - x0, 0, 1)[..., None]
                    ay = np.clip(fy - y0, 0, 1)[..., None]
                    rgb = (
                        img[y0, x0] * (1 - ax) * (1 - ay) + img[y0, x0 + 1] * ax * (1 - ay)
                        + img[y0 + 1, x0] * (1 - ax) * ay + img[y0 + 1, x0 + 1] * ax * ay
                    )
                    rgba = np.dstack([rgb, valid * 255.0]).astype(np.uint8)
                    buf = io.BytesIO()
                    Image.fromarray(rgba, "RGBA").save(buf, "WEBP", quality=72, method=4)
                    w.write_tile(zxy_to_tileid(z, tx, ty), buf.getvalue())
                    count += 1
            print("zoom", z, "done", count)
        w.finalize(
            {
                "tile_type": TileType.WEBP,
                "tile_compression": Compression.NONE,
                "min_zoom": MINZ,
                "max_zoom": MAXZ,
                "min_lon_e7": int(BOUNDS[0] * 1e7), "min_lat_e7": int(BOUNDS[1] * 1e7),
                "max_lon_e7": int(BOUNDS[2] * 1e7), "max_lat_e7": int(BOUNDS[3] * 1e7),
                "center_zoom": 10,
                "center_lon_e7": int(-77.2 * 1e7), "center_lat_e7": int(44.0 * 1e7),
            },
            {
                "name": "Soil Map of Prince Edward County (1948)",
                "attribution": "Soil Survey Report No. 10, 1948 (Richards & Morwick). Scan: AAFC CanSIS.",
            },
        )
    print(f"wrote {out} ({out.stat().st_size/1e6:.1f} MB, {count} tiles)")


if __name__ == "__main__":
    main()
