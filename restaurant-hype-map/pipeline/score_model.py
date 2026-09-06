from __future__ import annotations

import math
from collections import defaultdict
from typing import Dict, Iterable, List, Optional


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, float(x)))


def _pct_rank(value: Optional[float], universe: Iterable[Optional[float]], *, log=False) -> Optional[float]:
    """Tie-aware percentile rank. A universe of identical values returns 50, not 100."""
    if value is None:
        return None
    vals = [float(v) for v in universe if v is not None]
    if not vals:
        return None
    x = float(value)
    if log:
        vals = [math.log1p(max(0.0, v)) for v in vals]
        x = math.log1p(max(0.0, x))
    if len(vals) == 1:
        return 50.0
    less = sum(v < x for v in vals)
    equal = sum(v == x for v in vals)
    # average rank for ties, scaled 0-100
    rank0 = less + (equal - 1) / 2.0
    return 100.0 * rank0 / (len(vals) - 1)


def _growth(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    if current is None or previous is None:
        return None
    return (float(current) + 3.0) / (float(previous) + 3.0) - 1.0


def _weighted_available(parts: Dict[str, Optional[float]], weights: Dict[str, float]) -> Optional[float]:
    available = [(k, v) for k, v in parts.items() if v is not None and k in weights]
    if not available:
        return None
    denom = sum(weights[k] for k, _ in available)
    return sum(float(v) * weights[k] for k, v in available) / denom if denom else None


def _bayesian_rating(rating: Optional[float], count: Optional[float], *, scale=5.0, prior=4.2, m=40.0) -> Optional[float]:
    if rating is None:
        return None
    r = float(rating)
    c = max(0.0, float(count or 0.0))
    adj = (c / (c + m)) * r + (m / (c + m)) * prior
    return _clamp(adj / scale * 100.0)


HYPE_WEIGHTS = {"tiktok": 0.65, "web": 0.25, "reservation": 0.10}
QUALITY_WEIGHTS = {"beli": 0.85, "website": 0.15}
COVERAGE_WEIGHTS = {"tiktok": 55, "web": 25, "beli": 15, "website": 5}


def score_restaurants(rows: List[dict]) -> List[dict]:
    def src(row, source, field):
        return (row.get("sources", {}).get(source) or {}).get(field)

    by_city: Dict[str, List[dict]] = defaultdict(list)
    for r in rows:
        by_city[r.get("city") or "Unknown"].append(r)

    scored: List[dict] = []
    for city, city_rows in by_city.items():
        universes = {
            "tt_mentions": [src(r, "tiktok", "mentions_7d") for r in city_rows],
            "tt_views": [src(r, "tiktok", "views_7d") for r in city_rows],
            "tt_engagement": [src(r, "tiktok", "engagements_7d") for r in city_rows],
            "tt_growth": [_growth(src(r, "tiktok", "mentions_7d"), src(r, "tiktok", "mentions_prev_7d")) for r in city_rows],
            "web_mentions": [src(r, "web", "mentions_30d") for r in city_rows],
            "web_7d": [src(r, "web", "mentions_7d") for r in city_rows],
            "web_domains": [src(r, "web", "domains_30d") for r in city_rows],
            "web_growth": [_growth(src(r, "web", "mentions_7d"), src(r, "web", "mentions_prev_7d")) for r in city_rows],
        }

        for row in city_rows:
            out = dict(row)
            tt_growth = _growth(src(row, "tiktok", "mentions_7d"), src(row, "tiktok", "mentions_prev_7d"))
            tiktok = _weighted_available(
                {
                    "growth": _pct_rank(tt_growth, universes["tt_growth"]),
                    "mentions": _pct_rank(src(row, "tiktok", "mentions_7d"), universes["tt_mentions"], log=True),
                    "views": _pct_rank(src(row, "tiktok", "views_7d"), universes["tt_views"], log=True),
                    "engagement": _pct_rank(src(row, "tiktok", "engagements_7d"), universes["tt_engagement"], log=True),
                },
                {"growth": 0.40, "mentions": 0.25, "views": 0.20, "engagement": 0.15},
            )

            web_growth = _growth(src(row, "web", "mentions_7d"), src(row, "web", "mentions_prev_7d"))
            web = _weighted_available(
                {
                    "growth": _pct_rank(web_growth, universes["web_growth"]),
                    "mentions": _pct_rank(src(row, "web", "mentions_30d"), universes["web_mentions"], log=True),
                    "fresh": _pct_rank(src(row, "web", "mentions_7d"), universes["web_7d"], log=True),
                    "breadth": _pct_rank(src(row, "web", "domains_30d"), universes["web_domains"], log=True),
                },
                {"growth": 0.35, "mentions": 0.25, "fresh": 0.20, "breadth": 0.20},
            )

            reservation = src(row, "reservation", "scarcity_score")
            reservation = None if reservation is None else _clamp(reservation)
            hype_parts = {"tiktok": tiktok, "web": web, "reservation": reservation}
            hype = _weighted_available(hype_parts, HYPE_WEIGHTS)

            beli_rating = src(row, "beli", "rating")
            website_rating = src(row, "website", "rating")
            website_count = src(row, "website", "review_count")
            quality_parts = {
                "beli": None if beli_rating is None else _clamp(float(beli_rating) * 10.0),
                "website": _bayesian_rating(website_rating, website_count),
            }
            quality = _weighted_available(quality_parts, QUALITY_WEIGHTS)

            coverage_flags = {
                "tiktok": tiktok is not None,
                "web": web is not None,
                "beli": beli_rating is not None,
                "website": website_rating is not None,
            }
            coverage = sum(COVERAGE_WEIGHTS[k] for k, ok in coverage_flags.items() if ok)

            hype_gap = None if hype is None or quality is None else hype - quality
            if hype is None:
                signal = "Not enough hype data"
            elif coverage < 25:
                signal = "Low coverage"
            elif quality is None:
                signal = "Hype only"
            elif hype_gap >= 15:
                signal = "Overhyped"
            elif hype_gap <= -15:
                signal = "Sleeper"
            elif hype >= 75 and quality >= 75:
                signal = "Worth the hype"
            elif hype >= 75:
                signal = "Hot"
            else:
                signal = "Balanced"

            out["scores"] = {
                "hype": None if hype is None else round(hype, 1),
                "quality": None if quality is None else round(quality, 1),
                "hype_gap": None if hype_gap is None else round(hype_gap, 1),
                "coverage": int(coverage),
                "signal": signal,
                "components": {k: (None if v is None else round(v, 1)) for k, v in hype_parts.items()},
                "quality_components": {k: (None if v is None else round(v, 1)) for k, v in quality_parts.items()},
            }
            scored.append(out)

    return scored
