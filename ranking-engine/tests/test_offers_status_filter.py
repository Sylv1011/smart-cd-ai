import unittest

from data import DataClient


class _FakeResponse:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    """Minimal stand-in for the supabase-py PostgREST query builder.

    Filters an in-memory row set by every .eq() applied before .execute(),
    so the test verifies actual filtering behavior rather than asserting
    on which builder methods were called.
    """

    def __init__(self, rows):
        self._rows = rows

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, field, value):
        self._rows = [r for r in self._rows if r.get(field) == value]
        return self

    def execute(self):
        return _FakeResponse(self._rows)


class _FakeTable:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *_args, **_kwargs):
        return _FakeQuery(list(self._rows))


class _FakeSupabaseClient:
    def __init__(self, rows):
        self._rows = rows

    def table(self, _name):
        return _FakeTable(self._rows)


def _offer_row(*, institution_name, term_months=12, status="active"):
    return {
        "product_type": "bank_cd",
        "institution_name": institution_name,
        "brokerage_firm": None,
        "issuing_bank": None,
        "term_months": term_months,
        "apy": 4.0,
        "minimum_deposit": 500.0,
        "fdic_insured": True,
        "source_name": "static",
        "source_url": None,
        "destination_url": None,
        "retrieved_at": "2026-07-20T00:00:00Z",
        "status": status,
    }


def _make_client(rows) -> DataClient:
    client = DataClient.__new__(DataClient)
    client.sb = _FakeSupabaseClient(rows)
    client.offers_table = "offers"
    client._offers_cache = {}
    client._offers_cache_ts = {}
    client._metrics = {"offers_hit": 0, "offers_miss": 0, "offers_expired": 0}
    client.OFFERS_CACHE_TTL = 9 * 60 * 60
    return client


class FetchOffersStatusFilterTests(unittest.TestCase):
    def test_excludes_inactive_offers(self):
        rows = [
            _offer_row(institution_name="Active Bank", status="active"),
            _offer_row(institution_name="Retired Bank", status="inactive"),
        ]
        client = _make_client(rows)

        offers = client.fetch_offers(12)

        names = [o.institution_name for o in offers]
        self.assertIn("Active Bank", names)
        self.assertNotIn("Retired Bank", names)

    def test_returns_active_offers_matching_term(self):
        rows = [_offer_row(institution_name="Active Bank", term_months=12, status="active")]
        client = _make_client(rows)

        offers = client.fetch_offers(12)

        self.assertEqual(len(offers), 1)
        self.assertEqual(offers[0].institution_name, "Active Bank")


if __name__ == "__main__":
    unittest.main()
