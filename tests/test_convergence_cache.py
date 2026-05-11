import time
import pytest
from api.convergence_cache import ConvergenceCache


@pytest.fixture
def cache():
    return ConvergenceCache()


class TestCacheKey:
    def test_same_config_same_key(self, cache):
        tranches_a = [
            {"product_id": "abc", "buy_in_months": 0, "required_term_months": 12},
            {"product_id": "def", "buy_in_months": 3, "required_term_months": 9},
        ]
        tranches_b = [  # same entries, different order
            {"product_id": "def", "buy_in_months": 3, "required_term_months": 9},
            {"product_id": "abc", "buy_in_months": 0, "required_term_months": 12},
        ]
        assert cache.make_key("2027-05-07", tranches_a) == cache.make_key("2027-05-07", tranches_b)

    def test_different_date_different_key(self, cache):
        tranches = [{"product_id": "abc", "buy_in_months": 0, "required_term_months": 12}]
        assert cache.make_key("2027-05-07", tranches) != cache.make_key("2028-05-07", tranches)

    def test_different_product_id_different_key(self, cache):
        t_a = [{"product_id": "abc", "buy_in_months": 0, "required_term_months": 12}]
        t_b = [{"product_id": "xyz", "buy_in_months": 0, "required_term_months": 12}]
        assert cache.make_key("2027-05-07", t_a) != cache.make_key("2027-05-07", t_b)

    def test_investment_amount_not_in_key(self, cache):
        # make_key does not accept investment_amount — it's structurally excluded
        tranches = [{"product_id": "abc", "buy_in_months": 0, "required_term_months": 12}]
        key1 = cache.make_key("2027-05-07", tranches)
        key2 = cache.make_key("2027-05-07", tranches)
        assert key1 == key2


class TestCacheGetSet:
    def test_miss_returns_none(self, cache):
        assert cache.get("no-such-key") is None

    def test_hit_returns_stored_value(self, cache):
        payload = {"overall_score": 87, "confidence_label": "High"}
        cache.set("k1", payload)
        assert cache.get("k1") == payload

    def test_ttl_is_24_hours(self, cache):
        assert cache.TTL == 86400

    def test_expired_entry_returns_none(self, cache):
        payload = {"overall_score": 87}
        cache.set("k1", payload)
        # Backdate the stored timestamp past TTL
        value, _, pids = cache._store["k1"]
        cache._store["k1"] = (value, time.time() - cache.TTL - 1, pids)
        assert cache.get("k1") is None


class TestCacheInvalidation:
    def test_invalidate_removes_entry_containing_product(self, cache):
        cache.set("k1", {"x": 1}, product_ids={"abc123", "def456"})
        cache.invalidate_by_product_ids(["abc123"])
        assert cache.get("k1") is None

    def test_invalidation_does_not_remove_unrelated_entry(self, cache):
        payload = {"x": 1}
        cache.set("k1", payload, product_ids={"abc123"})
        cache.set("k2", payload, product_ids={"ghi789"})
        cache.invalidate_by_product_ids(["abc123"])
        assert cache.get("k1") is None
        assert cache.get("k2") == payload

    def test_invalidation_removes_all_entries_sharing_product(self, cache):
        payload = {"x": 1}
        cache.set("k1", payload, product_ids={"abc123"})
        cache.set("k2", payload, product_ids={"abc123", "ghi789"})
        cache.invalidate_by_product_ids(["abc123"])
        assert cache.get("k1") is None
        assert cache.get("k2") is None
