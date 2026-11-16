"""Permanent print history as CSV: ``<root>/<SKU>/YYYY-MM.csv``.

This is the long-term record (the publisher keeps only 90 days). It lives on
the repo's ``data`` branch: plain text, so each poll commits a few appended
lines instead of a new copy of a binary database.

Same rules as the SQLite store: a print is identified by ``observed_at``, a
print already stored is never overwritten (first seen wins), and gaps are kept
with an empty value. Values are written with ``repr`` so they round-trip
exactly. Files are rewritten via temp file + rename, so a crash mid-write never
leaves a truncated month.
"""

from __future__ import annotations

import csv
import io
import os
import tempfile
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path

from gpu_terminal.prints import Print

COLUMNS = ("sku", "observed_at", "value", "band", "status", "reason", "methodology_id")


class HistoryFormatError(ValueError):
    """A history file, or a print being added, does not match the expected shape."""


def month_path(root: Path, sku: str, at: datetime) -> Path:
    return Path(root) / sku / f"{at.astimezone(UTC):%Y-%m}.csv"


def _num(text: str) -> float | None:
    return None if text == "" else float(text)


def _row_to_print(row: dict[str, str]) -> Print:
    observed_at = datetime.fromisoformat(row["observed_at"])
    if observed_at.utcoffset() is None:
        raise ValueError(f"observed_at has no timezone: {row['observed_at']!r}")
    return Print(
        sku=row["sku"],
        observed_at=observed_at,
        value=_num(row["value"]),
        band=_num(row["band"]),
        status=row["status"],
        reason=row["reason"] or None,
        methodology_id=row["methodology_id"],
    )


def _fmt_num(v: float | None) -> str:
    return "" if v is None else repr(v)


def _print_to_row(p: Print) -> list[str]:
    return [
        p.sku, p.observed_at.isoformat(), _fmt_num(p.value), _fmt_num(p.band),
        p.status, p.reason or "", p.methodology_id,
    ]


def _read_file(path: Path, sku: str) -> list[Print]:
    try:
        with path.open(newline="") as fh:
            reader = csv.DictReader(fh)
            if tuple(reader.fieldnames or ()) != COLUMNS:
                raise ValueError(f"header {reader.fieldnames}, expected {list(COLUMNS)}")
            prints = [_row_to_print(row) for row in reader]
    except (ValueError, KeyError) as exc:
        raise HistoryFormatError(f"{path}: {exc}") from exc
    wrong = {p.sku for p in prints} - {sku}
    if wrong:
        raise HistoryFormatError(f"{path}: rows for other SKUs {sorted(wrong)}")
    return prints


def read_history(root: Path, sku: str) -> list[Print]:
    """Every stored print for ``sku``, oldest first."""
    folder = Path(root) / sku
    if not folder.is_dir():
        return []
    prints = [p for f in sorted(folder.glob("*.csv")) for p in _read_file(f, sku)]
    return sorted(prints, key=lambda p: p.observed_at)


def latest_observed_at(root: Path, sku: str) -> datetime | None:
    folder = Path(root) / sku
    months = sorted(folder.glob("*.csv")) if folder.is_dir() else []
    for path in reversed(months):
        prints = _read_file(path, sku)
        if prints:
            return max(p.observed_at for p in prints)
    return None


def _write_atomic(path: Path, prints: Iterable[Print]) -> None:
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(COLUMNS)
    writer.writerows(_print_to_row(p) for p in prints)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(fd, "w", newline="") as fh:
            fh.write(buf.getvalue())
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def append(root: Path, sku: str, prints: Iterable[Print]) -> int:
    """Store prints not already present; rewrite only the months that changed. Returns count added."""
    incoming = list(prints)
    wrong = {p.sku for p in incoming} - {sku}
    if wrong:
        raise HistoryFormatError(f"cannot add {sorted(wrong)} prints to {sku} history")

    by_month: dict[Path, list[Print]] = {}
    for p in incoming:
        path = month_path(root, sku, p.observed_at)
        by_month = {**by_month, path: [*by_month.get(path, []), p]}

    added = 0
    for path, new in by_month.items():
        existing = _read_file(path, sku) if path.exists() else []
        seen = {p.observed_at for p in existing}
        fresh: dict[datetime, Print] = {}
        for p in new:
            if p.observed_at not in seen and p.observed_at not in fresh:
                fresh = {**fresh, p.observed_at: p}
        if not fresh:
            continue
        _write_atomic(path, sorted([*existing, *fresh.values()], key=lambda p: p.observed_at))
        added += len(fresh)
    return added
