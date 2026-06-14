import unittest
from unittest.mock import patch

import ai_service
from ai_service import AIServiceConfigError, AIServiceResponseError
from bullet_rate_risk_cache import BulletRateRiskSummaryCache


VALID_INPUT = {
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


class TestBulletRateRiskSummaryService(unittest.TestCase):
    def setUp(self) -> None:
        ai_service.bullet_rate_risk_summary_cache.clear()

    def test_valid_summary_returns_headline_and_insight(self) -> None:
        raw_response = (
            '{"headline":"Mostly locked, limited downside risk.",'
            '"insight":"Most of the plan is already locked, while future purchases stay exposed only if rates move further down."}'
        )

        with patch("ai_service._call_llm", return_value=raw_response) as mock_call:
            result = ai_service.summarize_bullet_rate_risk(VALID_INPUT)

        self.assertEqual(result["headline"], "Mostly locked, limited downside risk.")
        self.assertIn("future purchases", result["insight"])
        self.assertFalse(result["cache_hit"])
        mock_call.assert_called_once()

    def test_cache_hit_avoids_openai_call(self) -> None:
        raw_response = (
            '{"headline":"Mostly locked, limited downside risk.",'
            '"insight":"Most of the plan is already locked, while future purchases stay exposed only if rates move further down."}'
        )

        with patch("ai_service._call_llm", return_value=raw_response) as mock_call:
            first = ai_service.summarize_bullet_rate_risk(VALID_INPUT)
            second = ai_service.summarize_bullet_rate_risk(VALID_INPUT)

        self.assertFalse(first["cache_hit"])
        self.assertTrue(second["cache_hit"])
        self.assertEqual(mock_call.call_count, 1)

    def test_cache_ttl_is_24_hours(self) -> None:
        now = 1_000_000
        time_state = {"now": now}
        cache = BulletRateRiskSummaryCache(time_fn=lambda: time_state["now"])
        cache.set("key", {"headline": "A", "insight": "B"})

        self.assertEqual(cache.ttl_seconds, 86400)
        self.assertIsNotNone(cache.get("key"))

        time_state["now"] = now + 86399
        self.assertIsNotNone(cache.get("key"))

        time_state["now"] = now + 86400
        self.assertIsNone(cache.get("key"))

    def test_invalid_ai_json_is_handled_safely(self) -> None:
        with patch("ai_service._call_llm", return_value="not-json"):
            with self.assertRaises(AIServiceResponseError):
                ai_service.summarize_bullet_rate_risk(VALID_INPUT)

    def test_missing_openai_key_raises_clean_error(self) -> None:
        original_key = ai_service.OPENAI_API_KEY
        original_client = ai_service.client
        try:
            ai_service.OPENAI_API_KEY = None
            ai_service.client = None
            with self.assertRaises(AIServiceConfigError):
                ai_service._call_llm({"task": "x"})
        finally:
            ai_service.OPENAI_API_KEY = original_key
            ai_service.client = original_client


if __name__ == "__main__":
    unittest.main()
