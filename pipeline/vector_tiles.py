"""Shared helper: GeoJSON -> vector PMTiles via tippecanoe (brew install tippecanoe).

Use this for any polygon layer too large to ship as one GeoJSON file. The app
reads the archive with the `pmtiles-vector` layer kind and answers clicks by
decoding the single max-zoom tile under the point (src/lib/lookup.ts), so every
feature must survive at max zoom: feature dropping is disabled.
"""
import shutil
import subprocess
from pathlib import Path


def geojson_to_pmtiles(src: Path, dst: Path, layer: str, minzoom: int = 8, maxzoom: int = 13) -> None:
    if not shutil.which("tippecanoe"):
        raise SystemExit("tippecanoe not found; install it with `brew install tippecanoe`")
    subprocess.run(
        [
            "tippecanoe", "-o", str(dst), "--force", "--quiet",
            "-l", layer, "-Z", str(minzoom), "-z", str(maxzoom),
            "--no-feature-limit", "--no-tile-size-limit", "--detect-shared-borders",
            str(src),
        ],
        check=True,
    )
    print(f"  wrote {dst} ({dst.stat().st_size / 1e6:.2f} MB)")
