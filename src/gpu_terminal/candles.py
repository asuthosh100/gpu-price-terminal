"""Roll prints up into OHLC candles on a fixed UTC grid.

A candle of ``hours`` covers [start, start + hours), where start is a whole
multiple of ``hours`` since midnight UTC. Open/close are the first/last
priced print in that window, high/low the max/min. Gap prints are counted
in ``n_gaps`` but never contribute a price; a window with no priced print
yields no candle (the chart shows a gap there).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from itertools import groupby

from gpu_terminal.prints import Print

_HOURS_PER_DAY = 24


@dataclass(frozen=True)
class Candle:
    time: int  # bucket start, unix seconds (what Lightweight Charts expects)
    open: float
    high: float
    low: float
    close: float
    band: float | None  # mean stability band of the priced prints
    n_prints: int
    n_gaps: int


def _bucket_start(at: datetime, hours: int) -> int:
    utc = at.astimezone(UTC)
    floored = utc.replace(hour=utc.hour - utc.hour % hours, minute=0, second=0, microsecond=0)
    return int(floored.timestamp())


def _candle(time: int, members: list[Print]) -> Candle | None:
    priced = [p for p in members if p.is_priced]
    if not priced:
        return None
    values = [p.value for p in priced]
    bands = [p.band for p in priced if p.band is not None]
    return Candle(
        time=time,
        open=values[0],
        high=max(values),
        low=min(values),
        close=values[-1],
        band=sum(bands) / len(bands) if bands else None,
        n_prints=len(priced),
        n_gaps=len(members) - len(priced),
    )


def build_candles(prints: list[Print], *, hours: int) -> list[Candle]:
    if hours <= 0 or _HOURS_PER_DAY % hours:
        raise ValueError(f"candle size must divide 24 hours, got {hours}")
    ordered = sorted(prints, key=lambda p: p.observed_at)
    candles = (
        _candle(time, list(members))
        for time, members in groupby(ordered, key=lambda p: _bucket_start(p.observed_at, hours))
    )
    return [c for c in candles if c is not None]
