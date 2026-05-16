import time

import pytest

from api.rate_risk_cache import RateRiskCache


@pytest.fixture()
def cache():
    return RateRiskCache()


def test_ttl_is_24_hours(cache):
    assert cache.TTL == 86400


def test_make_key_is_deterministic(cache):
    k1 = cache.make_key(3.201, 2.0, 6, 12, "New York", "$100k-$200k")
    k2 = cache.make_key(3.20, 2.00, 6, 12, "New York", "$100k-$200k")
    assert k1 == k2


def test_expired_entry_returns_none(cache):
    cache.set("k1", {"ok": True})
    payload, ts = cache._store["k1"]
    cache._store["k1"] = (payload, time.time() - cache.TTL - 1)
    assert cache.get("k1") is None

