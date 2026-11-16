from datetime import UTC, datetime, timedelta

import pytest

from gpu_terminal.candles import Candle, build_candles
from gpu_terminal.prints import Print

T0 = datetime(2026, 11, 16, 0, 0, tzinfo=UTC)


def _print(minutes: int, value: float | None) -> Print:
    return Print(
        sku="H100",
        observed_at=T0 + timedelta(minutes=minutes),
        value=value,
        band=None if value is None else 0.5,
        status="ok" if value is not None else "no_print",
        reason=None if value is not None else "observation_missed",
        methodology_id="m1",
    )


def test_ohlc_within_one_bucket():
    prints = [_print(0, 4.0), _print(15, 4.5), _print(30, 3.5), _print(45, 4.2)]
    [candle] = build_candles(prints, hours=2)
    assert candle == Candle(
        time=int(T0.timestamp()), open=4.0, high=4.5, low=3.5, close=4.2,
        band=0.5, n_prints=4, n_gaps=0,
    )


def test_buckets_align_to_utc_hours():
    prints = [_print(0, 4.0), _print(119, 4.1), _print(120, 4.2)]
    first, second = build_candles(prints, hours=2)
    assert first.close == 4.1
    assert second.time == int((T0 + timedelta(hours=2)).timestamp())
    assert second.open == 4.2


def test_gaps_are_counted_and_never_priced():
    prints = [_print(0, None), _print(15, 4.0), _print(30, None)]
    [candle] = build_candles(prints, hours=2)
    assert (candle.open, candle.close, candle.n_prints, candle.n_gaps) == (4.0, 4.0, 1, 2)


def test_bucket_with_only_gaps_produces_no_candle():
    prints = [_print(0, None), _print(15, None)]
    assert build_candles(prints, hours=2) == []


def test_unsorted_input_is_sorted_first():
    prints = [_print(30, 4.2), _print(0, 4.0)]
    [candle] = build_candles(prints, hours=2)
    assert (candle.open, candle.close) == (4.0, 4.2)


@pytest.mark.parametrize("hours", [0, 5, 7])
def test_bucket_size_must_divide_a_day(hours):
    with pytest.raises(ValueError):
        build_candles([], hours=hours)
