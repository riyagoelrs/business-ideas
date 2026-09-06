from __future__ import annotations

import json
import re
import time
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

UA = "RestaurantHypeMap/0.3 (+https://github.com/riyagoelrs/business-ideas)"
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": UA})

BELI_LISTS = [
    ("Burger", "https://beliapp.com/nyc-burger-search"),
    ("Italian Sandwich", "https://beliapp.com/nyc-italian-sandwich-search"),
]
OVERPASS_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def _num(value) -> Optional[float]:
    try:
        return float(str(value).replace(",", ""))
    except Exception:
        return None


def load_previous() -> Dict[str, dict]:
    if not RAW_PATH.exists():
        return {}
    try:
        rows = json.loads(RAW_PATH.read_text())
        return {slug(r.get("name", "")): r for r in rows if r.get("name")}
    except Exception:
        return {}


def fetch_osm_universe() -> List[dict]:
    query = '[out:json][timeout:45];nwr["amenity"="restaurant"]["name"](40.49,-74.27,40.92,-73.68);out center tags 1600;'
    payload = None
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            r = SESSION.get(endpoint, params={"data": query}, timeout=65)
            r.raise_for_status()
            payload = r.json()
            break
        except Exception:
            continue
    if not payload:
        return []

    rows = []
    seen = set()
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
                "city": "New York, NY",
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


def fetch_beli() -> List[dict]:
    rows = []
    for category, url in BELI_LISTS:
        try:
            r = SESSION.get(url, timeout=25)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
        except Exception:
            continue

        found = []
        for heading in soup.find_all(["h2", "h3"]):
            name = heading.get_text(" ", strip=True)
            if not name:
                continue
            block = heading.find_next(string=re.compile(r"Beli rating:\s*\d+(?:\.\d+)?", re.I))
            if not block:
                continue
            m = re.search(r"Beli rating:\s*(\d+(?:\.\d+)?)", str(block), re.I)
            if m:
                rating = float(m.group(1))
                if 0 <= rating <= 10:
                    found.append((name, rating))

        seen = set()
        clean = []
        for name, rating in found:
            k = slug(name)
            if k and k not in seen:
                seen.add(k)
                clean.append((name, rating))

        total = len(clean)
        for i, (name, rating) in enumerate(clean, start=1):
            rows.append(
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
        time.sleep(0.5)
    return rows


def merge_beli(rows: List[dict], beli_rows: List[dict]) -> None:
    by_name: Dict[str, List[dict]] = {}
    for row in rows:
        by_name.setdefault(slug(row["name"]), []).append(row)

    for b in beli_rows:
        k = slug(b["name"])
        matches = by_name.get(k, [])
        if matches:
            for row in matches:
                row.setdefault("sources", {})["beli"] = b["sources"]["beli"]
        else:
            rows.append(b)
            by_name.setdefault(k, []).append(b)


def _parse_dt(value: str) -> Optional[datetime]:
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


def load_tiktok_snapshots(rows: List[dict]) -> None:
    if not TIKTOK_DIR.exists():
        return
    videos_by_id = {}
    for path in TIKTOK_DIR.glob("*.json"):
        try:
            payload = json.loads(path.read_text())
            if isinstance(payload, dict):
                payload = payload.get("videos", payload.get("data", []))
            for v in payload if isinstance(payload, list) else []:
                vid = str(v.get("id") or "")
                if vid:
                    videos_by_id[vid] = v
        except Exception:
            continue
    videos = list(videos_by_id.values())
    if not videos:
        return

    now = datetime.now(timezone.utc)
    cutoff_7 = now - timedelta(days=7)
    cutoff_14 = now - timedelta(days=14)

    for row in rows:
        name_key = slug(row["name"])
        tokens = [t for t in name_key.split() if len(t) > 2]
        if not tokens or (len(tokens) == 1 and len(tokens[0]) < 7):
            continue
        current, previous = [], []
        for v in videos:
            text = " " + slug(v.get("description") or v.get("caption") or "") + " "
            if f" {name_key} " not in text and not all(t in text for t in tokens):
                continue
            created = _parse_dt(v.get("created_at") or "")
            if created is None:
                current.append(v)
            elif created >= cutoff_7:
                current.append(v)
            elif created >= cutoff_14:
                previous.append(v)
        if not current and not previous:
            continue
        row["sources"]["tiktok"] = {
            "mentions_7d": len(current),
            "mentions_prev_7d": len(previous),
            "views_7d": sum(int(v.get("views") or 0) for v in current),
            "engagements_7d": sum(int(v.get("likes") or 0) + int(v.get("comments") or 0) + int(v.get("shares") or 0) for v in current),
            "creators_7d": len({v.get("author_username") for v in current if v.get("author_username")}),
        }


def gdelt_signal(name: str) -> Optional[dict]:
    # GDELT DOC 2.0 is a public, no-key news/web coverage API.
    query = f'"{name}" restaurant "New York"'
    try:
        r = SESSION.get(
            GDELT_URL,
            params={
                "query": query,
                "mode": "artlist",
                "maxrecords": 250,
                "timespan": "30d",
                "sort": "datedesc",
                "format": "json",
            },
            timeout=30,
        )
        r.raise_for_status()
        articles = r.json().get("articles", [])
    except Exception:
        return None

    now = datetime.now(timezone.utc)
    cutoff_7 = now - timedelta(days=7)
    cutoff_14 = now - timedelta(days=14)
    seven = previous = 0
    domains = set()
    examples = []
    for a in articles:
        seen = _parse_dt(a.get("seendate") or "")
        if seen and seen >= cutoff_7:
            seven += 1
        elif seen and seen >= cutoff_14:
            previous += 1
        domain = a.get("domain") or urlparse(a.get("url") or "").netloc
        if domain:
            domains.add(domain.lower().removeprefix("www."))
        if len(examples) < 3 and a.get("url"):
            examples.append({"title": a.get("title"), "url": a.get("url"), "domain": domain})
    return {
        "mentions_30d": len(articles),
        "mentions_7d": seven,
        "mentions_prev_7d": previous,
        "domains_30d": len(domains),
        "examples": examples,
        "provider": "GDELT DOC 2.0",
    }


def web_enrich(rows: List[dict], limit: int = 220) -> None:
    # Spend the free public-web queries where they add the most value: restaurants
    # already surfaced by Beli or TikTok. OSM-only venues remain discoverable on map.
    candidates = {}
    for row in rows:
        k = slug(row["name"])
        has_beli = bool(row.get("sources", {}).get("beli"))
        tt = row.get("sources", {}).get("tiktok") or {}
        if has_beli or tt.get("mentions_7d") or tt.get("mentions_prev_7d"):
            score = int(tt.get("mentions_7d") or 0) * 100 + (1000 if has_beli else 0)
            if k not in candidates or score > candidates[k][0]:
                candidates[k] = (score, row["name"])
    names = [name for _, name in sorted(candidates.values(), reverse=True)[:limit]]
    by_name: Dict[str, List[dict]] = {}
    for row in rows:
        by_name.setdefault(slug(row["name"]), []).append(row)
    for i, name in enumerate(names, start=1):
        signal = gdelt_signal(name)
        if signal is not None:
            for row in by_name.get(slug(name), []):
                row["sources"]["web"] = signal
        if i % 25 == 0:
            print(f"web coverage {i}/{len(names)}")
        time.sleep(0.25)


def _walk_json(value) -> Iterable[dict]:
    if isinstance(value, dict):
        yield value
        for v in value.values():
            yield from _walk_json(v)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_json(item)


def website_enrich(rows: List[dict], limit: int = 100) -> None:
    checked = set()
    count = 0
    for row in rows:
        website = row.get("website")
        if not website or website in checked:
            continue
        # Only inspect sites for restaurants already carrying a hype/quality signal.
        if not any(row.get("sources", {}).get(s) for s in ("beli", "tiktok", "web")):
            continue
        checked.add(website)
        count += 1
        if count > limit:
            break
        try:
            r = SESSION.get(website, timeout=10, allow_redirects=True)
            if r.status_code >= 400 or "text/html" not in r.headers.get("content-type", ""):
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            best = None
            for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
                try:
                    payload = json.loads(script.string or script.get_text())
                except Exception:
                    continue
                for obj in _walk_json(payload):
                    agg = obj.get("aggregateRating")
                    if not isinstance(agg, dict):
                        continue
                    rating = _num(agg.get("ratingValue"))
                    reviews = _num(agg.get("reviewCount") or agg.get("ratingCount"))
                    if rating is not None and 0 <= rating <= 5:
                        candidate = {"rating": rating, "review_count": int(reviews or 0), "url": r.url}
                        if best is None or candidate["review_count"] > best["review_count"]:
                            best = candidate
            if best:
                row["sources"]["website"] = best
        except Exception:
            continue
        time.sleep(0.12)


def reservation_enrich(row: dict) -> None:
    path = DATA_DIR / "reservation_scarcity.json"
    if not path.exists():
        return
    try:
        payload = json.loads(path.read_text())
        value = payload.get(row["name"])
        if value is not None:
            row["sources"]["reservation"] = {"scarcity_score": max(0, min(100, float(value)))}
    except Exception:
        pass


def preserve_last_good(rows: List[dict], previous_map: Dict[str, dict]) -> None:
    for row in rows:
        prev = previous_map.get(slug(row["name"])) or {}
        old_sources = prev.get("sources") or {}
        current = row.setdefault("sources", {})
        for source in ("tiktok", "web", "website", "reservation"):
            if source not in current and source in old_sources:
                current[source] = old_sources[source]


def run() -> None:
    previous_map = load_previous()
    rows = fetch_osm_universe()
    beli_rows = fetch_beli()
    merge_beli(rows, beli_rows)
    load_tiktok_snapshots(rows)
    web_enrich(rows)
    website_enrich(rows)
    for row in rows:
        reservation_enrich(row)
    preserve_last_good(rows, previous_map)

    now = datetime.now(timezone.utc).isoformat()
    for row in rows:
        row["snapshot_at"] = now

    RAW_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    scored = score_restaurants(rows)
    SCORES_PATH.write_text(json.dumps(scored, indent=2, ensure_ascii=False))
    with_hype = sum(1 for r in scored if (r.get("scores") or {}).get("hype") is not None)
    print(f"wrote {SCORES_PATH} ({len(scored)} restaurants; {with_hype} with hype scores)")


if __name__ == "__main__":
    run()
