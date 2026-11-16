from datetime import UTC, datetime, timedelta

import pytest

from gpu_terminal.poller import choose_window, with_retries

NOW = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)


@pytest.mark.parametrize(
    ("age", "window"),
    [
        (None, "90d"),  # first run: take everything published
        (timedelta(minutes=20), "24h"),
        (timedelta(hours=20), "24h"),
        (timedelta(hours=30), "7d"),
        (timedelta(days=10), "30d"),
        (timedelta(days=40), "90d"),
        (timedelta(days=200), "90d"),  # the most we can recover
    ],
)
def test_window_covers_the_gap_since_the_newest_stored_print(age, window):
    latest = None if age is None else NOW - age
    assert choose_window(latest, NOW) == window


def test_retries_network_errors_then_succeeds():
    calls, sleeps = [], []

    def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise ConnectionResetError("reset")
        return "ok"

    assert with_retries(flaky, delays=(1, 2, 4), sleep=sleeps.append) == "ok"
    assert sleeps == [1, 2]


def test_gives_up_after_the_last_retry():
    sleeps = []

    def down():
        raise TimeoutError("timed out")

    with pytest.raises(TimeoutError):
        with_retries(down, delays=(1, 2), sleep=sleeps.append)
    assert sleeps == [1, 2]


def test_does_not_retry_non_network_errors():
    sleeps = []

    def bad_digest():
        raise ValueError("sha256 mismatch")

    with pytest.raises(ValueError):
        with_retries(bad_digest, delays=(1, 2), sleep=sleeps.append)
    assert sleeps == []
