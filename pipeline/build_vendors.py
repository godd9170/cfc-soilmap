"""Build the County Farm Collective vendor point layer.

Input:  a Local Line vendor export CSV (default data/raw/vendors.csv; git-ignored because it
        contains internal contact details).
Output: public/data/vendors.geojson and public/data/vendors/<slug>.png (+ -icon.png)

Only public listing columns are published (name, description, website, location, phone,
email, certifications, vendor since). Internal_* columns, contact names, tags and notes are
never written out; Internal Address is only compared against Location to flag mismatches.

Geocoding uses Prince Edward County's NG9-1-1 civic address points first (exact site
locations), then OpenStreetMap Nominatim (1 request/second) for anything without a house
number match. Results are cached in pipeline/vendors/geocodes.json. To fix a vendor by hand, add it to
pipeline/vendors/overrides.json, either with a public address (geocoded like the CSV's Location)
or with exact coordinates:
  {"Vendor name": {"address": "2252 County Rd 7, Picton, ON K0K 2T0"}}
  {"Vendor name": {"lat": 44.0, "lng": -77.1}}
  {"Vendor name": {"exclude": true}}   (leave a vendor off the map)
Logos are matched by name from the images on the County Farm Collective vendors page.
Each vendor is linked by name to its Local Line storefront vendor (id + slug, from the default
price list's products/vendors endpoint) so the app can show that vendor's products.

Run: uv run --with pillow python pipeline/build_vendors.py [path/to/export.csv]
     uv run --with pillow python pipeline/build_vendors.py --link-only   (refresh Local Line ids only)
"""
import csv
import html
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
LINK_ONLY = "--link-only" in sys.argv
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
CSV_PATH = Path(ARGS[0]) if ARGS else ROOT / "data/raw/vendors.csv"
OUT = ROOT / "public/data"
LOGO_DIR = OUT / "vendors"
CACHE = ROOT / "pipeline/vendors/geocodes.json"
OVERRIDES = ROOT / "pipeline/vendors/overrides.json"
SITE = "https://www.countyfarmcollective.com"
LOCALLINE_API = "https://localline.ca/api/storefront/v2"
LOCALLINE_SUBDOMAIN = "cfc"
UA = "pec-soil-explorer-pipeline (County Farm Collective vendor map)"
PEC_VIEWBOX = "-77.75,44.25,-76.70,43.78"
TOWNS = re.compile(r"\bpec\b|picton|prince edward|wellington|bloomfield|milford|cherry ?valley|demorestville|consecon|ameliasburgh|hillier|rossmore|cressy|waupoos|northport|carrying place", re.I)
ROAD_WORD = re.compile(r"\b(road|rd|street|st|drive|dr|lane|line|avenue|ave|way|sideroad)\b", re.I)


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("'", "").replace("’", "")).strip("-")


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", html.unescape(s).lower())


class _Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("br", "p"):
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)


def html_to_text(s: str) -> str:
    p = _Text()
    p.feed(s or "")
    text = html.unescape("".join(p.parts)).replace("\xa0", " ")
    paras = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n\n".join(x for x in paras if x)


def clean_address(addr: str) -> str:
    parts = [p.strip() for p in addr.split(",") if p.strip()]
    # Drop a leading business name ("Lamb's Quarters Farm, 240 County Road 4, ...").
    if len(parts) > 1 and not re.search(r"\d", parts[0]) and not ROAD_WORD.search(parts[0]):
        parts = parts[1:]
    a = ", ".join(parts)
    a = re.sub(r"\b(cty|county)\.?\s+rd\.?\b", "County Road", a, flags=re.I)
    a = re.sub(r"\bcty\b", "County", a, flags=re.I)
    a = re.sub(r",?\s*\bPEC\b", ", Prince Edward County", a)
    a = re.sub(r"\bPrince Edward County Road\b", "County Road", a, flags=re.I)  # "Prince Edward County Rd 16"
    # Civic addressing names each village's main street after it: "58 Main St, Picton" -> "58 Picton Main Street".
    a = re.sub(r"\b(\d+)\s+main\s+st(?:reet)?\.?\b,?\s*(picton|wellington|bloomfield)\b", lambda m: f"{m[1]} {m[2].title()} Main Street, {m[2].title()}", a, flags=re.I)
    a = re.sub(r",?\s*\bcanada\b", "", a, flags=re.I)
    if not TOWNS.search(a):
        a += ", Prince Edward County, Ontario"
    return a


def strip_postal(a: str) -> str:
    return re.sub(r"\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b\.?", "", a, flags=re.I).strip(" ,")


def nominatim(q: str) -> dict | None:
    params = urllib.parse.urlencode({"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "ca", "viewbox": PEC_VIEWBOX, "bounded": 1})
    time.sleep(1.1)  # Nominatim usage policy: max 1 request per second
    rows = json.loads(get(f"https://nominatim.openstreetmap.org/search?{params}"))
    if not rows:
        return None
    r = rows[0]
    return {"lat": float(r["lat"]), "lng": float(r["lon"]), "type": r.get("addresstype") or r.get("type"), "display": r["display_name"]}


CIVIC = "https://services1.arcgis.com/4HnHVMMKSNypEIkS/arcgis/rest/services/HostedFeatures___Property_Info/FeatureServer/0/query"
SUFFIX = {"rd": "Road", "road": "Road", "dr": "Drive", "drive": "Drive", "st": "Street", "street": "Street", "ln": "Lane", "lane": "Lane", "cres": "Crescent", "crescent": "Crescent", "ave": "Avenue", "avenue": "Avenue", "ct": "Court", "court": "Court", "line": "Line", "way": "Way"}


def civic_where(addr: str) -> str | None:
    """SQL for the County's NG9-1-1 address points, e.g. '1927 County Road 10' or '339 Elmbrook Road'."""
    m = re.match(r"\s*(\d+)\s+([^,]+)", addr)
    if not m:
        return None
    num, street = m.group(1), m.group(2).strip()
    cr = re.match(r"county road\s+(\d+)$", street, re.I)
    if cr:
        return f"Add_Number={num} AND St_PreTyp='County Road' AND St_Name='{cr.group(1)}'"
    words = street.split()
    if len(words) >= 2 and words[-1].lower().rstrip(".") in SUFFIX:
        name = " ".join(words[:-1]).replace("'", "''")
        return f"Add_Number={num} AND UPPER(St_Name)='{name.upper()}' AND St_PosTyp='{SUFFIX[words[-1].lower().rstrip('.')]}'"
    return None


def civic(addr: str) -> dict | None:
    where = civic_where(addr)
    if not where:
        return None
    params = urllib.parse.urlencode({"where": where, "outFields": "Add_Number", "outSR": 4326, "f": "json"})
    feats = json.loads(get(f"{CIVIC}?{params}")).get("features", [])
    if not feats:
        return None
    # Several structure points can share one address; use their centre.
    xs = [f["geometry"]["x"] for f in feats]
    ys = [f["geometry"]["y"] for f in feats]
    return {"lat": sum(ys) / len(ys), "lng": sum(xs) / len(xs), "type": "house", "display": f"PEC civic address ({where})"}


def geocode(addr: str, cache: dict) -> dict | None:
    q = clean_address(addr)
    if q in cache:
        return cache[q]
    result = civic(q)
    if result:
        result["query"] = q
        cache[q] = result
        return result
    attempts = [q, strip_postal(q)]
    m = re.match(r"\s*\d+\s+(.*?)(,|$)", strip_postal(q))
    if m:  # last resort: the road itself (flagged as approximate)
        attempts.append(f"{m.group(1)}, Prince Edward County, Ontario")
    result = None
    for a in dict.fromkeys(attempts):
        result = nominatim(a)
        if result:
            result["query"] = a
            break
    cache[q] = result
    return result


def scrape_logos() -> dict[str, str]:
    page = get(f"{SITE}/vendors").decode("utf-8", "replace")
    logos = {}
    for src, alt in re.findall(r'<img[^>]*src="([^"]+)"[^>]*alt="([^"]*?) logo"', page):
        logos[norm(alt)] = urllib.parse.urljoin(SITE, html.unescape(src))
    return logos


def match_logo(name: str, logos: dict[str, str]) -> str | None:
    n = norm(name)
    if n in logos:
        return logos[n]
    for k, v in logos.items():
        if k and (k in n or n in k):
            return v
    return None


def save_logo(url: str, slug: str) -> tuple[str, str]:
    im = Image.open(io.BytesIO(get(url))).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    sq = ImageOps.fit(bg, (160, 160), Image.LANCZOS)
    sq.convert("RGB").save(LOGO_DIR / f"{slug}.png", optimize=True)
    # Round map icon with a white ring, drawn at 2x for sharp display.
    size, ring = 64, 4
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    icon.paste((255, 255, 255, 255), mask=mask)
    inner = ImageOps.fit(bg, (size - 2 * ring, size - 2 * ring), Image.LANCZOS)
    imask = Image.new("L", inner.size, 0)
    ImageDraw.Draw(imask).ellipse((0, 0, inner.width - 1, inner.height - 1), fill=255)
    icon.paste(inner, (ring, ring), imask)
    ImageDraw.Draw(icon).ellipse((0, 0, size - 1, size - 1), outline=(47, 59, 42, 255), width=2)
    icon.save(LOGO_DIR / f"{slug}-icon.png", optimize=True)
    return f"/data/vendors/{slug}.png", f"/data/vendors/{slug}-icon.png"


def localline_vendors() -> dict[str, dict]:
    """Storefront vendors on the default price list, keyed by normalised name."""
    req = urllib.request.Request(
        f"{LOCALLINE_API}/token/anonymous/", data=b"{}", method="POST",
        headers={"User-Agent": UA, "Content-Type": "application/json", "Subdomain": LOCALLINE_SUBDOMAIN},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        token = json.loads(r.read())["access"]

    def api(path: str):
        req = urllib.request.Request(f"{LOCALLINE_API}/{path}", headers={"User-Agent": UA, "Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())

    # The products endpoints only accept the price list's pk, not its slug.
    price_list = api("price-lists/default/")
    rows = api(f"price-lists/{price_list['id']}/products/vendors/")["results"]
    return {norm(v["name"]): {"id": v["id"], "slug": v["slug"]} for v in rows}


def link_localline(features: list[dict], issues: list) -> None:
    try:
        ll = localline_vendors()
    except Exception as e:  # noqa: BLE001
        issues.append(("Local Line", [f"vendor lookup failed ({e}); product galleries not linked"]))
        return
    for f in features:
        p = f["properties"]
        v = ll.get(norm(p["name"]))
        p["ll_vendor_id"] = v["id"] if v else None
        p["ll_vendor_slug"] = v["slug"] if v else ""
        if not v:
            issues.append((p["name"], ["no matching vendor on the Local Line default price list, so no product gallery"]))


def house_number(a: str) -> str | None:
    m = re.search(r"\b(\d{1,5})\b", a or "")
    return m.group(1) if m else None


def link_only():
    path = OUT / "vendors.geojson"
    fc = json.loads(path.read_text())
    issues: list = []
    link_localline(fc["features"], issues)
    path.write_text(json.dumps(fc, ensure_ascii=False, indent=1))
    print(f"Linked {sum(1 for f in fc['features'] if f['properties']['ll_vendor_id'])} of {len(fc['features'])} vendors to Local Line")
    for name, probs in issues:
        print(f"- {name}: {'; '.join(probs)}")


def main():
    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    for old in LOGO_DIR.glob("*.png"):  # only publish logos for vendors that end up on the map
        old.unlink()
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    if not OVERRIDES.exists():
        OVERRIDES.write_text("{}\n")
    logos = scrape_logos()

    rows = [r for r in csv.DictReader(CSV_PATH.open(encoding="utf-8-sig")) if (r.get("Vendor") or "").strip()]
    features, issues = [], []
    for r in rows:
        name = r["Vendor"].strip()
        slug = slugify(name)
        problems = []
        if r.get("Enabled", "").strip().upper() != "Y":
            issues.append((name, ["disabled in Local Line (Enabled = N), not published"]))
            continue

        override = overrides.get(name, {})
        if override.get("exclude"):
            issues.append((name, ["excluded in pipeline/vendors/overrides.json, not published"]))
            continue
        location = (override.get("address") or r.get("Location") or "").strip()
        point, approx = None, False
        if "lat" in override and "lng" in override:
            point = {"lat": override["lat"], "lng": override["lng"]}
        elif location:
            g = geocode(location, cache)
            if g:
                point = {"lat": g["lat"], "lng": g["lng"]}
                if g["type"] not in ("house", "building", "place", "farm", "amenity", "shop", "tourism"):
                    approx = True
                    problems.append(f"address only matched to a {g['type']} (\"{g['display'][:60]}…\"), so the pin is approximate; add an override")
            else:
                problems.append(f"address \"{location}\" could not be geocoded; add an override")
        else:
            problems.append("no public address (Location is empty), so not on the map")
        if location and not TOWNS.search(location):
            problems.append(f"address \"{location}\" has no town or postal code")
        internal = (r.get("Internal Address") or "").strip()
        if location and internal and house_number(location) != house_number(internal):
            problems.append(f"Location number ({house_number(location)}) differs from Internal Address ({house_number(internal)})")

        logo_url = match_logo(name, logos)
        logo = icon = ""
        if logo_url and point:
            try:
                logo, icon = save_logo(logo_url, slug)
            except Exception as e:  # noqa: BLE001
                problems.append(f"logo download failed ({e})")
        elif not logo_url:
            problems.append("no logo on the CFC vendors page")

        email = (r.get("Email") or "").strip()
        if email.lower().endswith("@localline.ca"):
            problems.append(f"public email {email} looks like a placeholder, so it was left out")
            email = ""
        if not (r.get("Description") or "").strip():
            problems.append("no description")

        if problems:
            issues.append((name, problems))
        if not point:
            continue
        features.append(
            {
                "type": "Feature",
                "id": slug,
                "geometry": {"type": "Point", "coordinates": [round(point["lng"], 6), round(point["lat"], 6)]},
                "properties": {
                    "id": slug,
                    "name": name,
                    "description": html_to_text(r.get("Description", "")),
                    "website": (r.get("Website") or "").strip(),
                    "address": location,
                    "phone": (r.get("Phone") or "").strip(),
                    "email": email,
                    "certifications": (r.get("Certifications") or "").strip(),
                    "since": (r.get("Vendor Since") or "").strip(),
                    "logo": logo,
                    "icon": icon,
                    "approx": approx,
                },
            }
        )

    link_localline(features, issues)
    CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True) + "\n")
    (OUT / "vendors.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=1))
    print(f"\n{len(features)} of {len(rows)} vendors on the map -> public/data/vendors.geojson\n")
    print("Needs attention:")
    for name, probs in issues:
        print(f"- {name}")
        for p in probs:
            print(f"    · {p}")


if __name__ == "__main__":
    link_only() if LINK_ONLY else main()
