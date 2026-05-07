import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app


class StrategySimulateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def _base_payload(self):
        return {
            "strategy_type": "barbell",
            "investment_amount": 10000,
            "state": "NY",
            "income_range": "$100,000 - $150,000",
            "filing_status": "single",
            "local_area": "manhattan",
            "liquidity_preference": "high",
            "rate_outlook": "rising",
        }

    def test_barbell_success_shape(self):
        res = self.client.post("/strategies/simulate", json=self._base_payload())
        self.assertEqual(res.status_code, 200)
        body = res.json()

        self.assertEqual(body["strategy"], "barbell")
        self.assertIn("allocation", body)
        self.assertIn("selected_products", body)
        self.assertIn("portfolio", body)
        self.assertIn("simulation", body)

        self.assertEqual(body["allocation"]["short_term_percentage"], 70)
        self.assertEqual(body["allocation"]["long_term_percentage"], 30)
        self.assertAlmostEqual(body["allocation"]["short_term_amount"], 7000.0, places=2)
        self.assertAlmostEqual(body["allocation"]["long_term_amount"], 3000.0, places=2)

        self.assertEqual(body["selected_products"]["short_term"]["term_months"], 6)
        self.assertEqual(body["selected_products"]["long_term"]["term_months"], 60)

        scenario_names = [x["name"] for x in body["simulation"]["scenarios"]]
        self.assertEqual(scenario_names, ["rates_rise", "rates_fall"])

    def test_barbell_requires_liquidity_preference(self):
        payload = self._base_payload()
        payload["liquidity_preference"] = None
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 422)
        self.assertIn("liquidity_preference", str(res.json()))

    def test_invalid_state(self):
        payload = self._base_payload()
        payload["state"] = "XX"
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["detail"], "Invalid state provided")

    def test_ladder_placeholder(self):
        payload = self._base_payload()
        payload["strategy_type"] = "ladder"
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 501)
        self.assertIn("not implemented", res.json()["detail"].lower())

    def test_bullet_placeholder(self):
        payload = self._base_payload()
        payload["strategy_type"] = "bullet"
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 501)
        self.assertIn("not implemented", res.json()["detail"].lower())

    def test_rank_endpoint_still_works(self):
        payload = {
            "investment_amount": 10000,
            "term_months": 12,
            "state": "NY",
            "income_range": "$100,000 - $150,000",
            "filing_status": "single",
            "local_area": "manhattan",
        }
        res = self.client.post("/rank", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("bank_cds", body)
        self.assertIn("brokered_cds", body)
        self.assertIn("treasuries", body)
        self.assertIn("overall_top", body)

    def test_warns_for_short_horizon(self):
        payload = self._base_payload()
        payload["time_horizon"] = "0.5"
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("warnings", body)
        self.assertTrue(any("short horizons" in w.lower() for w in body["warnings"]))

    def test_fallback_to_ladder_when_no_long_term_data(self):
        payload = self._base_payload()

        short_result = {
            "bank_cds": [
                {
                    "product_type": "bank_cd",
                    "institution_name": "Citibank",
                    "brokerage_firm": None,
                    "issuing_bank": None,
                    "term_months": 6,
                    "apy_nominal": 4.0,
                    "after_tax_apy": 3.0,
                    "minimum_deposit": 1000.0,
                    "source_name": "mock",
                    "source_url": "https://example.com",
                    "destination_url": "https://example.com",
                    "fdic_insured": True,
                    "retrieved_at": "2026-01-01T00:00:00Z",
                    "investment_amount": 7000.0,
                    "term_fraction_years": 0.5,
                    "nominal_interest_usd": 140.0,
                    "after_tax_interest_usd": 105.0,
                    "total_marginal_tax_rate": 0.25,
                    "fed_rate": 0.2,
                    "state_rate": 0.04,
                    "local_rate": 0.01,
                    "match_percentage": 95,
                }
            ],
            "brokered_cds": [],
            "treasuries": [],
            "overall_top": [],
        }
        long_result = {
            "bank_cds": [],
            "brokered_cds": [],
            "treasuries": [],
            "overall_top": [],
        }

        with patch("strategies.barbell.rank_offers", side_effect=[short_result, long_result]):
            res = self.client.post("/strategies/simulate", json=payload)

        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["fallback_strategy"], "ladder")
        self.assertIsNone(body["selected_products"]["long_term"])
        self.assertTrue(any("long-term cd data" in w.lower() for w in body["warnings"]))


if __name__ == "__main__":
    unittest.main()
