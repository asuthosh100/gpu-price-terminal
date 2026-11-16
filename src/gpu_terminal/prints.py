"""One published index print, parsed from a series observation.

A print is one slot on the publisher's grid (every 15 minutes today; hourly
in the earliest part of the record). ``observed_at`` is its identity: the
same slot fetched through two different windows (90d, then 24h) is the same
print, which is what lets history and live polls merge without duplicates.

A slot the publisher could not price (``status: "no_print"``, e.g.
``reason: "observation_missed"``) is kept as a gap with ``value=None``. It is
never filled with a guessed price.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from typing import Any

PRICED_STATUS = "ok"
_REQUIRED = (
    "sku",
    "observed_at",
    "value_usd_gpu_hr",
    "stability_band_usd_gpu_hr",
    "status",
    "reason",
    "methodology_id",
)


class PrintFormatError(ValueError):
    """An observation does not match the shape we rely on."""


@dataclass(frozen=True)
class Print:
    sku: str
    observed_at: datetime  # timezone-aware UTC
    value: float | None  # USD per GPU-hour, as published
    band: float | None  # stability band, USD per GPU-hour
    status: str
    reason: str | None
    methodology_id: str

    @property
    def is_priced(self) -> bool:
        return self.value is not None


def _number_or_none(value: Any, field: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise PrintFormatError(f"{field} must be a number or null, got {value!r}")
    return float(value)


def parse_observation(obs: Mapping[str, Any]) -> Print:
    """Parse one ``observations[]`` entry of a published series."""
    missing = [name for name in _REQUIRED if name not in obs]
    if missing:
        raise PrintFormatError(f"observation is missing fields {missing}")

    observed_at = datetime.fromisoformat(obs["observed_at"])
    if observed_at.utcoffset() is None:
        raise PrintFormatError(f"observed_at has no timezone: {obs['observed_at']!r}")

    value = _number_or_none(obs["value_usd_gpu_hr"], "value_usd_gpu_hr")
    band = _number_or_none(obs["stability_band_usd_gpu_hr"], "stability_band_usd_gpu_hr")
    status = obs["status"]
    if status == PRICED_STATUS and value is None:
        raise PrintFormatError(f"status ok but no value at {obs['observed_at']}")
    if status != PRICED_STATUS:
        value, band = None, None

    return Print(
        sku=obs["sku"],
        observed_at=observed_at,
        value=value,
        band=band,
        status=status,
        reason=obs["reason"],
        methodology_id=obs["methodology_id"],
    )
