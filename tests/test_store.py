from datetime import UTC, datetime, timedelta

from gpu_terminal.prints import Print
from gpu_terminal.store import PrintStore

T0 = datetime(2026, 11, 16, 6, 0, tzinfo=UTC)


def _print(minutes: int, value: float | None = 3.9, sku: str = "H100") -> Print:
    return Print(
        sku=sku,
        observed_at=T0 + timedelta(minutes=minutes),
        value=value,
        band=None if value is None else 0.8,
        status="ok" if value is not None else "no_print",
        reason=None if value is not None else "observation_missed",
        methodology_id="m1",
    )


def test_insert_counts_only_new_rows(tmp_path):
    store = PrintStore(tmp_path / "p.sqlite")
    assert store.insert([_print(0), _print(15)]) == 2
    # Overlapping window: one old, one new -> only the new one is added.
    assert store.insert([_print(15), _print(30)]) == 1
    assert store.count("H100") == 3


def test_reinserting_same_batch_adds_nothing(tmp_path):
    store = PrintStore(tmp_path / "p.sqlite")
    batch = [_print(0), _print(15), _print(30, value=None)]
    store.insert(batch)
    assert store.insert(batch) == 0


def test_round_trip_preserves_values_and_order(tmp_path):
    store = PrintStore(tmp_path / "p.sqlite")
    batch = [_print(30), _print(0, value=None), _print(15, value=4.1)]
    store.insert(batch)
    assert store.prints("H100") == sorted(batch, key=lambda p: p.observed_at)


def test_skus_are_kept_apart(tmp_path):
    store = PrintStore(tmp_path / "p.sqlite")
    store.insert([_print(0), _print(0, sku="B200")])
    assert store.count("H100") == 1
    assert store.count("B200") == 1
    assert store.latest_observed_at("H100") == T0
    assert store.latest_observed_at("H200") is None
