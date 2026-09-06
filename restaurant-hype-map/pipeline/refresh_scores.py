from __future__ import annotations

import json
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
UA = "RestaurantHypeMap/0.4 (+https://github.com/riyagoelrs/business-ideas)"
BELI_LISTS = [
    ("Burger", "https://beliapp.com/nyc-burger-search"),
    ("Italian Sandwich", "https://beliapp.com/nyc-italian-sandwich-search"),
]
OVERPASS_ENDPOINTS = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"]
GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA})
    return s


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


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


def load_previous() -> Dict[str, dict]:
    try:
        rows = json.loads(RAW_PATH.read_text()) if RAW_PATH.exists() else []
        return {slug(r["name"]): r for r in rows if r.get("name")}
    except Exception:
        return {}


def fetch_osm_universe() -> List[dict]:
    q = '[out:json][timeout:45];nwr["amenity"="restaurant"]["name"](40.49,-74.27,40.92,-73.68);out center tags 1600;'
    payload = None
    for ep in OVERPASS_ENDPOINTS:
        try:
            r = session().get(ep, params={"data": q}, timeout=60)
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
        rows.append({
            "name": name, "city": "New York, NY", "lat": float(lat), "lng": float(lng),
            "cuisine": tags.get("cuisine"), "website": website,
            "sources": {"osm": {"osm_id": f"{el.get('type')}:{el.get('id')}", "website": website, "cuisine": tags.get("cuisine")}},
        })
    return rows


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
            block = h.find_next(string=re.compile(r"Beli rating:\s*\d+(?:\.\d+)?", re.I)) if name else None
            m = re.search(r"Beli rating:\s*(\d+(?:\.\d+)?)", str(block), re.I) if block else None
            if m and slug(name) not in seen:
                rating = float(m.group(1))
                if 0 <= rating <= 10:
                    seen.add(slug(name)); found.append((name, rating))
        total = len(found)
        for i, (name, rating) in enumerate(found, 1):
            out.append({"name": name, "city": "New York, NY", "sources": {"beli": {"rating": rating, "category": category, "rank": i, "total": total, "source_url": url}}})
    return out


def merge_beli(rows: List[dict], beli_rows: List[dict]) -> None:
    by = {}
    for r in rows:
        by.setdefault(slug(r["name"]), []).append(r)
    for b in beli_rows:
        matches = by.get(slug(b["name"]), [])
        if matches:
            for r in matches:
                r["sources"]["beli"] = b["sources"]["beli"]
        else:
            rows.append(b); by.setdefault(slug(b["name"]), []).append(b)


def load_tiktok(rows: List[dict]) -> None:
    if not TIKTOK_DIR.exists():
        return
    videos = {}
    for p in TIKTOK_DIR.glob("*.json"):
        try:
            data = json.loads(p.read_text())
            if isinstance(data, dict): data = data.get("videos", data.get("data", []))
            for v in data if isinstance(data, list) else []:
                if v.get("id"): videos[str(v["id"])] = v
        except Exception:
            pass
    now = datetime.now(timezone.utc); c7 = now - timedelta(days=7); c14 = now - timedelta(days=14)
    for row in rows:
        key = slug(row["name"]); toks = [t for t in key.split() if len(t) > 2]
        if not toks or (len(toks) == 1 and len(toks[0]) < 7): continue
        cur, prev = [], []
        for v in videos.values():
            text = " " + slug(v.get("description") or v.get("caption") or "") + " "
            if f" {key} " not in text and not all(t in text for t in toks): continue
            dt = parse_dt(v.get("created_at") or "")
            if dt is None or dt >= c7: cur.append(v)
            elif dt >= c14: prev.append(v)
        if cur or prev:
            row["sources"]["tiktok"] = {
                "mentions_7d": len(cur), "mentions_prev_7d": len(prev),
                "views_7d": sum(int(v.get("views") or 0) for v in cur),
                "engagements_7d": sum(int(v.get("likes") or 0)+int(v.get("comments") or 0)+int(v.get("shares") or 0) for v in cur),
                "creators_7d": len({v.get("author_username") for v in cur if v.get("author_username")}),
            }


def gdelt_signal(name: str) -> Optional[dict]:
    try:
        r = session().get(GDELT_URL, params={"query": f'"{name}" restaurant "New York"', "mode": "artlist", "maxrecords": 250, "timespan": "30d", "sort": "datedesc", "format": "json"}, timeout=12)
        r.raise_for_status(); arts = r.json().get("articles", [])
    except Exception:
        return None
    now = datetime.now(timezone.utc); c7 = now-timedelta(days=7); c14 = now-timedelta(days=14)
    seven = previous = 0; domains = set(); examples = []
    for a in arts:
        dt = parse_dt(a.get("seendate") or "")
        if dt and dt >= c7: seven += 1
        elif dt and dt >= c14: previous += 1
        d = a.get("domain") or urlparse(a.get("url") or "").netloc
        if d: domains.add(d.lower().removeprefix("www."))
        if len(examples) < 3 and a.get("url"): examples.append({"title": a.get("title"), "url": a.get("url"), "domain": d})
    return {"mentions_30d": len(arts), "mentions_7d": seven, "mentions_prev_7d": previous, "domains_30d": len(domains), "examples": examples, "provider": "GDELT DOC 2.0"}


def web_enrich(rows: List[dict], limit: int = 120) -> None:
    candidates = {}
    for r in rows:
        src = r.get("sources", {}); tt = src.get("tiktok") or {}; has_beli = bool(src.get("beli"))
        if has_beli or tt.get("mentions_7d") or tt.get("mentions_prev_7d"):
            priority = int(tt.get("mentions_7d") or 0)*100 + (1000 if has_beli else 0)
            k = slug(r["name"])
            if k not in candidates or priority > candidates[k][0]: candidates[k] = (priority, r["name"])
    names = [n for _, n in sorted(candidates.values(), reverse=True)[:limit]]
    by = {}
    for r in rows: by.setdefault(slug(r["name"]), []).append(r)
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(gdelt_signal, n): n for n in names}
        for f in as_completed(futures):
            n = futures[f]
            try: sig = f.result()
            except Exception: sig = None
            if sig:
                for r in by.get(slug(n), []): r["sources"]["web"] = sig


def walk_json(v) -> Iterable[dict]:
    if isinstance(v, dict):
        yield v
        for x in v.values(): yield from walk_json(x)
    elif isinstance(v, list):
        for x in v: yield from walk_json(x)


def website_signal(url: str) -> Optional[dict]:
    try:
        r = session().get(url, timeout=5, allow_redirects=True)
        if r.status_code >= 400 or "text/html" not in r.headers.get("content-type", ""): return None
        soup = BeautifulSoup(r.text, "html.parser"); best = None
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try: payload = json.loads(script.string or script.get_text())
            except Exception: continue
            for obj in walk_json(payload):
                agg = obj.get("aggregateRating")
                if not isinstance(agg, dict): continue
                rating = num(agg.get("ratingValue")); reviews = num(agg.get("reviewCount") or agg.get("ratingCount"))
                if rating is not None and 0 <= rating <= 5:
                    c = {"rating": rating, "review_count": int(reviews or 0), "url": r.url}
                    if best is None or c["review_count"] > best["review_count"]: best = c
        return best
    except Exception:
        return None


def website_enrich(rows: List[dict], limit: int = 60) -> None:
    targets, seen = [], set()
    for r in rows:
        url = r.get("website")
        if not url or url in seen or not any(r.get("sources", {}).get(s) for s in ("beli", "tiktok", "web")): continue
        seen.add(url); targets.append((url, r))
        if len(targets) >= limit: break
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(website_signal, u): r for u, r in targets}
        for f in as_completed(futures):
            row = futures[f]
            try: sig = f.result()
            except Exception: sig = None
            if sig: row["sources"]["website"] = sig


def reservation_enrich(row: dict) -> None:
    p = DATA_DIR / "reservation_scarcity.json"
    if not p.exists(): return
    try:
        v = json.loads(p.read_text()).get(row["name"])
        if v is not None: row["sources"]["reservation"] = {"scarcity_score": max(0, min(100, float(v)))}
    except Exception: pass


def preserve(rows: List[dict], previous: Dict[str, dict]) -> None:
    for r in rows:
        old = (previous.get(slug(r["name"])) or {}).get("sources") or {}; cur = r.setdefault("sources", {})
        for s in ("tiktok", "web", "website", "reservation"):
            if s not in cur and s in old: cur[s] = old[s]


def run() -> None:
    previous = load_previous(); rows = fetch_osm_universe(); merge_beli(rows, fetch_beli()); load_tiktok(rows); web_enrich(rows); website_enrich(rows)
    for r in rows: reservation_enrich(r)
    preserve(rows, previous)
    stamp = datetime.now(timezone.utc).isoformat()
    for r in rows: r["snapshot_at"] = stamp
    RAW_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    scored = score_restaurants(rows); SCORES_PATH.write_text(json.dumps(scored, indent=2, ensure_ascii=False))
    print(f"restaurants={len(scored)} hype_scored={sum(1 for r in scored if (r.get('scores') or {}).get('hype') is not None)}")


if __name__ == "__main__": run()
