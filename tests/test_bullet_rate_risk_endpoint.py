from __future__ import annotations

import sys

import pytest
from fastapi.testclient import TestClient

from api.index import app
from api.rate_risk_cache import rate_risk_cache


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
        # locked
        {"slot": 1, "buy_in_months": 0, "cd_term_months": 12, "product_id": "prod1", "allocation": 10000, "after_tax_apy": 3.0},
        # deferred
        {"slot": 2, "buy_in_months": 6, "cd_term_months": 12, "product_id": "prod2", "allocation": 5000, "after_tax_apy": 4.0},
        {"slot": 3, "buy_in_months": 12, "cd_term_months": 12, "product_id": "prod3", "allocation": 5000, "after_tax_apy": 4.0},
    ],
}


def test_returns_required_top_level_fields(client):
    body = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    for k in (
        "locked_amount",
        "locked_pct",
        "deferred_amount",
        "deferred_pct",
        "scenarios",
        "break_even_drop",
        "cache_hit",
        "ai_summary_input",
    ):
        assert k in body


def test_locked_tranches_unchanged_across_scenarios(client):
    body = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()

    # locked tranche return is always allocation * after_tax_apy * 1yr
    locked_return = round(10000 * (3.0 / 100.0) * (12 / 12), 2)
    impacts = {s["delta"]: s["dollar_impact"] for s in body["scenarios"]}

    # If only deferred changes, then for +0.5 scenario, impact equals deferred_allocation * 0.5% * 1yr
    expected_up = round((5000 + 5000) * (0.5 / 100.0) * 1.0, 2)
    assert impacts[0.5] == pytest.approx(expected_up)

    # Confirm flat total includes locked component
    flat = next(s for s in body["scenarios"] if s["delta"] == 0.0)
    assert flat["total_return"] >= locked_return


def test_dollar_impact_is_relative_to_flat(client):
    body = client.post("/strategy/bullet/rate-risk", json=BASE_REQ).json()
    flat_total = next(s["total_return"] for s in body["scenarios"] if s["delta"] == 0.0)
    for s in body["scenarios"]:
        assert s["dollar_impact"] == pytest.approx(round(s["total_return"] - flat_total, 2))


def test_effective_apy_never_below_zero(client):
    req = dict(BASE_REQ)
    req["tranches"] = [
        {"slot": 1, "buy_in_months": 6, "cd_term_months": 12, "product_id": "prod1", "allocation": 20000, "after_tax_apy": 0.1},
    ]
    body = client.post("/strategy/bullet/rate-risk", json=req).json()
    drop1 = next(s for s in body["scenarios"] if s["delta"] == -1.0)
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

    # Verify ai_summary_input scenarios: only label and dollar_impact, no flat (delta==0)
    assert all(set(s.keys()) == {"label", "dollar_impact"} for s in ai["scenarios"])
    # Flat scenario should not be in ai_summary_input scenarios
    assert not any(s.get("label") == "Rates stay flat" for s in ai["scenarios"])


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
    # There's no OpenAI dependency here; this is a safeguard that the module isn't imported.
    client.post("/strategy/bullet/rate-risk", json=BASE_REQ)
    assert "openai" not in sys.modules

