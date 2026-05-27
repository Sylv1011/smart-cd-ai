import time

import pytest

from api.rate_risk_cache import RateRiskCache


@pytest.fixture()
def cache():
    return RateRiskCache()


def test_ttl_is_24_hours(cache):
    assert cache.TTL == 86400


def _request(
    *,
    investment_amount=20000,
    user_state="New York",
    user_income_range="$100k-$200k",
    tranches=None,
):
    if tranches is None:
        tranches = [
            {
                "slot": 1,
                "product_id": "prod-1",
                "allocation": 10000,
                "after_tax_apy": 3.25,
                "buy_in_months": 0,
                "cd_term_months": 12,
            },
            {
                "slot": 2,
                "product_id": "prod-2",
                "allocation": 5000,
                "after_tax_apy": 4.0,
                "buy_in_months": 6,
                "cd_term_months": 12,
            },
            {
                "slot": 3,
                "product_id": "prod-3",
                "allocation": 5000,
                "after_tax_apy": 4.1,
                "buy_in_months": 12,
                "cd_term_months": 12,
            },
        ]
    return {
        "investment_amount": investment_amount,
        "user_state": user_state,
        "user_income_range": user_income_range,
        "tranches": tranches,
    }


def test_make_key_is_deterministic_for_same_normalized_request(cache):
    req1 = _request(user_state=" New York ", user_income_range=" $100k-$200k ")
    req2 = _request(user_state="new york", user_income_range="$100k-$200k")
    k1 = cache.make_key(**req1)
    k2 = cache.make_key(**req2)
    assert k1 == k2


def test_different_allocations_produce_different_keys(cache):
    req1 = _request()
    req2 = _request(
        tranches=[
            {
                "slot": 1,
                "product_id": "prod-1",
                "allocation": 9000,
                "after_tax_apy": 3.25,
                "buy_in_months": 0,
                "cd_term_months": 12,
            },
            {
                "slot": 2,
                "product_id": "prod-2",
                "allocation": 6000,
                "after_tax_apy": 4.0,
                "buy_in_months": 6,
                "cd_term_months": 12,
            },
            {
                "slot": 3,
                "product_id": "prod-3",
                "allocation": 5000,
                "after_tax_apy": 4.1,
                "buy_in_months": 12,
                "cd_term_months": 12,
            },
        ]
    )
    assert cache.make_key(**req1) != cache.make_key(**req2)


def test_different_product_ids_produce_different_keys(cache):
    req1 = _request()
    req2 = _request(
        tranches=[
            {
                "slot": 1,
                "product_id": "prod-1",
                "allocation": 10000,
                "after_tax_apy": 3.25,
                "buy_in_months": 0,
                "cd_term_months": 12,
            },
            {
                "slot": 2,
                "product_id": "different-prod",
                "allocation": 5000,
                "after_tax_apy": 4.0,
                "buy_in_months": 6,
                "cd_term_months": 12,
            },
            {
                "slot": 3,
                "product_id": "prod-3",
                "allocation": 5000,
                "after_tax_apy": 4.1,
                "buy_in_months": 12,
                "cd_term_months": 12,
            },
        ]
    )
    assert cache.make_key(**req1) != cache.make_key(**req2)


def test_different_investment_amounts_produce_different_keys(cache):
    req1 = _request(investment_amount=20000)
    req2 = _request(investment_amount=25000)
    assert cache.make_key(**req1) != cache.make_key(**req2)


def test_tranche_order_does_not_affect_logically_identical_key(cache):
    req1 = _request()
    req2 = _request(
        tranches=[
            req1["tranches"][2],
            req1["tranches"][0],
            req1["tranches"][1],
        ],
    )
    assert cache.make_key(**req1) == cache.make_key(**req2)


def test_expired_entry_returns_none(cache):
    cache.set("k1", {"ok": True})
    payload, ts = cache._store["k1"]
    cache._store["k1"] = (payload, time.time() - cache.TTL - 1)
    assert cache.get("k1") is None

