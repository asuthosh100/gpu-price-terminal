"""Fetch a published series through the upstream digest-verifying reader.

We never parse the publisher's files ourselves: ``PublishedRecordReader``
checks every artifact's sha256 and resolves the per-SKU as-published history
(the values that were actually live), so what we chart is exactly what was
published. A digest failure or layout surprise raises; it is never swallowed.
"""

from __future__ import annotations

from gpu_index.common.bucket import BucketConfig
from gpu_index.published.reader import PublishedRecordReader

from gpu_terminal.prints import Print, parse_observation

PUBLIC_BASE_URL = "https://data.getcomputable.com"
SKUS = ("H100", "H200", "B200", "B300")
SERIES_RANGES = ("24h", "7d", "30d", "90d")


class FetchError(RuntimeError):
    """The published record could not be read for the requested series."""


def make_reader(base_url: str = PUBLIC_BASE_URL) -> PublishedRecordReader:
    return PublishedRecordReader(
        BucketConfig(backend="public", bucket="public", public_base_url=base_url)
    )


def fetch_series(reader: PublishedRecordReader, sku: str, series_range: str) -> list[Print]:
    if sku not in SKUS:
        raise FetchError(f"unknown SKU {sku!r}; expected one of {SKUS}")
    if series_range not in SERIES_RANGES:
        raise FetchError(f"unknown range {series_range!r}; expected one of {SERIES_RANGES}")

    envelope = reader.read_series(series_range, sku=sku)
    if envelope is None:
        raise FetchError(f"{sku} {series_range} series is not published")

    prints = [parse_observation(obs) for obs in envelope["data"]["observations"]]
    wrong = {p.sku for p in prints} - {sku}
    if wrong:
        raise FetchError(f"{sku} {series_range} series contains other SKUs: {sorted(wrong)}")
    return prints
