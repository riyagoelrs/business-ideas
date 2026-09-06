from __future__ import annotations

from collections import defaultdict, deque
from typing import Dict, List, Optional

import requests

import refresh_scores as base

# Keep enough restaurants to make the map useful without turning the static JSON
# into an enormous national POI database. The cap is applied *after* city-boundary
# filtering and is spatially balanced, so it does not bias toward one neighborhood.
MAX_RESTAURANTS_PER_CITY = 1800
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def resolve_city_relation(city: str) -> Optional[int]:
    """Resolve the actual OSM administrative relation for a US city."""
    try:
        r = base.session().get(
            NOMINATIM_URL,
            params={
                "q": f"{city}, USA",
                "format": "jsonv2",
                "countrycodes": "us",
                "addressdetails": 1,
                "limit": 8,
            },
            timeout=20,
        )
        r.raise_for_status()
        results = r.json()
    except Exception:
        return None

    city_name = city.split(",")[0].lower()
    state_hint = city.split(",", 1)[1].strip().lower() if "," in city else ""

    relations = []
    for x in results:
        if x.get("osm_type") != "relation":
            continue
        addr = x.get("address") or {}
        label = " ".join(
            str(addr.get(k) or "")
            for k in ("city", "town", "municipality", "county", "state", "state_code")
        ).lower()
        display = str(x.get("display_name") or "").lower()
        score = 0
        if city_name in label or city_name in display:
            score += 10
        if state_hint and (state_hint in label or state_hint in display):
            score += 4
        if x.get("class") == "boundary":
            score += 3
        relations.append((score, int(x["osm_id"])))

    if not relations:
        return None
    relations.sort(reverse=True)
    return relations[0][1]


def overpass_json(query: str) -> Optional[dict]:
    for ep in base.OVERPASS_ENDPOINTS:
        try:
            r = base.session().post(
                ep,
                data={"data": query},
                timeout=100,
            )
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
        address = " ".join(
            str(x) for x in (tags.get("addr:housenumber"), tags.get("addr:street")) if x
        )
        rows.append(
            {
                "name": name,
                "city": city,
                "lat": lat,
                "lng": lng,
                "cuisine": tags.get("cuisine"),
                "website": website,
                "address": address,
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


def spatially_balanced(rows: List[dict], cap: int = MAX_RESTAURANTS_PER_CITY) -> List[dict]:
    if len(rows) <= cap:
        return rows

    # ~1 km-ish cells. Round-robin across cells instead of taking Overpass' first N.
    cells: Dict[tuple, deque] = defaultdict(deque)
    for r in rows:
        cells[(round(float(r["lat"]), 2), round(float(r["lng"]), 2))].append(r)

    ordered_cells = sorted(cells)
    out: List[dict] = []
    while len(out) < cap and ordered_cells:
        next_cells = []
        for cell in ordered_cells:
            if cells[cell] and len(out) < cap:
                out.append(cells[cell].popleft())
            if cells[cell]:
                next_cells.append(cell)
        ordered_cells = next_cells
    return out


def fallback_tiled_bbox(city: str) -> List[dict]:
    """Fallback if city-boundary resolution fails; tiles prevent first-500 bias."""
    s, w, n, e = base.CITY_BBOXES[city]
    lat_step = (n - s) / 3
    lng_step = (e - w) / 3
    all_rows: List[dict] = []
    for i in range(3):
        for j in range(3):
            ss, nn = s + i * lat_step, s + (i + 1) * lat_step
            ww, ee = w + j * lng_step, w + (j + 1) * lng_step
            q = (
                '[out:json][timeout:30];('
                f'nwr["amenity"="restaurant"]["name"]({ss},{ww},{nn},{ee});'
                f'nwr["amenity"="fast_food"]["name"]({ss},{ww},{nn},{ee});'
                ');out center tags qt 450;'
            )
            payload = overpass_json(q)
            if payload:
                all_rows.extend(element_rows(city, payload))

    dedup: Dict[str, dict] = {}
    for r in all_rows:
        k = f"{base.slug(r['name'])}|{r['lat']:.4f}|{r['lng']:.4f}"
        dedup[k] = r
    return spatially_balanced(list(dedup.values()))


def fetch_osm_city(city: str, limit: int = MAX_RESTAURANTS_PER_CITY) -> List[dict]:
    relation_id = resolve_city_relation(city)
    if relation_id is not None:
        # OSM area ids for relations are relation id + 3.6 billion.
        area_id = 3_600_000_000 + relation_id
        q = (
            f'[out:json][timeout:80][maxsize:536870912];area({area_id})->.city;('
            'nwr["amenity"="restaurant"]["name"](area.city);'
            'nwr["amenity"="fast_food"]["name"](area.city);'
            ');out center tags qt;'
        )
        payload = overpass_json(q)
        if payload:
            rows = spatially_balanced(element_rows(city, payload), cap=limit)
            if rows:
                print(f"boundary {city}: relation={relation_id} raw={len(payload.get('elements', []))} kept={len(rows)}")
                return rows

    print(f"boundary {city}: relation lookup/query failed; using tiled fallback")
    return fallback_tiled_bbox(city)


# Monkey-patch only the discovery function. All existing enrichment/scoring/persistence
# logic remains in refresh_scores.py.
base.fetch_osm_city = fetch_osm_city

if __name__ == "__main__":
    base.run()
