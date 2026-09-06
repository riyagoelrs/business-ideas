from __future__ import annotations

import math
from typing import Dict, Iterable, List, Optional


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, float(x)))


def _pct_rank(value: Optional[float], universe: Iterable[Optional[float]], *, log=False) -> Optional[float]:
    if value is None:
        return None
    vals = [float(v) for v in universe if v is not None]
    if not vals:
        return None
    x = float(value)
    if log:
        vals = [math.log1p(max(0.0, v)) for v in vals]
        x = math.log1p(max(0.0, x))
    vals.sort()
    if len(vals) == 1:
        return 50.0
    n_le = sum(v <= x for v in vals)
    return 100.0 * (n_le - 1) / (len(vals) - 1)


def _growth(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    if current is None or previous is None:
        return None
    return (float(current) + 3.0) / (float(previous) + 3.0) - 1.0


def _weighted_available(parts: Dict[str, Optional[float]], weights: Dict[str, float]) -> Optional[float]:
    available = [(k, v) for k, v in parts.items() if v is not None and k in weights]
    if not available:
        return None
    denom = sum(weights[k] for k, _ in available)
    if denom <= 0:
        return None
    return sum(float(v) * weights[k] for k, v in available) / denom


def _bayesian_rating(rating: Optional[float], count: Optional[float], *, scale=5.0, prior=4.2, m=100.0) -> Optional[float]:
    if rating is None:
        return None
    r = float(rating)
    c = max(0.0, float(count or 0.0))
    adj = (c / (c + m)) * r + (m / (c + m)) * prior
    return _clamp(adj / scale * 100.0)


HYPE_WEIGHTS = {
    "tiktok": 0.35,
    "reddit": 0.15,
    "google_reviews": 0.20,
    "review_sites": 0.15,
    "reservation": 0.10,
    "web_breadth": 0.05,
}

QUALITY_WEIGHTS = {
    "beli": 0.30,
    "google": 0.30,
    "yelp": 0.15,
    "tripadvisor": 0.15,
    "opentable": 0.10,
}

COVERAGE_WEIGHTS = {
    "tiktok": 35,
    "reddit": 15,
    "google": 20,
    "review_sites": 20,
    "reservation": 10,
}


def score_restaurants(rows: List[dict]) -> List[dict]:
    """Compute Hype, Quality, Hype Gap and coverage from normalized multi-source inputs.

    Expected source fields are nested under row['sources'].
    Missing sources are reweighted instead of treated as zeros.
    """

    def src(row, source, field):
        return (row.get("sources", {}).get(source) or {}).get(field)

    universes = {
        "tt_mentions": [src(r, "tiktok", "mentions_7d") for r in rows],
        "tt_views": [src(r, "tiktok", "views_7d") for r in rows],
        "tt_engagement": [src(r, "tiktok", "engagements_7d") for r in rows],
        "tt_growth": [_growth(src(r, "tiktok", "mentions_7d"), src(r, "tiktok", "mentions_prev_7d")) for r in rows],
        "rd_mentions": [src(r, "reddit", "mentions_30d") for r in rows],
        "rd_engagement": [src(r, "reddit", "engagements_30d") for r in rows],
        "rd_growth": [_growth(src(r, "reddit", "mentions_30d"), src(r, "reddit", "mentions_prev_30d")) for r in rows],
        "g_reviews": [src(r, "google", "review_count") for r in rows],
        "g_velocity": [src(r, "google", "review_velocity_30d") for r in rows],
        "y_reviews": [src(r, "yelp", "review_count") for r in rows],
        "y_velocity": [src(r, "yelp", "review_velocity_30d") for r in rows],
        "ta_reviews": [src(r, "tripadvisor", "review_count") for r in rows],
        "ta_velocity": [src(r, "tripadvisor", "review_velocity_30d") for r in rows],
        "ot_reviews": [src(r, "opentable", "review_count") for r in rows],
        "ot_velocity": [src(r, "opentable", "review_velocity_30d") for r in rows],
        "web_mentions": [src(r, "web", "mentions_30d") for r in rows],
    }

    scored = []
    for row in rows:
        out = dict(row)
        sources = row.get("sources", {})

        # TikTok: velocity first, then volume, reach, engagement.
        tt_growth = _growth(src(row, "tiktok", "mentions_7d"), src(row, "tiktok", "mentions_prev_7d"))
        tiktok = _weighted_available(
            {
                "growth": _pct_rank(tt_growth, universes["tt_growth"]),
                "mentions": _pct_rank(src(row, "tiktok", "mentions_7d"), universes["tt_mentions"], log=True),
                "views": _pct_rank(src(row, "tiktok", "views_7d"), universes["tt_views"], log=True),
                "engagement": _pct_rank(src(row, "tiktok", "engagements_7d"), universes["tt_engagement"], log=True),
            },
            {"growth": 0.35, "mentions": 0.30, "views": 0.20, "engagement": 0.15},
        )

        rd_growth = _growth(src(row, "reddit", "mentions_30d"), src(row, "reddit", "mentions_prev_30d"))
        reddit = _weighted_available(
            {
                "growth": _pct_rank(rd_growth, universes["rd_growth"]),
                "mentions": _pct_rank(src(row, "reddit", "mentions_30d"), universes["rd_mentions"], log=True),
                "engagement": _pct_rank(src(row, "reddit", "engagements_30d"), universes["rd_engagement"], log=True),
            },
            {"growth": 0.35, "mentions": 0.40, "engagement": 0.25},
        )

        google_reviews = _weighted_available(
            {
                "volume": _pct_rank(src(row, "google", "review_count"), universes["g_reviews"], log=True),
                "velocity": _pct_rank(src(row, "google", "review_velocity_30d"), universes["g_velocity"], log=True),
            },
            {"volume": 0.45, "velocity": 0.55},
        )

        review_site_components = []
        for source, pfx in (("yelp", "y"), ("tripadvisor", "ta"), ("opentable", "ot")):
            comp = _weighted_available(
                {
                    "volume": _pct_rank(src(row, source, "review_count"), universes[f"{pfx}_reviews"], log=True),
                    "velocity": _pct_rank(src(row, source, "review_velocity_30d"), universes[f"{pfx}_velocity"], log=True),
                },
                {"volume": 0.50, "velocity": 0.50},
            )
            if comp is not None:
                review_site_components.append(comp)
        review_sites = sum(review_site_components) / len(review_site_components) if review_site_components else None

        reservation = src(row, "reservation", "scarcity_score")
        if reservation is not None:
            reservation = _clamp(reservation)

        web_breadth = _pct_rank(src(row, "web", "mentions_30d"), universes["web_mentions"], log=True)

        hype_parts = {
            "tiktok": tiktok,
            "reddit": reddit,
            "google_reviews": google_reviews,
            "review_sites": review_sites,
            "reservation": reservation,
            "web_breadth": web_breadth,
        }
        hype = _weighted_available(hype_parts, HYPE_WEIGHTS)

        beli_rating = src(row, "beli", "rating")
        beli_quality = None if beli_rating is None else _clamp(float(beli_rating) * 10.0)
        quality_parts = {
            "beli": beli_quality,
            "google": _bayesian_rating(src(row, "google", "rating"), src(row, "google", "review_count")),
            "yelp": _bayesian_rating(src(row, "yelp", "rating"), src(row, "yelp", "review_count")),
            "tripadvisor": _bayesian_rating(src(row, "tripadvisor", "rating"), src(row, "tripadvisor", "review_count")),
            "opentable": _bayesian_rating(src(row, "opentable", "rating"), src(row, "opentable", "review_count")),
        }
        quality = _weighted_available(quality_parts, QUALITY_WEIGHTS)

        coverage_flags = {
            "tiktok": tiktok is not None,
            "reddit": reddit is not None,
            "google": (src(row, "google", "rating") is not None or src(row, "google", "review_count") is not None),
            "review_sites": bool(review_site_components),
            "reservation": reservation is not None,
        }
        coverage = sum(COVERAGE_WEIGHTS[k] for k, ok in coverage_flags.items() if ok)

        hype_gap = None if hype is None or quality is None else hype - quality
        if hype is None or coverage < 35:
            signal = "Insufficient data"
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
        }
        scored.append(out)

    return scored
