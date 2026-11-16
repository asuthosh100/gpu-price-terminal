"""SQLite store for prints, keyed by ``(sku, observed_at)``.

History loads and live polls write through the same ``insert``. A print that
is already stored is skipped, so overlapping fetch windows never create
duplicates, and ``insert`` returns how many rows were actually new.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from gpu_terminal.prints import Print

_SCHEMA = """
CREATE TABLE IF NOT EXISTS prints (
    sku            TEXT NOT NULL,
    observed_at    TEXT NOT NULL,  -- ISO 8601 UTC, sorts chronologically
    value          REAL,           -- NULL for a gap
    band           REAL,
    status         TEXT NOT NULL,
    reason         TEXT,
    methodology_id TEXT NOT NULL,
    PRIMARY KEY (sku, observed_at)
)
"""


class PrintStore:
    def __init__(self, path: Path) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(path)
        self._db.execute(_SCHEMA)

    def insert(self, prints: list[Print]) -> int:
        """Store prints not already present; return the number added."""
        rows = [
            (
                p.sku, p.observed_at.isoformat(), p.value, p.band,
                p.status, p.reason, p.methodology_id,
            )
            for p in prints
        ]
        with self._db:
            before = self._db.total_changes
            self._db.executemany(
                "INSERT OR IGNORE INTO prints VALUES (?, ?, ?, ?, ?, ?, ?)", rows
            )
            return self._db.total_changes - before

    def count(self, sku: str) -> int:
        (n,) = self._db.execute("SELECT COUNT(*) FROM prints WHERE sku = ?", (sku,)).fetchone()
        return n

    def latest_observed_at(self, sku: str) -> datetime | None:
        (latest,) = self._db.execute(
            "SELECT MAX(observed_at) FROM prints WHERE sku = ?", (sku,)
        ).fetchone()
        return None if latest is None else datetime.fromisoformat(latest)

    def prints(self, sku: str) -> list[Print]:
        rows = self._db.execute(
            "SELECT sku, observed_at, value, band, status, reason, methodology_id "
            "FROM prints WHERE sku = ? ORDER BY observed_at",
            (sku,),
        ).fetchall()
        return [
            Print(
                sku=r[0], observed_at=datetime.fromisoformat(r[1]), value=r[2],
                band=r[3], status=r[4], reason=r[5], methodology_id=r[6],
            )
            for r in rows
        ]

    def close(self) -> None:
        self._db.close()
