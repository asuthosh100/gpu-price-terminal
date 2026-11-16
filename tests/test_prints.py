from datetime import UTC, datetime

import pytest

from gpu_terminal.prints import Print, PrintFormatError, parse_observation

OK = {
    "sku": "H100",
    "observed_at": "2026-11-16T06:15:00.000Z",
    "value_usd_gpu_hr": 3.973275,
    "stability_band_usd_gpu_hr": 0.893575,
    "status": "ok",
    "reason": None,
    "methodology_id": "h100_sxm_v1_calc_v16",
}
MISSED = {
    **OK,
    "observed_at": "2026-08-23T00:00:00.000Z",
    "value_usd_gpu_hr": None,
    "stability_band_usd_gpu_hr": None,
    "status": "no_print",
    "reason": "observation_missed",
}


def test_parses_priced_observation():
    p = parse_observation(OK)
    assert p == Print(
        sku="H100",
        observed_at=datetime(2026, 11, 16, 6, 15, tzinfo=UTC),
        value=3.973275,
        band=0.893575,
        status="ok",
        reason=None,
        methodology_id="h100_sxm_v1_calc_v16",
    )
    assert p.is_priced


def test_missed_observation_is_a_gap_not_a_price():
    p = parse_observation(MISSED)
    assert p.value is None
    assert not p.is_priced
    assert p.reason == "observation_missed"


def test_ok_status_without_a_number_is_refused():
    with pytest.raises(PrintFormatError):
        parse_observation({**OK, "value_usd_gpu_hr": None})


def test_missing_field_is_refused():
    broken = {k: v for k, v in OK.items() if k != "observed_at"}
    with pytest.raises(PrintFormatError):
        parse_observation(broken)
