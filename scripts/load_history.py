"""Steps 1 + 2: fetch the 90d published series for a SKU and store it.

Logs a check line for each step and exits non-zero if any check fails:
  1. fetch  - digest-verified, first/last timestamps, gap count
  2. store  - rows added == new prints, and re-inserting adds 0

Usage: python scripts/load_history.py --sku H100 [--db data/prints.sqlite]
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from gpu_terminal.fetch import SKUS, fetch_series, make_reader
from gpu_terminal.store import PrintStore

log = logging.getLogger("load_history")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--sku", choices=SKUS, default="H100")
    parser.add_argument("--db", type=Path, default=Path("data/prints.sqlite"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    reader = make_reader()
    log.info("STEP 1  fetch %s 90d from %s", args.sku, reader.describe())
    prints = fetch_series(reader, args.sku, "90d")
    priced = [p for p in prints if p.is_priced]
    gaps = [p for p in prints if not p.is_priced]
    log.info("  prints:  %d  (priced %d, gaps %d)", len(prints), len(priced), len(gaps))
    log.info("  first:   %s", prints[0].observed_at.isoformat())
    log.info("  last:    %s", prints[-1].observed_at.isoformat())
    for gap in gaps:
        log.info("  gap:     %s  %s", gap.observed_at.isoformat(), gap.reason)
    if not priced:
        log.error("  FAIL: no priced prints")
        return 1
    log.info("  OK: digest verified by PublishedRecordReader")

    log.info("STEP 2  store into %s", args.db)
    store = PrintStore(args.db)
    before = store.count(args.sku)
    added = store.insert(prints)
    again = store.insert(prints)
    after = store.count(args.sku)
    store.close()
    log.info("  rows before %d, added %d, after %d; re-insert added %d", before, added, after, again)
    if after - before != added or again != 0 or after < len(prints):
        log.error("  FAIL: store counts do not reconcile")
        return 1
    log.info("  OK: stored, and duplicates are ignored")
    return 0


if __name__ == "__main__":
    sys.exit(main())
