"""Write the website's JSON (summary.json + <sku>.json) from stored prints.

Reads the CSV history (default) or a SQLite store, never the network. Each file is written to a temp file
and renamed into place, so the site never reads a half-written document; if
any SKU fails, nothing is written.

Usage: python scripts/export_site_data.py [--skus H100 ...]
                                          [--history history | --db data/prints.sqlite]
                                          [--out web/public/data]
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from gpu_terminal.fetch import LIVE_SKUS, SKUS
from gpu_terminal.history import read_history
from gpu_terminal.prints import Print
from gpu_terminal.site_data import SiteDataError, sku_detail, summary
from gpu_terminal.store import PrintStore

log = logging.getLogger("export_site_data")


def _write_atomic(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(fd, "w") as fh:
            json.dump(doc, fh, separators=(",", ":"))
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def _load(args: argparse.Namespace) -> list[tuple[str, list[Print]]]:
    if args.db is None:
        return [(sku, read_history(args.history, sku)) for sku in args.skus]
    store = PrintStore(args.db)
    try:
        return [(sku, store.prints(sku)) for sku in args.skus]
    finally:
        store.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--skus", nargs="+", choices=SKUS, default=list(LIVE_SKUS))
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--history", type=Path, default=Path("history"))
    source.add_argument("--db", type=Path, help="read a SQLite store instead of the CSV history")
    parser.add_argument("--out", type=Path, default=Path("web/public/data"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    now = datetime.now(UTC)
    try:
        series = _load(args)
        docs = {f"{sku.lower()}.json": sku_detail(sku, prints, now=now) for sku, prints in series}
        docs["summary.json"] = summary(series, now=now)
    except (SiteDataError, ValueError) as exc:
        log.error("  FAIL: %s; run scripts/poll.py first", exc)
        return 1

    for name, doc in docs.items():
        _write_atomic(args.out / name, doc)
        log.info("  wrote %s (%.0f KB)", args.out / name, (args.out / name).stat().st_size / 1024)
    return 0


if __name__ == "__main__":
    sys.exit(main())
