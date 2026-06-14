import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


VALID_REQUEST = {
    "ai_summary_input": {
        "locked_pct": 33,
        "deferred_pct": 67,
        "worst_case_dollar_impact": -165,
        "break_even_drop": 0.82,
        "user_state": "New York",
        "flat_total_return": 862,
        "scenarios": [
            {"label": "Rates drop 0.5%", "dollar_impact": -83},
            {"label": "Rates drop 1.0%", "dollar_impact": -165},
            {"label": "Rates rise 0.5%", "dollar_impact": 83},
        ],
    }
}


class TestBulletRateRiskSummaryEndpoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(main.app)

    def test_valid_request_returns_summary(self) -> None:
        with patch(
            "main.summarize_bullet_rate_risk",
            return_value={
                "headline": "Mostly locked, limited downside risk.",
                "insight": "Most of the plan is already locked, while future purchases stay exposed only if rates move further down.",
                "cache_hit": False,
            },
        ):
            response = self.client.post("/strategy/bullet/rate-risk/summary", json=VALID_REQUEST)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["headline"], "Mostly locked, limited downside risk.")

    def test_missing_fields_are_rejected(self) -> None:
        invalid_request = {"ai_summary_input": {"locked_pct": 33}}
        response = self.client.post("/strategy/bullet/rate-risk/summary", json=invalid_request)

        self.assertEqual(response.status_code, 422)

    def test_extra_fields_are_rejected(self) -> None:
        invalid_request = {
            "ai_summary_input": {
                **VALID_REQUEST["ai_summary_input"],
                "product_id": "should-not-be-here",
            }
        }
        response = self.client.post("/strategy/bullet/rate-risk/summary", json=invalid_request)

        self.assertEqual(response.status_code, 422)

    def test_service_invalid_json_error_returns_502(self) -> None:
        with patch(
            "main.summarize_bullet_rate_risk",
            side_effect=main.AIServiceResponseError("AI summary did not return valid JSON."),
        ):
            response = self.client.post("/strategy/bullet/rate-risk/summary", json=VALID_REQUEST)

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"]["code"], "invalid_ai_response")

    def test_endpoint_passes_only_ai_summary_input_to_service(self) -> None:
        with patch(
            "main.summarize_bullet_rate_risk",
            return_value={
                "headline": "Mostly locked, limited downside risk.",
                "insight": "Most of the plan is already locked, while future purchases stay exposed only if rates move further down.",
                "cache_hit": False,
            },
        ) as mock_summary:
            response = self.client.post("/strategy/bullet/rate-risk/summary", json=VALID_REQUEST)

        self.assertEqual(response.status_code, 200)
        mock_summary.assert_called_once_with(VALID_REQUEST["ai_summary_input"])


if __name__ == "__main__":
    unittest.main()
