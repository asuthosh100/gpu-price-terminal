"""Copy the CSV history into a local SQLite file for ad-hoc querying.

The CSV history is the source of truth; this is a disposable local copy (open it
with sqlite3, Datasette or DB Browser). Re-running only adds what is new.

Usage: python scripts/sync_local.py [--skus H100 ...] [--history history] [--db data/prints.sqlite]
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from gpu_terminal.fetch import LIVE_SKUS, SKUS
from gpu_terminal.history import HistoryFormatError, read_history
from gpu_terminal.store import PrintStore

log = logging.getLogger("sync_local")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--skus", nargs="+", choices=SKUS, default=list(LIVE_SKUS))
    parser.add_argument("--history", type=Path, default=Path("history"))
    parser.add_argument("--db", type=Path, default=Path("data/prints.sqlite"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    store = PrintStore(args.db)
    try:
        for sku in args.skus:
            prints = read_history(args.history, sku)
            added = store.insert(prints)
            log.info("%s  %d in history, %d new in %s (%d total)", sku, len(prints), added, args.db, store.count(sku))
    except HistoryFormatError as exc:
        log.error("FAIL: %s", exc)
        return 1
    finally:
        store.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
