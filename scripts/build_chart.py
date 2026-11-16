"""Step 3: render the stored prints for one SKU as a trading-style chart page.

Reads only from the local store (step 2), never the network. Writes a single
self-contained HTML file with the data inlined, so it opens from disk.

Usage: python scripts/build_chart.py --sku H100 [--db data/prints.sqlite] [--out chart/h100.html]
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from gpu_terminal.candles import _bucket_start, build_candles
from gpu_terminal.fetch import SKUS
from gpu_terminal.prints import Print
from gpu_terminal.store import PrintStore

log = logging.getLogger("build_chart")
TEMPLATE = Path(__file__).resolve().parents[1] / "src/gpu_terminal/chart_template.html"
PLACEHOLDER = "/*__DATA__*/null"
CANDLE_HOURS = {"2h": 2, "3h": 3}


def _version_changes(prints: list[Print]) -> list[dict]:
    """First print of each methodology version, in order."""
    changes: list[dict] = []
    for p in prints:
        if not changes or changes[-1]["methodology_id"] != p.methodology_id:
            changes.append({"methodology_id": p.methodology_id, "time": int(p.observed_at.timestamp())})
    return changes


def _payload(sku: str, prints: list[Print]) -> dict:
    priced = [p for p in prints if p.is_priced]
    versions = _version_changes(prints)
    return {
        "sku": sku,
        "built_at": datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
        "points": [[int(p.observed_at.timestamp()), p.value] for p in priced],
        "last_band": priced[-1].band,
        "candles": {
            label: [asdict(c) for c in build_candles(prints, hours=h)]
            for label, h in CANDLE_HOURS.items()
        },
        # Marker per version switch after the first, pinned to its candle.
        "markers": {
            label: [
                {
                    "time": _bucket_start(datetime.fromtimestamp(v["time"], UTC), h),
                    "text": v["methodology_id"].rsplit("_", 1)[-1],
                }
                for v in versions[1:]
            ]
            for label, h in CANDLE_HOURS.items()
        },
        "versions": versions,
        "quality": {
            "prints": len(prints),
            "priced": len(priced),
            "gaps": len(prints) - len(priced),
            "first": int(prints[0].observed_at.timestamp()),
            "last": int(prints[-1].observed_at.timestamp()),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--sku", choices=SKUS, default="H100")
    parser.add_argument("--db", type=Path, default=Path("data/prints.sqlite"))
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    out = args.out or Path(f"chart/{args.sku.lower()}.html")

    log.info("STEP 3  build %s chart from %s", args.sku, args.db)
    store = PrintStore(args.db)
    prints = store.prints(args.sku)
    store.close()
    if not any(p.is_priced for p in prints):
        log.error("  FAIL: no priced %s prints in the store; run load_history.py first", args.sku)
        return 1

    payload = _payload(args.sku, prints)
    template = TEMPLATE.read_text()
    if template.count(PLACEHOLDER) != 1:
        log.error("  FAIL: template must contain exactly one %s", PLACEHOLDER)
        return 1
    data = json.dumps(payload, separators=(",", ":")).replace("</", "<\\/")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(template.replace(PLACEHOLDER, data))

    for label, cs in payload["candles"].items():
        log.info("  %s candles: %d  (%s -> %s)", label, len(cs),
                 datetime.fromtimestamp(cs[0]["time"], UTC).isoformat(),
                 datetime.fromtimestamp(cs[-1]["time"], UTC).isoformat())
    log.info("  versions: %s", " -> ".join(v["methodology_id"] for v in payload["versions"]))
    log.info("  OK: wrote %s (%.0f KB)", out, out.stat().st_size / 1024)
    return 0


if __name__ == "__main__":
    sys.exit(main())
