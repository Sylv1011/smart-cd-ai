from __future__ import annotations

from fastapi.testclient import TestClient

import pytest

from api.bullet_rate_risk import (
    TrancheRateRisk,
    compute_best_single_cd_return,
    compute_break_even,
    compute_portfolio_totals,
    deferred_flat_total,
    deferred_term_avg_months,
)
from api.index import app
from api.rate_risk_cache import rate_risk_cache


@pytest.fixture(autouse=True)
def reset_cache():
    rate_risk_cache._store.clear()
    yield


@pytest.fixture()
def client():
    return TestClient(app)


def _mixed_tranches() -> list[TrancheRateRisk]:
    return [
        TrancheRateRisk(allocation=10000, after_tax_apy=3.0, term_months=12, buy_in_months=0),
        TrancheRateRisk(allocation=5000, after_tax_apy=4.0, term_months=12, buy_in_months=6),
        TrancheRateRisk(allocation=5000, after_tax_apy=4.0, term_months=12, buy_in_months=12),
    ]


def _locked_only_tranches() -> list[TrancheRateRisk]:
    return [
        TrancheRateRisk(allocation=20000, after_tax_apy=3.0, term_months=12, buy_in_months=0),
    ]


def _deferred_only_tranches() -> list[TrancheRateRisk]:
    return [
        TrancheRateRisk(allocation=10000, after_tax_apy=4.0, term_months=12, buy_in_months=6),
        TrancheRateRisk(allocation=10000, after_tax_apy=4.25, term_months=12, buy_in_months=12),
    ]


def _old_inflated_break_even(full_flat_total: float, best_single_cd_return: float, deferred_allocation: float, deferred_term_avg_months: float) -> float:
    if deferred_allocation <= 0 or deferred_term_avg_months <= 0:
        return 0.0
    advantage = float(full_flat_total) - float(best_single_cd_return)
    if advantage <= 0:
        return 0.0
    years = float(deferred_term_avg_months) / 12.0
    denom = float(deferred_allocation) * years
    if denom <= 0:
        return 0.0
    return round((advantage / denom) * 100.0, 2)


def test_mixed_portfolio_break_even_excludes_locked_returns():
    tranches = _mixed_tranches()
    deferred_avg = deferred_term_avg_months(tranches)
    deferred_total = deferred_flat_total(tranches)
    alloc = sum(t.allocation for t in tranches if not t.is_locked)
    best_single = compute_best_single_cd_return(20000, tranches, deferred_avg)

    corrected = compute_break_even(
        deferred_flat_return=deferred_total,
        best_single_cd_return=best_single,
        deferred_allocation=alloc,
        deferred_term_avg_months=deferred_avg,
    )

    full_flat_total = next(s["total_return"] for s in compute_portfolio_totals(tranches) if s["delta"] == 0.0)
    inflated = _old_inflated_break_even(full_flat_total, best_single, alloc, deferred_avg)

    assert corrected == 0.0
    assert inflated > corrected


def test_fully_locked_portfolio_has_zero_break_even():
    tranches = _locked_only_tranches()
    deferred_avg = deferred_term_avg_months(tranches)
    deferred_total = deferred_flat_total(tranches)
    alloc = sum(t.allocation for t in tranches if not t.is_locked)
    best_single = compute_best_single_cd_return(20000, tranches, deferred_avg)

    assert compute_break_even(
        deferred_flat_return=deferred_total,
        best_single_cd_return=best_single,
        deferred_allocation=alloc,
        deferred_term_avg_months=deferred_avg,
    ) == 0.0


def test_fully_deferred_portfolio_remains_zero_when_single_cd_is_not_weaker():
    tranches = _deferred_only_tranches()
    deferred_avg = deferred_term_avg_months(tranches)
    deferred_total = deferred_flat_total(tranches)
    alloc = sum(t.allocation for t in tranches if not t.is_locked)
    best_single = compute_best_single_cd_return(20000, tranches, deferred_avg)

    assert compute_break_even(
        deferred_flat_return=deferred_total,
        best_single_cd_return=best_single,
        deferred_allocation=alloc,
        deferred_term_avg_months=deferred_avg,
    ) == 0.0


def test_zero_gap_scenario_returns_zero_break_even(client):
    body = client.post(
        "/strategy/bullet/rate-risk",
        json={
            "investment_amount": 20000,
            "user_state": "New York",
            "user_income_range": "$100k-$200k",
            "tranches": [
                {"slot": 1, "buy_in_months": 0, "cd_term_months": 12, "product_id": "prod1", "allocation": 10000, "after_tax_apy": 3.0},
                {"slot": 2, "buy_in_months": 6, "cd_term_months": 12, "product_id": "prod2", "allocation": 5000, "after_tax_apy": 4.0},
                {"slot": 3, "buy_in_months": 12, "cd_term_months": 12, "product_id": "prod3", "allocation": 5000, "after_tax_apy": 4.0},
            ],
        },
    ).json()

    assert body["break_even_drop"] == 0.0
    assert body["ai_summary_input"]["break_even_drop"] == 0.0