from __future__ import annotations

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from score_model import score_restaurants

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
RAW_PATH = DATA_DIR / "raw_snapshot.json"
SCORES_PATH = DATA_DIR / "restaurant_scores.json"
TIKTOK_DIR = DATA_DIR / "tiktok"
UA = "RestaurantHypeMap/0.6 (+https://github.com/riyagoelrs/business-ideas)"

BELI_LISTS = [
    ("Burger", "https://beliapp.com/nyc-burger-search"),
    ("Italian Sandwich", "https://beliapp.com/nyc-italian-sandwich-search"),
]
OVERPASS_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"

CITY_BBOXES = {
    "New York, NY": (40.49, -74.27, 40.92, -73.68),
    "Los Angeles, CA": (33.70, -118.67, 34.34, -118.15),
    "Chicago, IL": (41.64, -87.94, 42.03, -87.52),
    "Houston, TX": (29.52, -95.82, 30.12, -95.01),
    "Phoenix, AZ": (33.28, -112.32, 33.72, -111.91),
    "Philadelphia, PA": (39.86, -75.28, 40.14, -74.96),
    "San Antonio, TX": (29.20, -98.80, 29.70, -98.25),
    "San Diego, CA": (32.53, -117.30, 32.97, -116.93),
    "Dallas, TX": (32.62, -97.03, 33.02, -96.55),
    "San Jose, CA": (37.12, -122.08, 37.47, -121.70),
    "Austin, TX": (30.10, -97.95, 30.52, -97.56),
    "Jacksonville, FL": (30.10, -82.05, 30.60, -81.35),
    "Fort Worth, TX": (32.55, -97.55, 33.02, -97.10),
    "Columbus, OH": (39.80, -83.20, 40.15, -82.80),
    "Indianapolis, IN": (39.60, -86.35, 39.93, -85.95),
    "Charlotte, NC": (35.05, -81.02, 35.38, -80.66),
    "San Francisco, CA": (37.70, -122.53, 37.84, -122.35),
    "Seattle, WA": (47.48, -122.46, 47.75, -122.22),
    "Denver, CO": (39.61, -105.15, 39.86, -104.73),
    "Washington, DC": (38.79, -77.15, 39.00, -76.91),
    "Nashville, TN": (35.98, -87.02, 36.35, -86.55),
    "Oklahoma City, OK": (35.30, -97.75, 35.65, -97.30),
    "El Paso, TX": (31.62, -106.65, 31.90, -106.30),
    "Boston, MA": (42.23, -71.19, 42.43, -70.94),
    "Portland, OR": (45.43, -122.83, 45.65, -122.50),
    "Las Vegas, NV": (36.02, -115.35, 36.32, -114.98),
    "Detroit, MI": (42.20, -83.28, 42.48, -82.91),
    "Memphis, TN": (34.98, -90.22, 35.28, -89.80),
    "Louisville, KY": (38.10, -85.95, 38.40, -85.55),
    "Baltimore, MD": (39.20, -76.75, 39.38, -76.48),
    "Milwaukee, WI": (42.90, -88.08, 43.19, -87.80),
    "Albuquerque, NM": (34.95, -106.82, 35.22, -106.48),
    "Tucson, AZ": (32.07, -111.13, 32.36, -110.80),
    "Fresno, CA": (36.60, -119.95, 36.90, -119.65),
    "Sacramento, CA": (38.45, -121.65, 38.72, -121.35),
    "Kansas City, MO": (38.90, -94.78, 39.30, -94.38),
    "Atlanta, GA": (33.60, -84.55, 33.90, -84.25),
    "Miami, FL": (25.63, -80.35, 25.90, -80.08),
    "New Orleans, LA": (29.84, -90.20, 30.08, -89.92),
    "Cleveland, OH": (41.38, -81.85, 41.62, -81.55),
    "Pittsburgh, PA": (40.32, -80.13, 40.55, -79.84),
}


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA})
    return s


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def city_slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (s or "").lower()).strip("_")


def row_key(city: str, name: str) -> str:
    return f"{slug(city)}|{slug(name)}"


def num(v) -> Optional[float]:
    try:
        return float(str(v).replace(",", ""))
    except Exception:
        return None


def parse_dt(value: str) -> Optional[datetime]:
    if not value:
        return None
    for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def requested_cities() -> List[str]:
    raw = os.getenv("HYPE_CITIES", "").strip()
    if raw:
        cities = [c.strip() for c in raw.split("|") if c.strip() in CITY_BBOXES]
        if cities:
            return cities
    return ["New York, NY"]


def load_previous_rows() -> List[dict]:
    try:
        rows = json.loads(RAW_PATH.read_text()) if RAW_PATH.exists() else []
        return rows if isinstance(rows, list) else []
    except Exception:
        return []


def load_previous_map(rows: List[dict]) -> Dict[str, dict]:
    return {
        row_key(r.get("city") or "New York, NY", r.get("name") or ""): r
        for r in rows
        if r.get("name")
    }


def fetch_osm_city(city: str, limit: int = 500) -> List[dict]:
    s, w, n, e = CITY_BBOXES[city]
    q = (
        f'[out:json][timeout:35];('
        f'nwr["amenity"="restaurant"]["name"]({s},{w},{n},{e});'
        f'nwr["amenity"="fast_food"]["name"]({s},{w},{n},{e});'
        f');out center tags qt {limit};'
    )
    payload = None
    for ep in OVERPASS_ENDPOINTS:
        try:
            r = session().get(ep, params={"data": q}, timeout=50)
            r.raise_for_status()
            payload = r.json()
            break
        except Exception:
            pass
    if not payload:
        return []

    rows, seen = [], set()
    for el in payload.get("elements", []):
        tags = el.get("tags") or {}
        name = tags.get("name")
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lng = el.get("lon") or (el.get("center") or {}).get("lon")
        if not name or lat is None or lng is None:
            continue
        key = f"{slug(name)}|{float(lat):.4f}|{float(lng):.4f}"
        if key in seen:
            continue
        seen.add(key)
        website = tags.get("website") or tags.get("contact:website")
        rows.append(
            {
                "name": name,
                "city": city,
                "lat": float(lat),
                "lng": float(lng),
                "cuisine": tags.get("cuisine"),
                "website": website,
                "sources": {
                    "osm": {
                        "osm_id": f"{el.get('type')}:{el.get('id')}",
                        "website": website,
                        "cuisine": tags.get("cuisine"),
                    }
                },
            }
        )
    return rows


def fetch_osm_universe(cities: List[str]) -> List[dict]:
    out: List[dict] = []
    with ThreadPoolExecutor(max_workers=min(4, len(cities))) as ex:
        futures = {ex.submit(fetch_osm_city, city): city for city in cities}
        for f in as_completed(futures):
            city = futures[f]
            try:
                rows = f.result()
                out.extend(rows)
                print(f"osm {city}: {len(rows)}")
            except Exception:
                print(f"osm {city}: failed")
    return out


def fetch_beli() -> List[dict]:
    out = []
    for category, url in BELI_LISTS:
        try:
            r = session().get(url, timeout=20)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
        except Exception:
            continue
        found, seen = [], set()
        for h in soup.find_all(["h2", "h3"]):
            name = h.get_text(" ", strip=True)
            block = (
                h.find_next(string=re.compile(r"Beli rating:\s*\d+(?:\.\d+)?", re.I))
                if name
                else None
            )
            m = (
                re.search(r"Beli rating:\s*(\d+(?:\.\d+)?)", str(block), re.I)
                if block
                else None
            )
            if m and slug(name) not in seen:
                rating = float(m.group(1))
                if 0 <= rating <= 10:
                    seen.add(slug(name))
                    found.append((name, rating))
        total = len(found)
        for i, (name, rating) in enumerate(found, 1):
            out.append(
                {
                    "name": name,
                    "city": "New York, NY",
                    "sources": {
                        "beli": {
                            "rating": rating,
                            "category": category,
                            "rank": i,
                            "total": total,
                            "source_url": url,
                        }
                    },
                }
            )
    return out


def merge_beli(rows: List[dict], beli_rows: List[dict]) -> None:
    by: Dict[str, List[dict]] = {}
    for r in rows:
        by.setdefault(row_key(r["city"], r["name"]), []).append(r)
    for b in beli_rows:
        k = row_key(b["city"], b["name"])
        matches = by.get(k, [])
        if matches:
            for r in matches:
                r["sources"]["beli"] = b["sources"]["beli"]
        else:
            rows.append(b)
            by.setdefault(k, []).append(b)


def tiktok_files_by_city() -> Dict[str, List[dict]]:
    out: Dict[str, List[dict]] = {}
    if not TIKTOK_DIR.exists():
        return out
    for city in CITY_BBOXES:
        p = TIKTOK_DIR / f"{city_slug(city)}.json"
        if not p.exists():
            continue
        try:
            data = json.loads(p.read_text())
            if isinstance(data, dict):
                data = data.get("videos", data.get("data", []))
            if isinstance(data, list):
                out[city] = data
        except Exception:
            pass

    nyc_old = []
    for p in TIKTOK_DIR.glob("nyc*.json"):
        try:
            data = json.loads(p.read_text())
            if isinstance(data, dict):
                data = data.get("videos", data.get("data", []))
            if isinstance(data, list):
                nyc_old.extend(data)
        except Exception:
            pass
    if nyc_old:
        out.setdefault("New York, NY", []).extend(nyc_old)
    return out


def load_tiktok(rows: List[dict]) -> None:
    by_city = tiktok_files_by_city()
    now = datetime.now(timezone.utc)
    c7 = now - timedelta(days=7)
    c14 = now - timedelta(days=14)

    for row in rows:
        videos = by_city.get(row.get("city") or "", [])
        if not videos:
            continue
        key = slug(row["name"])
        toks = [t for t in key.split() if len(t) > 2]
        if not toks or (len(toks) == 1 and len(toks[0]) < 7):
            continue

        cur, prev = [], []
        seen_ids = set()
        for v in videos:
            vid = str(v.get("id") or "")
            if vid and vid in seen_ids:
                continue
            if vid:
                seen_ids.add(vid)
            text = " " + slug(v.get("description") or v.get("caption") or "") + " "
            if f" {key} " not in text and not all(t in text for t in toks):
                continue
            dt = parse_dt(v.get("created_at") or "")
            if dt is None or dt >= c7:
                cur.append(v)
            elif dt >= c14:
                prev.append(v)

        if cur or prev:
            row["sources"]["tiktok"] = {
                "mentions_7d": len(cur),
                "mentions_prev_7d": len(prev),
                "views_7d": sum(int(v.get("views") or 0) for v in cur),
                "engagements_7d": sum(
                    int(v.get("likes") or 0)
                    + int(v.get("comments") or 0)
                    + int(v.get("shares") or 0)
                    for v in cur
                ),
                "creators_7d": len(
                    {v.get("author_username") for v in cur if v.get("author_username")}
                ),
            }


def gdelt_signal(name: str, city: str) -> Optional[dict]:
    city_name = city.split(",")[0]
    try:
        r = session().get(
            GDELT_URL,
            params={
                "query": f'"{name}" restaurant "{city_name}"',
                "mode": "artlist",
                "maxrecords": 200,
                "timespan": "30d",
                "sort": "datedesc",
                "format": "json",
            },
            timeout=12,
        )
        r.raise_for_status()
        arts = r.json().get("articles", [])
    except Exception:
        return None

    now = datetime.now(timezone.utc)
    c7 = now - timedelta(days=7)
    c14 = now - timedelta(days=14)
    seven = previous = 0
    domains = set()
    examples = []
    for a in arts:
        dt = parse_dt(a.get("seendate") or "")
        if dt and dt >= c7:
            seven += 1
        elif dt and dt >= c14:
            previous += 1
        d = a.get("domain") or urlparse(a.get("url") or "").netloc
        if d:
            domains.add(d.lower().removeprefix("www."))
        if len(examples) < 3 and a.get("url"):
            examples.append(
                {"title": a.get("title"), "url": a.get("url"), "domain": d}
            )
    return {
        "mentions_30d": len(arts),
        "mentions_7d": seven,
        "mentions_prev_7d": previous,
        "domains_30d": len(domains),
        "examples": examples,
        "provider": "GDELT DOC 2.0",
    }


def web_enrich(rows: List[dict], per_city: int = 18) -> None:
    candidates: Dict[str, List[tuple]] = {}
    for r in rows:
        src = r.get("sources", {})
        tt = src.get("tiktok") or {}
        has_beli = bool(src.get("beli"))
        if has_beli or tt.get("mentions_7d") or tt.get("mentions_prev_7d"):
            priority = int(tt.get("mentions_7d") or 0) * 100 + (1000 if has_beli else 0)
            candidates.setdefault(r["city"], []).append((priority, r["name"]))

    targets = []
    for city, items in candidates.items():
        dedup = {}
        for p, n in items:
            dedup[n] = max(p, dedup.get(n, -1))
        selected = sorted(((p, n) for n, p in dedup.items()), reverse=True)[:per_city]
        targets.extend((city, n) for _, n in selected)

    by: Dict[str, List[dict]] = {}
    for r in rows:
        by.setdefault(row_key(r["city"], r["name"]), []).append(r)

    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = {ex.submit(gdelt_signal, n, city): (city, n) for city, n in targets}
        for f in as_completed(futures):
            city, n = futures[f]
            try:
                sig = f.result()
            except Exception:
                sig = None
            if sig:
                for r in by.get(row_key(city, n), []):
                    r["sources"]["web"] = sig


def walk_json(v) -> Iterable[dict]:
    if isinstance(v, dict):
        yield v
        for x in v.values():
            yield from walk_json(x)
    elif isinstance(v, list):
        for x in v:
            yield from walk_json(x)


def website_signal(url: str) -> Optional[dict]:
    try:
        r = session().get(url, timeout=5, allow_redirects=True)
        if r.status_code >= 400 or "text/html" not in r.headers.get("content-type", ""):
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        best = None
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try:
                payload = json.loads(script.string or script.get_text())
            except Exception:
                continue
            for obj in walk_json(payload):
                agg = obj.get("aggregateRating")
                if not isinstance(agg, dict):
                    continue
                rating = num(agg.get("ratingValue"))
                reviews = num(agg.get("reviewCount") or agg.get("ratingCount"))
                if rating is not None and 0 <= rating <= 5:
                    c = {
                        "rating": rating,
                        "review_count": int(reviews or 0),
                        "url": r.url,
                    }
                    if best is None or c["review_count"] > best["review_count"]:
                        best = c
        return best
    except Exception:
        return None


def website_enrich(rows: List[dict], limit: int = 80) -> None:
    targets, seen = [], set()
    for r in rows:
        url = r.get("website")
        key = (r.get("city"), url)
        if (
            not url
            or key in seen
            or not any(r.get("sources", {}).get(s) for s in ("beli", "tiktok", "web"))
        ):
            continue
        seen.add(key)
        targets.append((url, r))
        if len(targets) >= limit:
            break

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(website_signal, u): r for u, r in targets}
        for f in as_completed(futures):
            row = futures[f]
            try:
                sig = f.result()
            except Exception:
                sig = None
            if sig:
                row["sources"]["website"] = sig


def reservation_enrich(row: dict) -> None:
    p = DATA_DIR / "reservation_scarcity.json"
    if not p.exists():
        return
    try:
        payload = json.loads(p.read_text())
        v = payload.get(f"{row['city']}|{row['name']}", payload.get(row["name"]))
        if v is not None:
            row["sources"]["reservation"] = {
                "scarcity_score": max(0, min(100, float(v)))
            }
    except Exception:
        pass


def preserve_sources(rows: List[dict], previous: Dict[str, dict]) -> None:
    for r in rows:
        old = (previous.get(row_key(r["city"], r["name"])) or {}).get("sources") or {}
        cur = r.setdefault("sources", {})
        for s in ("tiktok", "web", "website", "reservation", "beli"):
            if s not in cur and s in old:
                cur[s] = old[s]


def merge_unselected_previous(rows: List[dict], previous_rows: List[dict], selected: List[str]) -> None:
    selected_set = set(selected)
    existing = {row_key(r.get("city") or "", r.get("name") or "") for r in rows}
    for r in previous_rows:
        if r.get("city") in selected_set:
            continue
        k = row_key(r.get("city") or "", r.get("name") or "")
        if k not in existing and r.get("name"):
            rows.append(r)
            existing.add(k)


def run() -> None:
    selected = requested_cities()
    print("cities:", " | ".join(selected))
    previous_rows = load_previous_rows()
    previous = load_previous_map(previous_rows)

    rows = fetch_osm_universe(selected)
    if "New York, NY" in selected:
        merge_beli(rows, fetch_beli())

    load_tiktok(rows)
    web_enrich(rows)
    website_enrich(rows)

    for r in rows:
        reservation_enrich(r)

    preserve_sources(rows, previous)
    merge_unselected_previous(rows, previous_rows, selected)

    stamp = datetime.now(timezone.utc).isoformat()
    for r in rows:
        if r.get("city") in selected:
            r["snapshot_at"] = stamp

    RAW_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    scored = score_restaurants(rows)
    SCORES_PATH.write_text(json.dumps(scored, indent=2, ensure_ascii=False))
    print(
        f"restaurants={len(scored)} "
        f"cities={len({r.get('city') for r in scored})} "
        f"hype_scored={sum(1 for r in scored if (r.get('scores') or {}).get('hype') is not None)}"
    )


if __name__ == "__main__":
    run()
