"""Fetch new prints and append them to the CSV history. Safe to run any time, any number of times.

For each SKU: find the newest stored print, fetch the smallest published window
that covers the gap (24h/7d/30d/90d), retry network errors, and append only new
prints. Every SKU is attempted even if one fails; the exit code is non-zero if
any failed, so CI marks the run red.

Usage: python scripts/poll.py [--skus H100 ...] [--history history]
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path

from gpu_terminal.fetch import SKUS, FetchError, fetch_series, make_reader
from gpu_terminal.history import append, latest_observed_at
from gpu_terminal.poller import choose_window, with_retries

log = logging.getLogger("poll")


def poll_sku(reader, history: Path, sku: str, now: datetime) -> int:
    latest = latest_observed_at(history, sku)
    window = choose_window(latest, now)
    log.info("%s  newest stored %s -> fetch %s", sku, latest.isoformat() if latest else "none", window)
    prints = with_retries(lambda: fetch_series(reader, sku, window))
    added = append(history, sku, prints)
    newest = latest_observed_at(history, sku)
    log.info("  fetched %d, added %d, newest now %s", len(prints), added, newest.isoformat() if newest else "none")
    return added


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--skus", nargs="+", choices=SKUS, default=["H100"])
    parser.add_argument("--history", type=Path, default=Path("history"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    reader = make_reader()
    now = datetime.now(UTC)
    failed: list[str] = []
    for sku in args.skus:
        try:
            poll_sku(reader, args.history, sku, now)
        except (FetchError, OSError, ValueError) as exc:
            log.error("  FAIL %s: %s", sku, exc)
            failed = [*failed, sku]
    if failed:
        log.error("FAIL: %s not updated; the next run will catch up", ", ".join(failed))
        return 1
    log.info("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
