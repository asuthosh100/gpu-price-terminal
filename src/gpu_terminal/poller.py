"""Decisions for one poll: how far back to fetch, and how to survive network blips.

A poll is self-healing: it fetches the smallest published window that covers
the gap since the newest stored print, so a late, skipped or repeated run
costs nothing. Only gaps longer than the publisher's 90-day window are lost.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable, Sequence
from datetime import datetime, timedelta
from typing import TypeVar

log = logging.getLogger(__name__)
T = TypeVar("T")

# (window, longest gap it safely covers). Each limit leaves slack under the window
# so a print published right at the edge is never missed.
_WINDOWS: tuple[tuple[str, timedelta], ...] = (
    ("24h", timedelta(hours=20)),
    ("7d", timedelta(days=6)),
    ("30d", timedelta(days=28)),
)
WIDEST_WINDOW = "90d"
WIDEST_SPAN = timedelta(days=90)
RETRY_DELAYS_SECONDS = (5, 15, 45)
# Network failures worth retrying. Integrity failures (digest mismatch, bad format)
# are not: they fail the run, and the next scheduled run tries again.
RETRYABLE = (OSError, TimeoutError)


def choose_window(latest: datetime | None, now: datetime) -> str:
    if latest is None:
        return WIDEST_WINDOW
    gap = now - latest
    for window, limit in _WINDOWS:
        if gap <= limit:
            return window
    if gap > WIDEST_SPAN:
        log.warning("gap of %s exceeds the published %s window; older prints are lost", gap, WIDEST_WINDOW)
    return WIDEST_WINDOW


def with_retries(
    fn: Callable[[], T],
    *,
    delays: Sequence[float] = RETRY_DELAYS_SECONDS,
    sleep: Callable[[float], None] = time.sleep,
) -> T:
    """Call ``fn``; on a network error wait and retry once per delay, then re-raise."""
    for delay in delays:
        try:
            return fn()
        except RETRYABLE as exc:
            log.warning("  network error (%s); retrying in %ss", exc, delay)
            sleep(delay)
    return fn()
