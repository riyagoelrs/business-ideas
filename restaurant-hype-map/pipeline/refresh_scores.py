from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup

from score_model import score_restaurants

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
RAW_PATH = DATA_DIR / "raw_snapshot.json"
SCORES_PATH = DATA_DIR / "restaurant_scores.json"
TIKTOK_DIR = DATA_DIR / "tiktok"

UA = "RestaurantHypeMap/0.2 (+https://github.com/riyagoelrs/business-ideas)"
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": UA})

BELI_LISTS = [
    ("Burger", "https://beliapp.com/nyc-burger-search"),
    ("Italian Sandwich", "https://beliapp.com/nyc-italian-sandwich-search"),
]


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def load_previous() -> Dict[str, dict]:
    if not RAW_PATH.exists():
        return {}
    try:
        rows = json.loads(RAW_PATH.read_text())
        return {slug(r["name"]): r for r in rows}
    except Exception:
        return {}


def fetch_beli() -> List[dict]:
    rows = []
    for category, url in BELI_LISTS:
        r = SESSION.get(url, timeout=25)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        # Public Beli editorial list pages use restaurant headings followed by text
        # containing "Beli rating: X.X". We do not log in or access paid guides.
        found = []
        for heading in soup.find_all(["h2", "h3"]):
            name = heading.get_text(" ", strip=True)
            if not name:
                continue
            block = heading.find_next(string=re.compile(r"Beli rating:\s*\d+(?:\.\d+)?", re.I))
            if not block:
                continue
            m = re.search(r"Beli rating:\s*(\d+(?:\.\d+)?)", str(block), re.I)
            if not m:
                continue
            rating = float(m.group(1))
            if 0 <= rating <= 10:
                found.append((name, rating))

        # De-dupe while preserving order.
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
        time.sleep(0.8)
    return rows


def google_enrich(row: dict, previous: Optional[dict]) -> None:
    key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not key:
        return

    query = f"{row['name']} restaurant New York NY"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.businessStatus",
    }
    resp = SESSION.post(
        "https://places.googleapis.com/v1/places:searchText",
        headers=headers,
        json={"textQuery": query, "pageSize": 1},
        timeout=25,
    )
    if resp.status_code >= 400:
        return
    places = resp.json().get("places", [])
    if not places:
        return
    p = places[0]
    current_count = p.get("userRatingCount")
    prev_count = (((previous or {}).get("sources") or {}).get("google") or {}).get("review_count")
    velocity = None
    if current_count is not None and prev_count is not None:
        velocity = max(0, int(current_count) - int(prev_count))
    row["sources"]["google"] = {
        "place_id": p.get("id"),
        "rating": p.get("rating"),
        "review_count": current_count,
        "review_velocity_30d": velocity,
        "address": p.get("formattedAddress"),
        "lat": (p.get("location") or {}).get("latitude"),
        "lng": (p.get("location") or {}).get("longitude"),
        "google_maps_uri": p.get("googleMapsUri"),
        "website_uri": p.get("websiteUri"),
        "business_status": p.get("businessStatus"),
    }


def yelp_enrich(row: dict, previous: Optional[dict]) -> None:
    key = os.getenv("YELP_API_KEY")
    if not key:
        return
    headers = {"Authorization": f"Bearer {key}"}
    params = {"term": row["name"], "location": "New York, NY", "limit": 1}
    resp = SESSION.get("https://api.yelp.com/v3/businesses/search", headers=headers, params=params, timeout=25)
    if resp.status_code >= 400:
        return
    businesses = resp.json().get("businesses", [])
    if not businesses:
        return
    b = businesses[0]
    current_count = b.get("review_count")
    prev_count = (((previous or {}).get("sources") or {}).get("yelp") or {}).get("review_count")
    velocity = None
    if current_count is not None and prev_count is not None:
        velocity = max(0, int(current_count) - int(prev_count))
    row["sources"]["yelp"] = {
        "business_id": b.get("id"),
        "rating": b.get("rating"),
        "review_count": current_count,
        "review_velocity_30d": velocity,
        "url": b.get("url"),
        "price": b.get("price"),
    }


def tripadvisor_enrich(row: dict, previous: Optional[dict]) -> None:
    key = os.getenv("TRIPADVISOR_API_KEY")
    if not key:
        return
    search = SESSION.get(
        "https://api.content.tripadvisor.com/api/v1/location/search",
        params={"key": key, "searchQuery": row["name"], "category": "restaurants", "address": "New York, NY", "language": "en"},
        timeout=25,
    )
    if search.status_code >= 400:
        return
    data = search.json().get("data", [])
    if not data:
        return
    loc_id = data[0].get("location_id")
    if not loc_id:
        return
    details = SESSION.get(
        f"https://api.content.tripadvisor.com/api/v1/location/{loc_id}/details",
        params={"key": key, "language": "en", "currency": "USD"},
        timeout=25,
    )
    if details.status_code >= 400:
        return
    d = details.json()
    current_count = d.get("num_reviews")
    prev_count = (((previous or {}).get("sources") or {}).get("tripadvisor") or {}).get("review_count")
    velocity = None
    if current_count is not None and prev_count is not None:
        try:
            velocity = max(0, int(str(current_count).replace(",", "")) - int(str(prev_count).replace(",", "")))
        except Exception:
            velocity = None
    row["sources"]["tripadvisor"] = {
        "location_id": loc_id,
        "rating": float(d["rating"]) if d.get("rating") else None,
        "review_count": int(str(current_count).replace(",", "")) if current_count else None,
        "review_velocity_30d": velocity,
        "url": (d.get("web_url") or d.get("website")),
    }


def reddit_enrich(row: dict) -> None:
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    if not client_id or not client_secret:
        return
    try:
        import praw

        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=UA,
        )
        mentions = 0
        engagement = 0
        query = f'"{row["name"]}"'
        for post in reddit.subreddit("FoodNYC").search(query, sort="new", time_filter="month", limit=100):
            mentions += 1
            engagement += max(0, int(post.score or 0)) + max(0, int(post.num_comments or 0))
        row["sources"]["reddit"] = {
            "mentions_30d": mentions,
            "engagements_30d": engagement,
            # Previous-window growth can be filled by a future archive query; static
            # monthly snapshots still let us compare today's 30d window over time.
            "mentions_prev_30d": None,
            "scope": "r/FoodNYC",
        }
    except Exception:
        return


def load_tiktok_snapshots(rows: List[dict], previous_map: Dict[str, dict]) -> None:
    """Merge JSON generated by the user's tiktok-scraper repo.

    The scraper's files contain description, views, likes, comments and shares.
    We match restaurant names in captions and aggregate the latest 7-day snapshot.
    """
    if not TIKTOK_DIR.exists():
        return
    videos = []
    for path in TIKTOK_DIR.glob("*.json"):
        try:
            payload = json.loads(path.read_text())
            if isinstance(payload, dict):
                payload = payload.get("videos", payload.get("data", []))
            if isinstance(payload, list):
                videos.extend(payload)
        except Exception:
            continue

    if not videos:
        return

    for row in rows:
        key = slug(row["name"])
        tokens = [t for t in key.split() if len(t) > 2]
        hits = []
        for v in videos:
            text = slug(v.get("description") or v.get("caption") or "")
            # Conservative match: all meaningful restaurant-name tokens must appear.
            if tokens and all(t in text for t in tokens):
                hits.append(v)
        if not hits:
            continue
        mentions = len(hits)
        views = sum(int(v.get("views") or 0) for v in hits)
        engagements = sum(int(v.get("likes") or 0) + int(v.get("comments") or 0) + int(v.get("shares") or 0) for v in hits)
        prev_mentions = ((((previous_map.get(key) or {}).get("sources") or {}).get("tiktok") or {}).get("mentions_7d"))
        row["sources"]["tiktok"] = {
            "mentions_7d": mentions,
            "mentions_prev_7d": prev_mentions,
            "views_7d": views,
            "engagements_7d": engagements,
        }


def reservation_enrich(row: dict) -> None:
    """Read an optional reservation scarcity snapshot.

    A separate availability collector can write data/reservation_scarcity.json as
    {"Restaurant Name": 0-100}. Keeping this separate avoids pretending we have
    official Resy/OpenTable access when we do not.
    """
    path = DATA_DIR / "reservation_scarcity.json"
    if not path.exists():
        return
    try:
        payload = json.loads(path.read_text())
        value = payload.get(row["name"])
        if value is not None:
            row["sources"]["reservation"] = {"scarcity_score": max(0, min(100, float(value)))}
    except Exception:
        return


def run() -> None:
    previous_map = load_previous()
    rows = fetch_beli()

    for i, row in enumerate(rows, start=1):
        prev = previous_map.get(slug(row["name"]))
        google_enrich(row, prev)
        yelp_enrich(row, prev)
        tripadvisor_enrich(row, prev)
        reddit_enrich(row)
        reservation_enrich(row)
        if i % 10 == 0:
            print(f"enriched {i}/{len(rows)}")
        time.sleep(0.08)

    load_tiktok_snapshots(rows, previous_map)

    now = datetime.now(timezone.utc).isoformat()
    for row in rows:
        row["snapshot_at"] = now

    RAW_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    scored = score_restaurants(rows)
    SCORES_PATH.write_text(json.dumps(scored, indent=2, ensure_ascii=False))
    print(f"wrote {SCORES_PATH} ({len(scored)} restaurants)")


if __name__ == "__main__":
    run()
