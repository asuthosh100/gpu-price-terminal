from datetime import UTC, datetime, timedelta

import pytest

from gpu_terminal.prints import Print
from gpu_terminal.site_data import (
    SCHEMA_VERSION,
    SPARK_POINTS,
    SiteDataError,
    display_name,
    sku_detail,
    summary,
)

T0 = datetime(2026, 11, 1, 0, 0, tzinfo=UTC)
NOW = datetime(2026, 11, 16, 8, 0, tzinfo=UTC)


def _print(minutes: int, value: float | None, methodology: str = "h100_sxm_v1_calc_v8") -> Print:
    return Print(
        sku="H100",
        observed_at=T0 + timedelta(minutes=minutes),
        value=value,
        band=None if value is None else 0.8,
        status="ok" if value is not None else "no_print",
        reason=None if value is not None else "observation_missed",
        methodology_id=methodology,
    )


def _series(days: int, start: float = 3.0, step: float = 0.001) -> list[Print]:
    """One priced print every 15 minutes, rising by ``step`` each print."""
    n = days * 96
    return [_print(i * 15, round(start + i * step, 6)) for i in range(n + 1)]


def test_display_name_uses_form_factor_from_methodology():
    assert display_name("H100", [_print(0, 3.0, "h100_sxm_v1_calc_v16")]) == "H100 SXM"


def test_display_name_falls_back_to_sku_when_methodology_is_unexpected():
    assert display_name("H100", [_print(0, 3.0, "calc")]) == "H100"


def test_detail_contains_priced_points_only():
    prints = [_print(0, 3.0), _print(15, None), _print(30, 3.1)]
    detail = sku_detail("H100", prints, now=NOW)
    t = int(T0.timestamp())
    assert detail["points"] == [[t, 3.0], [t + 1800, 3.1]]
    assert detail["quality"] == {"prints": 3, "priced": 2, "gaps": 1}


def test_detail_keeps_full_detail_for_90_days_and_hourly_before():
    prints = _series(100)  # 100 days of 15-minute prints
    points = sku_detail("H100", prints, now=NOW)["points"]
    last_t = points[-1][0]
    old = [p for p in points if p[0] < last_t - 90 * 86400]
    recent = [p for p in points if p[0] >= last_t - 90 * 86400]
    assert len(recent) == 90 * 96 + 1
    assert len(old) == 10 * 24
    assert all(t % 3600 == 2700 for t, _ in old)  # last print (xx:45) of each hour


def test_detail_reports_last_print_and_band():
    detail = sku_detail("H100", _series(2), now=NOW)
    assert detail["schema"] == SCHEMA_VERSION
    assert detail["name"] == "H100 SXM"
    assert detail["last"]["value"] == pytest.approx(3.0 + 192 * 0.001)
    assert detail["last"]["band"] == 0.8
    assert detail["updated_at"] == "2026-11-16T08:00:00Z"


def test_detail_lists_each_methodology_switch_once():
    prints = [_print(0, 3.0, "a_v1"), _print(15, 3.1, "a_v1"), _print(30, 3.2, "a_v2")]
    versions = sku_detail("H100", prints, now=NOW)["versions"]
    assert [v["methodology_id"] for v in versions] == ["a_v1", "a_v2"]
    assert versions[1]["time"] == int((T0 + timedelta(minutes=30)).timestamp())


def test_detail_rejects_sku_with_no_priced_prints():
    with pytest.raises(SiteDataError, match="no priced"):
        sku_detail("H100", [_print(0, None)], now=NOW)


def test_summary_change_is_against_value_24h_before_last_print():
    prints = _series(3)
    row = summary([("H100", prints)], now=NOW)["skus"][0]
    last = 3.0 + 288 * 0.001
    day_ago = 3.0 + 192 * 0.001
    assert row["change_24h"]["abs"] == pytest.approx(last - day_ago)
    assert row["change_24h"]["pct"] == pytest.approx((last / day_ago - 1) * 100)


def test_summary_change_is_null_without_24h_of_history():
    row = summary([("H100", _series(0)[:10])], now=NOW)["skus"][0]
    assert row["change_24h"] is None


def test_summary_sparkline_is_bounded_and_ends_on_last_print():
    prints = _series(3)
    row = summary([("H100", prints)], now=NOW)["skus"][0]
    spark = row["spark"]
    assert 2 <= len(spark) <= SPARK_POINTS + 1
    assert spark[-1] == [row["last"]["time"], row["last"]["value"]]
    assert spark[0][0] <= row["last"]["time"] - 86400


def test_summary_keeps_requested_sku_order():
    out = summary([("H200", _series(1)), ("H100", _series(1))], now=NOW)
    assert [r["sku"] for r in out["skus"]] == ["H200", "H100"]
