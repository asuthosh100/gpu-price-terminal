"""Shape stored prints into the JSON the website reads.

Two documents, both plain data with no presentation logic:

* ``summary.json`` - one row per SKU for the home page: last price, change
  over the past 24 hours, and a small 1-day sparkline.
* ``<sku>.json`` - everything one SKU page needs: every priced print, the
  methodology switches, and data-quality counts.

Change over a window W is always ``last / value_at_or_before(last.t - W) - 1``.
The site uses the same rule, so the home row and the SKU page agree.
"""

from __future__ import annotations

from bisect import bisect_right
from collections.abc import Sequence
from datetime import UTC, datetime

from gpu_terminal.prints import Print

SCHEMA_VERSION = 1
UNIT = "USD / GPU-hour"
DAY_SECONDS = 86_400
SPARK_POINTS = 48
FULL_DETAIL_SECONDS = 90 * DAY_SECONDS  # keep every print this far back from the latest
OLD_BUCKET_SECONDS = 3600  # older history: last print of each hour

Point = list[float]  # [unix_seconds, value]; a list so it serialises as a JSON pair


class SiteDataError(ValueError):
    """The stored prints cannot produce a page for this SKU."""


def _iso(at: datetime) -> str:
    return at.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _priced_points(prints: Sequence[Print]) -> list[Point]:
    ordered = sorted((p for p in prints if p.is_priced), key=lambda p: p.observed_at)
    return [[int(p.observed_at.timestamp()), p.value] for p in ordered]


def _thin_old(points: list[Point]) -> list[Point]:
    """Keep every point in the last 90 days; before that, the last point of each hour."""
    cutoff = points[-1][0] - FULL_DETAIL_SECONDS
    split = bisect_right([p[0] for p in points], cutoff - 1)
    old, recent = points[:split], points[split:]
    last_per_hour = {int(t) // OLD_BUCKET_SECONDS: [t, v] for t, v in old}
    return [*last_per_hour.values(), *recent]


def _require_priced(sku: str, points: list[Point]) -> None:
    if not points:
        raise SiteDataError(f"{sku}: no priced prints to publish")


def _index_at_or_before(points: list[Point], t: int) -> int | None:
    i = bisect_right([p[0] for p in points], t) - 1
    return i if i >= 0 else None


def _change(points: list[Point], window_seconds: int) -> dict | None:
    last_t, last_v = points[-1]
    i = _index_at_or_before(points, last_t - window_seconds)
    if i is None:
        return None
    base = points[i][1]
    return {"abs": last_v - base, "pct": (last_v / base - 1) * 100}


def _downsample(points: list[Point], limit: int) -> list[Point]:
    """Keep the first point and the last point of each block, so the line ends on the latest print."""
    step = -(-len(points) // limit)  # ceil division
    if step <= 1:
        return list(points)
    tail = points[step - 1 :: step]
    if tail[-1] is not points[-1]:
        tail = [*tail, points[-1]]
    return [points[0], *tail]


def display_name(sku: str, prints: Sequence[Print]) -> str:
    """``H100`` + form factor from the latest methodology id (``h100_sxm_v1_calc_v16`` -> ``H100 SXM``)."""
    parts = prints[-1].methodology_id.split("_") if prints else []
    if len(parts) >= 3 and parts[0].upper() == sku.upper():
        return f"{sku} {parts[1].upper()}"
    return sku


def _versions(prints: Sequence[Print]) -> list[dict]:
    changes: list[dict] = []
    for p in sorted(prints, key=lambda p: p.observed_at):
        if not changes or changes[-1]["methodology_id"] != p.methodology_id:
            changes = [
                *changes,
                {"methodology_id": p.methodology_id, "time": int(p.observed_at.timestamp())},
            ]
    return changes


def sku_detail(sku: str, prints: Sequence[Print], *, now: datetime) -> dict:
    points = _priced_points(prints)
    _require_priced(sku, points)
    last_priced = max((p for p in prints if p.is_priced), key=lambda p: p.observed_at)
    return {
        "schema": SCHEMA_VERSION,
        "sku": sku,
        "name": display_name(sku, prints),
        "unit": UNIT,
        "updated_at": _iso(now),
        "last": {"time": points[-1][0], "value": points[-1][1], "band": last_priced.band},
        "points": _thin_old(points),
        "versions": _versions(prints),
        "quality": {
            "prints": len(prints),
            "priced": len(points),
            "gaps": len(prints) - len(points),
        },
    }


def _summary_row(sku: str, prints: Sequence[Print]) -> dict:
    points = _priced_points(prints)
    _require_priced(sku, points)
    last_t, last_v = points[-1]
    start = _index_at_or_before(points, last_t - DAY_SECONDS) or 0
    return {
        "sku": sku,
        "name": display_name(sku, prints),
        "unit": UNIT,
        "last": {"time": last_t, "value": last_v},
        "change_24h": _change(points, DAY_SECONDS),
        "spark": _downsample(points[start:], SPARK_POINTS),
    }


def summary(series: Sequence[tuple[str, Sequence[Print]]], *, now: datetime) -> dict:
    return {
        "schema": SCHEMA_VERSION,
        "updated_at": _iso(now),
        "skus": [_summary_row(sku, prints) for sku, prints in series],
    }
