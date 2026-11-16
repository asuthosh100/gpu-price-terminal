from datetime import UTC, datetime, timedelta

import pytest

from gpu_terminal.history import (
    HistoryFormatError,
    append,
    latest_observed_at,
    month_path,
    read_history,
)
from gpu_terminal.prints import Print

T0 = datetime(2026, 10, 31, 23, 30, tzinfo=UTC)  # straddles a month boundary


def _print(minutes: int, value: float | None = 3.123456789) -> Print:
    return Print(
        sku="H100",
        observed_at=T0 + timedelta(minutes=minutes),
        value=value,
        band=None if value is None else 0.81,
        status="ok" if value is not None else "no_print",
        reason=None if value is not None else "observation_missed",
        methodology_id="h100_sxm_v1_calc_v16",
    )


def test_append_writes_one_file_per_month(tmp_path):
    added = append(tmp_path, "H100", [_print(0), _print(15), _print(30), _print(45)])
    assert added == 4
    assert month_path(tmp_path, "H100", T0).name == "2026-10.csv"
    assert sorted(p.name for p in (tmp_path / "H100").iterdir()) == ["2026-10.csv", "2026-11.csv"]


def test_round_trip_preserves_every_field_exactly(tmp_path):
    prints = [_print(0), _print(15, None)]
    append(tmp_path, "H100", prints)
    assert read_history(tmp_path, "H100") == prints


def test_append_skips_prints_already_stored(tmp_path):
    append(tmp_path, "H100", [_print(0), _print(15)])
    assert append(tmp_path, "H100", [_print(15), _print(30)]) == 1
    assert [p.observed_at for p in read_history(tmp_path, "H100")] == [
        T0, T0 + timedelta(minutes=15), T0 + timedelta(minutes=30),
    ]


def test_first_seen_value_wins_like_the_sqlite_store(tmp_path):
    append(tmp_path, "H100", [_print(0, 3.0)])
    append(tmp_path, "H100", [_print(0, 9.9)])
    assert read_history(tmp_path, "H100")[0].value == 3.0


def test_nothing_new_leaves_files_untouched(tmp_path):
    append(tmp_path, "H100", [_print(0)])
    path = month_path(tmp_path, "H100", T0)
    before = path.stat().st_mtime_ns
    assert append(tmp_path, "H100", [_print(0)]) == 0
    assert path.stat().st_mtime_ns == before


def test_history_is_sorted_even_when_appended_out_of_order(tmp_path):
    append(tmp_path, "H100", [_print(30)])
    append(tmp_path, "H100", [_print(0)])
    times = [p.observed_at for p in read_history(tmp_path, "H100")]
    assert times == sorted(times)


def test_latest_observed_at(tmp_path):
    assert latest_observed_at(tmp_path, "H100") is None
    append(tmp_path, "H100", [_print(0), _print(45)])
    assert latest_observed_at(tmp_path, "H100") == T0 + timedelta(minutes=45)


def test_unknown_sku_has_empty_history(tmp_path):
    assert read_history(tmp_path, "B300") == []


def test_rejects_a_row_for_another_sku(tmp_path):
    with pytest.raises(HistoryFormatError, match="H200"):
        append(tmp_path, "H100", [Print(**{**_print(0).__dict__, "sku": "H200"})])


def test_rejects_a_corrupted_file(tmp_path):
    append(tmp_path, "H100", [_print(0)])
    path = month_path(tmp_path, "H100", T0)
    path.write_text(path.read_text().replace("3.123456789", "not-a-number"))
    with pytest.raises(HistoryFormatError, match="2026-10.csv"):
        read_history(tmp_path, "H100")
