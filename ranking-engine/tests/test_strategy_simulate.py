import unittest

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
            "target_maturity_months": 60,
        }

    def test_barbell_success_shape(self):
        res = self.client.post("/strategies/simulate", json=self._base_payload())
        self.assertEqual(res.status_code, 200)
        body = res.json()

        self.assertEqual(body["strategy"], "barbell")
        self.assertTrue(body["barbell_eligible"])
        self.assertIn("default_split", body)
        self.assertIn("selected_split", body)
        self.assertIn("split_candidates", body)
        self.assertIn("portfolio", body["selected_split"])
        self.assertIn("selected_products", body["selected_split"])
        self.assertIn("short_term", body["selected_split"]["selected_products"])
        self.assertIn("long_term", body["selected_split"]["selected_products"])

    def test_invalid_state(self):
        payload = self._base_payload()
        payload["state"] = "XX"
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["detail"], "Invalid state provided")

    def test_ladder_requires_liquidity_preference(self):
        payload = self._base_payload()
        payload["strategy_type"] = "ladder"
        payload["time_horizon"] = "3"
        # liquidity_preference not set — ladder requires it
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 422)

    def test_bullet_requires_time_horizon(self):
        payload = self._base_payload()
        payload["strategy_type"] = "bullet"
        # base payload has target_maturity_months but no time_horizon; bullet needs time_horizon
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 422)

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
        payload["target_maturity_months"] = None
        payload["time_horizon"] = "0.5"
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertFalse(body["barbell_eligible"])
        self.assertIn("warnings", body)
        self.assertTrue(any("under 12 months" in w.lower() for w in body["warnings"]))

    def test_ineligible_when_duration_under_12_months(self):
        payload = self._base_payload()
        payload["target_maturity_months"] = 9
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertFalse(body["barbell_eligible"])
        self.assertIn("not recommended", body["message"].lower())


if __name__ == "__main__":
    unittest.main()
