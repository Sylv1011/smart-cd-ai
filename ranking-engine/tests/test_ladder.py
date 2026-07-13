import pytest
from fastapi.testclient import TestClient

from engine import RankingEngineError
from strategies.ladder import (
    _calculate_weights,
    _interest_compound,
    _allocate_rungs,
    _select_terms,
    _to_years,
)
from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# _to_years
# ---------------------------------------------------------------------------

def test_to_years_named_horizons():
    assert _to_years("short") == 1.0
    assert _to_years("medium") == 3.0
    assert _to_years("long") == 5.0


def test_to_years_numeric_string():
    assert _to_years("2") == 2.0
    assert _to_years("2.5") == 2.5


def test_to_years_none_and_invalid():
    assert _to_years(None) is None
    assert _to_years("invalid") is None


# ---------------------------------------------------------------------------
# _select_terms
# ---------------------------------------------------------------------------

def test_select_terms_correct_per_horizon():
    assert _select_terms(10000, 1) == [3, 6, 12]
    assert _select_terms(10000, 2) == [6, 12, 24]
    assert _select_terms(10000, 3) == [12, 24, 36]
    assert _select_terms(10000, 4) == [12, 24, 36, 48]
    assert _select_terms(10000, 5) == [12, 24, 36, 48, 60]


def test_select_terms_reduces_for_small_investment():
    # $1,000 / 5 rungs = $200 < $500 threshold
    terms = _select_terms(1000, 5)
    assert len(terms) <= 3
    assert 1000 / len(terms) >= 500


def test_select_terms_minimum_two_rungs():
    # Even a tiny investment never drops below 2 rungs
    terms = _select_terms(100, 5)
    assert len(terms) >= 2


def test_select_terms_large_investment_keeps_all():
    assert len(_select_terms(50000, 5)) == 5


# ---------------------------------------------------------------------------
# _calculate_weights
# ---------------------------------------------------------------------------

def test_weights_sum_to_one():
    for n in range(2, 6):
        for liq in ("low", "medium", "high"):
            for outlook in ("rising", "stable", "falling"):
                weights = _calculate_weights(n, liq, outlook)
                assert abs(sum(weights) - 1.0) < 1e-9, (
                    f"n={n} liq={liq} outlook={outlook} sum={sum(weights)}"
                )


def test_weights_all_positive():
    for n in range(2, 6):
        for liq in ("low", "medium", "high"):
            weights = _calculate_weights(n, liq, "stable")
            assert all(w > 0 for w in weights)


def test_weights_medium_stable_are_equal():
    weights = _calculate_weights(5, "medium", "stable")
    for w in weights:
        assert abs(w - 0.2) < 1e-9


def test_weights_high_liquidity_tilts_short():
    weights = _calculate_weights(5, "high", "stable")
    # Each weight should be strictly decreasing (shorter rungs heavier)
    for i in range(len(weights) - 1):
        assert weights[i] > weights[i + 1]


def test_weights_low_liquidity_tilts_long():
    weights = _calculate_weights(5, "low", "stable")
    # Each weight should be strictly increasing (longer rungs heavier)
    for i in range(len(weights) - 1):
        assert weights[i] < weights[i + 1]


def test_weights_rising_rates_shift_toward_short():
    stable = _calculate_weights(5, "medium", "stable")
    rising = _calculate_weights(5, "medium", "rising")
    # First rung gets more weight with rising rates
    assert rising[0] > stable[0]
    # Last rung gets less weight
    assert rising[-1] < stable[-1]


# ---------------------------------------------------------------------------
# _interest_compound
# ---------------------------------------------------------------------------

def test_interest_compound_one_year():
    # For exactly 1 year: P × r (compound collapses to simple)
    result = _interest_compound(10000, 5.0, 12)
    assert abs(result - 500.0) < 0.01


def test_interest_compound_multi_year():
    # $10k at 5% APY for 5 years: 10000 × (1.05^5 - 1) = 2762.82
    result = _interest_compound(10000, 5.0, 60)
    assert abs(result - 2762.82) < 0.10


def test_interest_compound_zero_apy():
    assert _interest_compound(10000, 0.0, 36) == 0.0


def test_interest_compound_exceeds_simple_for_multi_year():
    # Compound always yields more than simple for t > 1 year
    compound = _interest_compound(10000, 4.5, 60)
    simple = 10000 * (4.5 / 100) * (60 / 12)
    assert compound > simple


# ---------------------------------------------------------------------------
# _allocate_rungs
# ---------------------------------------------------------------------------

def _make_rung(rung_n, term, min_deposit=0.0):
    return {
        "rung": rung_n,
        "target_term_months": term,
        "product": {"minimum_deposit": min_deposit, "after_tax_apy": 4.0},
    }


def test_allocate_rungs_sums_to_total():
    rungs = [_make_rung(i + 1, t) for i, t in enumerate([12, 24, 36, 48, 60])]
    weights = _calculate_weights(5, "medium", "stable")
    result = _allocate_rungs(rungs, 10000.0, weights)
    total = sum(r["allocation_amount"] for r in result)
    assert abs(total - 10000.0) < 0.02


def test_allocate_rungs_respects_minimum_deposit():
    # Last rung has a high minimum that forces pinning
    rungs = [
        _make_rung(1, 12, min_deposit=0.0),
        _make_rung(2, 24, min_deposit=0.0),
        _make_rung(3, 36, min_deposit=4000.0),  # forces pin
    ]
    weights = _calculate_weights(3, "medium", "stable")
    result = _allocate_rungs(rungs, 10000.0, weights)
    assert result[2]["allocation_amount"] >= 4000.0


def test_allocate_rungs_raises_when_minimums_exceed_total():
    rungs = [
        _make_rung(1, 12, min_deposit=6000.0),
        _make_rung(2, 24, min_deposit=6000.0),
    ]
    weights = [0.5, 0.5]
    with pytest.raises(RankingEngineError, match="minimums"):
        _allocate_rungs(rungs, 10000.0, weights)


# ---------------------------------------------------------------------------
# Integration: /strategies/simulate (ladder)
# ---------------------------------------------------------------------------

def _ladder_payload(**overrides):
    base = {
        "strategy_type": "ladder",
        "investment_amount": 10000,
        "state": "NY",
        "income_range": "$75,000 - $100,000",
        "filing_status": "single",
        "local_area": "manhattan",
        "liquidity_preference": "medium",
        "time_horizon": "5",
    }
    base.update(overrides)
    return base


def test_ladder_endpoint_returns_200():
    resp = client.post("/strategies/simulate", json=_ladder_payload())
    assert resp.status_code == 200


def test_ladder_response_shape():
    resp = client.post("/strategies/simulate", json=_ladder_payload())
    body = resp.json()
    assert body["strategy"] == "ladder"
    assert "horizon_years" in body
    assert "total_investment" in body
    assert "blended_after_tax_apy" in body
    assert "rungs" in body
    assert "portfolio" in body
    assert "simulation" in body
    assert "warnings" in body


def test_ladder_rung_fields():
    resp = client.post("/strategies/simulate", json=_ladder_payload())
    rung = resp.json()["rungs"][0]
    for field in ("rung", "target_term_months", "allocation_amount", "allocation_pct", "product"):
        assert field in rung, f"Missing rung field: {field}"


def test_ladder_allocation_sums_to_investment():
    resp = client.post("/strategies/simulate", json=_ladder_payload())
    rungs = resp.json()["rungs"]
    total = sum(r["allocation_amount"] for r in rungs)
    assert abs(total - 10000) < 0.10


def test_ladder_works_without_liquidity_preference():
    # The optimizer is now yield-based; liquidity_preference is optional.
    payload = _ladder_payload()
    del payload["liquidity_preference"]
    resp = client.post("/strategies/simulate", json=payload)
    assert resp.status_code == 200


def test_ladder_rejects_invalid_liquidity():
    resp = client.post("/strategies/simulate", json=_ladder_payload(liquidity_preference="extreme"))
    assert resp.status_code == 422


def test_ladder_rejects_invalid_time_horizon():
    resp = client.post("/strategies/simulate", json=_ladder_payload(time_horizon="invalid"))
    assert resp.status_code == 422


def test_ladder_short_horizon_adds_warning():
    resp = client.post("/strategies/simulate", json=_ladder_payload(time_horizon="0.5"))
    assert resp.status_code == 200
    warnings = resp.json()["warnings"]
    assert any("short" in w.lower() for w in warnings)


def test_ladder_accepts_product_type_filter():
    resp = client.post("/strategies/simulate", json=_ladder_payload(product_type_filter="Treasuries"))
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Optimized vs equal-split allocation
# ---------------------------------------------------------------------------

def test_ladder_returns_optimization_block():
    body = client.post("/strategies/simulate", json=_ladder_payload()).json()
    opt = body["optimization"]
    for field in ("gain_usd", "gain_apy", "optimized", "equal_split"):
        assert field in opt, f"Missing optimization field: {field}"
    assert "blended_after_tax_apy" in opt["optimized"]
    assert "after_tax_interest_usd" in opt["equal_split"]


def test_ladder_optimized_blended_apy_at_least_equal():
    # Weighting toward higher-yield rungs raises the blended APY vs equal split.
    opt = client.post("/strategies/simulate", json=_ladder_payload()).json()["optimization"]
    assert opt["optimized"]["blended_after_tax_apy"] >= opt["equal_split"]["blended_after_tax_apy"] - 1e-6


def test_ladder_rungs_carry_equal_and_delta_fields():
    rungs = client.post("/strategies/simulate", json=_ladder_payload()).json()["rungs"]
    for r in rungs:
        for field in ("equal_allocation_pct", "equal_allocation_amount", "delta_pct", "alternatives"):
            assert field in r, f"Missing rung field: {field}"


def test_ladder_equal_allocation_sums_to_investment():
    rungs = client.post("/strategies/simulate", json=_ladder_payload()).json()["rungs"]
    total = sum(r["equal_allocation_amount"] for r in rungs)
    assert abs(total - 10000) < 0.10


def test_ladder_has_inverted_curve_flag_and_reason():
    body = client.post("/strategies/simulate", json=_ladder_payload()).json()
    assert isinstance(body["inverted_curve"], bool)
    assert isinstance(body["allocation_reason"], str) and body["allocation_reason"]


def test_ladder_simulation_has_both_scenarios():
    resp = client.post("/strategies/simulate", json=_ladder_payload())
    scenarios = resp.json()["simulation"]["scenarios"]
    names = [s["name"] for s in scenarios]
    assert "rates_rise" in names
    assert "rates_fall" in names


def test_ladder_simulation_rates_rise_exceeds_rates_fall():
    resp = client.post("/strategies/simulate", json=_ladder_payload())
    scenarios = {s["name"]: s for s in resp.json()["simulation"]["scenarios"]}
    assert (
        scenarios["rates_rise"]["estimated_after_tax_interest_usd"]
        > scenarios["rates_fall"]["estimated_after_tax_interest_usd"]
    )


def test_invalid_strategy_type_returns_422():
    resp = client.post("/strategies/simulate", json={
        **_ladder_payload(),
        "strategy_type": "unknown_strategy",
    })
    assert resp.status_code == 422
