from __future__ import annotations

import sys

import pytest
from fastapi.testclient import TestClient

from bullet_rate_risk import (
    TrancheRateRisk,
    compute_best_single_cd_return,
    compute_break_even,
    compute_portfolio_totals,
    deferred_flat_total,
    deferred_term_avg_months,
)
from main import app
from rate_risk_cache import rate_risk_cache


@pytest.fixture(autouse=True)
def reset_cache():
    rate_risk_cache._store.clear()
    yield


@pytest.fixture()
def client():
    return TestClient(app)


BASE_REQ = {
    "investment_amount": 20000,
    "user_state": "New York",
    "user_income_range": "$100k-$200k",
    "tranches": [
        {"slot": 1, "buy_in_months": 0, "cd_term_months": 12, "product_id": "prod1", "allocation": 10000, "after_tax_apy": 3.0},
        {"slot": 2, "buy_in_months": 6, "cd_term_months": 12, "product_id": "prod2", "allocation": 5000, "after_tax_apy": 4.0},
        {"slot": 3, "buy_in_months": 12, "cd_term_months": 12, "product_id": "prod3", "allocation": 5000, "after_tax_apy": 4.0},
    ],
}


def _mixed_tranches() -> list[TrancheRateRisk]:
    return [
        TrancheRateRisk(allocation=10000, after_tax_apy=3.0, term_months=12, buy_in_months=0),
        TrancheRateRisk(allocation=5000, after_tax_apy=4.0, term_months=12, buy_in_months=6),
        TrancheRateRisk(allocation=5000, after_tax_apy=4.0, term_months=12, buy_in_months=12),
    ]


def _old_inflated_break_even(full_flat_total: float, best_single_cd_return: float, deferred_allocation: float, deferred_term_avg_months_value: float) -> float:
    if deferred_allocation <= 0 or deferred_term_avg_months_value <= 0:
        return 0.0
    advantage = float(full_flat_total) - float(best_single_cd_return)
    if advantage <= 0:
        return 0.0
    years = float(deferred_term_avg_months_value) / 12.0
    denom = float(deferred_allocation) * years
    if denom <= 0:
        return 0.0
    return round((advantage / denom) * 100.0, 2)


def test_returns_required_top_level_fields(client):
    body = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    for key in (
        "locked_amount",
        "locked_pct",
        "deferred_amount",
        "deferred_pct",
        "scenarios",
        "break_even_drop",
        "cache_hit",
        "ai_summary_input",
    ):
        assert key in body


def test_locked_tranches_unchanged_across_scenarios(client):
    body = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    locked_return = round(10000 * (3.0 / 100.0) * (12 / 12), 2)
    impacts = {scenario["delta"]: scenario["dollar_impact"] for scenario in body["scenarios"]}
    expected_up = round((5000 + 5000) * (0.5 / 100.0) * 1.0, 2)
    assert impacts[0.5] == pytest.approx(expected_up)
    flat = next(scenario for scenario in body["scenarios"] if scenario["delta"] == 0.0)
    assert flat["total_return"] >= locked_return


def test_dollar_impact_is_relative_to_flat(client):
    body = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    flat_total = next(scenario["total_return"] for scenario in body["scenarios"] if scenario["delta"] == 0.0)
    for scenario in body["scenarios"]:
        assert scenario["dollar_impact"] == pytest.approx(round(scenario["total_return"] - flat_total, 2))


def test_effective_apy_never_below_zero(client):
    req = dict(BASE_REQ)
    req["tranches"] = [
        {"slot": 1, "buy_in_months": 6, "cd_term_months": 12, "product_id": "prod1", "allocation": 20000, "after_tax_apy": 0.1},
    ]
    body = client.post("/strategy/bullet/rate-risk", json=req).json()
    drop1 = next(scenario for scenario in body["scenarios"] if scenario["delta"] == -1.0)
    assert drop1["total_return"] == 0.0


def test_ai_summary_input_exact_shape(client):
    body = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    ai = body["ai_summary_input"]
    assert set(ai.keys()) == {
        "locked_pct",
        "deferred_pct",
        "worst_case_dollar_impact",
        "break_even_drop",
        "user_state",
        "flat_total_return",
        "scenarios",
    }
    assert all(set(scenario.keys()) == {"label", "dollar_impact"} for scenario in ai["scenarios"])
    assert not any(scenario.get("label") == "Rates stay flat" for scenario in ai["scenarios"])


def test_request_rejects_extra_fields(client):
    bad = dict(BASE_REQ)
    bad["tranches"] = [dict(BASE_REQ["tranches"][0], extra_field="nope")]
    resp = client.post("/strategy/bullet/rate-risk", json=bad)
    assert resp.status_code == 422


def test_allocation_sum_must_equal_investment_amount(client):
    bad = dict(BASE_REQ)
    bad["tranches"] = [
        {"slot": 1, "buy_in_months": 0, "cd_term_months": 12, "product_id": "prod1", "allocation": 1000, "after_tax_apy": 3.0},
    ]
    resp = client.post("/strategy/bullet/rate-risk", json=bad)
    assert resp.status_code == 400


def test_cache_hit_returns_true_and_is_deterministic(client):
    body1 = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    assert body1["cache_hit"] is False
    body2 = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    assert body2["cache_hit"] is True
    assert body2["ai_summary_input"] == body1["ai_summary_input"]


def test_endpoint_does_not_call_ai_layer(client):
    client.post("/strategy/bullet/rate-risk", json=BASE_REQ)
    assert "openai" not in sys.modules


def test_mixed_portfolio_break_even_excludes_locked_returns():
    tranches = _mixed_tranches()
    deferred_avg = deferred_term_avg_months(tranches)
    deferred_total = deferred_flat_total(tranches)
    allocation = sum(tranche.allocation for tranche in tranches if not tranche.is_locked)
    best_single = compute_best_single_cd_return(20000, tranches, deferred_avg)

    corrected = compute_break_even(
        deferred_flat_return=deferred_total,
        best_single_cd_return=best_single,
        deferred_allocation=allocation,
        deferred_term_avg_months_value=deferred_avg,
    )

    full_flat_total = next(scenario["total_return"] for scenario in compute_portfolio_totals(tranches) if scenario["delta"] == 0.0)
    inflated = _old_inflated_break_even(full_flat_total, best_single, allocation, deferred_avg)

    assert corrected == 0.0
    assert inflated > corrected
