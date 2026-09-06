from __future__ import annotations

from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Dict, List, Optional

import refresh_scores as base

MAX_RESTAURANTS_PER_CITY = 1800
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]


def resolve_relation(query: str, must_contain: str = "") -> Optional[int]:
    try:
        r = base.session().get(
            NOMINATIM_URL,
            params={"q": query, "format": "jsonv2", "countrycodes": "us", "addressdetails": 1, "limit": 10},
            timeout=20,
        )
        r.raise_for_status()
        results = r.json()
    except Exception:
        return None

    needle = must_contain.lower().strip()
    ranked = []
    for x in results:
        if x.get("osm_type") != "relation":
            continue
        display = str(x.get("display_name") or "").lower()
        addr = " ".join(str(v) for v in (x.get("address") or {}).values()).lower()
        score = 0
        if needle and (needle in display or needle in addr):
            score += 12
        if "new york" in display or "new york" in addr:
            score += 4
        if x.get("class") == "boundary":
            score += 3
        ranked.append((score, int(x["osm_id"])))
    if not ranked:
        return None
    ranked.sort(reverse=True)
    return ranked[0][1]


def resolve_city_relation(city: str) -> Optional[int]:
    return resolve_relation(f"{city}, USA", city.split(",")[0])


def overpass_json(query: str, timeout: int = 65) -> Optional[dict]:
    for ep in base.OVERPASS_ENDPOINTS:
        try:
            r = base.session().post(ep, data={"data": query}, timeout=timeout)
            r.raise_for_status()
            payload = r.json()
            if payload and isinstance(payload.get("elements"), list):
                return payload
        except Exception:
            continue
    return None


def element_rows(city: str, payload: dict) -> List[dict]:
    rows, seen = [], set()
    for el in payload.get("elements", []):
        tags = el.get("tags") or {}
        name = tags.get("name")
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lng = el.get("lon") or (el.get("center") or {}).get("lon")
        if not name or lat is None or lng is None:
            continue
        lat, lng = float(lat), float(lng)
        key = f"{base.slug(name)}|{lat:.4f}|{lng:.4f}"
        if key in seen:
            continue
        seen.add(key)
        website = tags.get("website") or tags.get("contact:website")
        address = " ".join(str(x) for x in (tags.get("addr:housenumber"), tags.get("addr:street")) if x)
        rows.append({
            "name": name,
            "city": city,
            "lat": lat,
            "lng": lng,
            "cuisine": tags.get("cuisine"),
            "website": website,
            "address": address,
            "sources": {"osm": {"osm_id": f"{el.get('type')}:{el.get('id')}", "website": website, "cuisine": tags.get("cuisine")}},
        })
    return rows


def dedupe(rows: List[dict]) -> List[dict]:
    out: Dict[str, dict] = {}
    for r in rows:
        k = f"{base.slug(r['name'])}|{float(r['lat']):.4f}|{float(r['lng']):.4f}"
        out[k] = r
    return list(out.values())


def spatially_balanced(rows: List[dict], cap: int = MAX_RESTAURANTS_PER_CITY) -> List[dict]:
    rows = dedupe(rows)
    if len(rows) <= cap:
        return rows
    cells: Dict[tuple, deque] = defaultdict(deque)
    for r in rows:
        cells[(round(float(r["lat"]), 2), round(float(r["lng"]), 2))].append(r)
    active = sorted(cells)
    out: List[dict] = []
    while len(out) < cap and active:
        nxt = []
        for cell in active:
            if cells[cell] and len(out) < cap:
                out.append(cells[cell].popleft())
            if cells[cell]:
                nxt.append(cell)
        active = nxt
    return out


def fetch_relation_restaurants(city: str, relation_id: int, label: str = "") -> List[dict]:
    area_id = 3_600_000_000 + relation_id
    q = (
        f'[out:json][timeout:45][maxsize:268435456];area({area_id})->.a;('
        'nwr["amenity"="restaurant"]["name"](area.a);'
        'nwr["amenity"="fast_food"]["name"](area.a);'
        ');out center tags qt;'
    )
    payload = overpass_json(q, timeout=60)
    rows = element_rows(city, payload) if payload else []
    if label:
        print(f"boundary {city}/{label}: relation={relation_id} restaurants={len(rows)}")
    return rows


def fetch_nyc_boroughs(limit: int) -> List[dict]:
    relations: Dict[str, int] = {}
    for borough in NYC_BOROUGHS:
        rid = resolve_relation(f"{borough}, New York City, NY, USA", borough)
        if rid:
            relations[borough] = rid
            print(f"resolved NYC borough {borough}: relation={rid}")
        else:
            print(f"failed to resolve NYC borough {borough}")

    all_rows: List[dict] = []
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(fetch_relation_restaurants, "New York, NY", rid, borough): borough for borough, rid in relations.items()}
        for f in as_completed(futures):
            try:
                all_rows.extend(f.result())
            except Exception:
                pass

    rows = spatially_balanced(all_rows, cap=limit)
    print(f"NYC borough merge: raw={len(all_rows)} deduped/kept={len(rows)} boroughs={len(relations)}")
    return rows


def fallback_tiled_bbox(city: str) -> List[dict]:
    s, w, n, e = base.CITY_BBOXES[city]
    lat_step = (n - s) / 3
    lng_step = (e - w) / 3
    all_rows: List[dict] = []
    for i in range(3):
        for j in range(3):
            ss, nn = s + i * lat_step, s + (i + 1) * lat_step
            ww, ee = w + j * lng_step, w + (j + 1) * lng_step
            q = (
                '[out:json][timeout:25];('
                f'nwr["amenity"="restaurant"]["name"]({ss},{ww},{nn},{ee});'
                f'nwr["amenity"="fast_food"]["name"]({ss},{ww},{nn},{ee});'
                ');out center tags qt 450;'
            )
            payload = overpass_json(q, timeout=40)
            if payload:
                all_rows.extend(element_rows(city, payload))
    return spatially_balanced(all_rows)


def fetch_osm_city(city: str, limit: int = MAX_RESTAURANTS_PER_CITY) -> List[dict]:
    if city == "New York, NY":
        rows = fetch_nyc_boroughs(limit)
        if rows:
            return rows
        print("NYC borough queries returned no restaurants; preserving prior cache rather than importing NJ")
        return []

    relation_id = resolve_city_relation(city)
    if relation_id is not None:
        rows = fetch_relation_restaurants(city, relation_id, city)
        if rows:
            rows = spatially_balanced(rows, cap=limit)
            print(f"boundary {city}: kept={len(rows)}")
            return rows

    print(f"boundary {city}: relation lookup/query failed; using spatially tiled fallback")
    return fallback_tiled_bbox(city)


def rotating_web_enrich(rows: List[dict]) -> None:
    """Enrich the whole city universe in rotating free GDELT batches.

    Priority restaurants (Beli/TikTok) are always included. The remainder rotates
    daily, so coverage grows across the city instead of staying trapped in a tiny
    curated subset. Existing web snapshots are preserved later by base.run().
    """
    by_city: Dict[str, List[dict]] = defaultdict(list)
    for r in rows:
        if r.get("name") and r.get("city"):
            by_city[r["city"]].append(r)

    day = datetime.now(timezone.utc).timetuple().tm_yday
    targets: List[tuple[str, str]] = []
    for city, city_rows in by_city.items():
        priority = []
        ordinary = []
        for r in city_rows:
            src = r.get("sources") or {}
            if src.get("beli") or src.get("tiktok"):
                priority.append(r["name"])
            else:
                ordinary.append(r["name"])
        priority = list(dict.fromkeys(priority))[:30]
        ordinary = sorted(set(ordinary), key=base.slug)
        batch_size = 180 if city == "New York, NY" else 70
        rotation = []
        if ordinary:
            start = (day * batch_size) % len(ordinary)
            rotation = (ordinary[start:start + batch_size] + ordinary[:max(0, start + batch_size - len(ordinary))])[:batch_size]
        names = list(dict.fromkeys(priority + rotation))
        targets.extend((city, n) for n in names)
        print(f"web rotation {city}: {len(names)} restaurants")

    by_key: Dict[str, List[dict]] = defaultdict(list)
    for r in rows:
        by_key[base.row_key(r.get("city") or "", r.get("name") or "")].append(r)

    with ThreadPoolExecutor(max_workers=12) as ex:
        futures = {ex.submit(base.gdelt_signal, name, city): (city, name) for city, name in targets}
        for f in as_completed(futures):
            city, name = futures[f]
            try:
                sig = f.result()
            except Exception:
                sig = None
            if sig is not None:
                for r in by_key.get(base.row_key(city, name), []):
                    r.setdefault("sources", {})["web"] = sig


base.fetch_osm_city = fetch_osm_city
base.web_enrich = rotating_web_enrich

if __name__ == "__main__":
    base.run()
