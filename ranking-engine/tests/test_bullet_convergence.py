import unittest

from fastapi.testclient import TestClient

from main import app
from strategies.bullet import _target_maturity_windows


# Horizon values the frontend actually sends, one per Duration <option> in
# App.jsx (3/6/9/12/18/24/30 Month, 3/4/5 Year), converted the same way the
# frontend does: Math.round((termMonths / 12) * 10) / 10, JS half-up rounding.
_FRONTEND_HORIZON_YEARS = {
    3: 0.3,
    6: 0.5,
    9: 0.8,
    12: 1.0,
    18: 1.5,
    24: 2.0,
    30: 2.5,
    36: 3.0,
    48: 4.0,
    60: 5.0,
}


class BulletConvergenceWindowTests(unittest.TestCase):
    """The bullet UI states all CDs mature on or before the target date.

    The invariant enforced here: for every tranche,
    purchase_offset_months + target_maturity_months <= horizon in months.
    """

    def test_no_tranche_matures_after_target_at_any_frontend_horizon(self):
        for term_months, years in _FRONTEND_HORIZON_YEARS.items():
            horizon_months = round(years * 12)
            windows = _target_maturity_windows(years)
            self.assertTrue(
                windows,
                f"{term_months}mo search ({years}y): no tranches returned",
            )
            for w in windows:
                actual_maturity = (
                    w["purchase_offset_months"] + w["target_maturity_months"]
                )
                self.assertLessEqual(
                    actual_maturity,
                    horizon_months,
                    f"{term_months}mo search ({years}y): tranche "
                    f"{w['tranche']} matures at month {actual_maturity}, "
                    f"past the {horizon_months}-month target",
                )

    def test_sub_six_month_horizon_returns_single_buy_now_tranche(self):
        # Below 6 months only one converging purchase exists: buy now,
        # shortest available term. The staggered tranche cannot fit.
        for years in (0.25, 0.3):
            windows = _target_maturity_windows(years)
            self.assertEqual(
                len(windows),
                1,
                f"{years}y horizon should keep only the buy-now tranche",
            )
            self.assertEqual(windows[0]["purchase_offset_months"], 0)
            self.assertEqual(windows[0]["target_maturity_months"], 3)

    def test_supported_horizons_keep_existing_tranche_structure(self):
        # Behavior pin: horizons that converge today must be unchanged.
        expected = {
            0.5: [(0, 6), (3, 3)],
            1.0: [(0, 12), (3, 9), (6, 6)],
            5.0: [(0, 60), (6, 48), (12, 36), (18, 24)],
        }
        for years, structure in expected.items():
            windows = _target_maturity_windows(years)
            got = [
                (w["purchase_offset_months"], w["target_maturity_months"])
                for w in windows
            ]
            self.assertEqual(got, structure, f"structure changed for {years}y")


class BulletConvergenceEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def _payload(self, time_horizon):
        return {
            "strategy_type": "bullet",
            "investment_amount": 10000,
            "state": "NY",
            "income_range": "$100,000 - $150,000",
            "filing_status": "single",
            "local_area": "manhattan",
            "time_horizon": time_horizon,
        }

    def test_three_month_search_returns_converging_single_tranche(self):
        # 0.3 is what the frontend sends for the 3 Month duration option.
        res = self.client.post("/strategies/simulate", json=self._payload("0.3"))
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body["tranches"]), 1)
        tranche = body["tranches"][0]
        self.assertEqual(tranche["purchase_offset_months"], 0)
        maturity = (
            tranche["purchase_offset_months"] + tranche["product"]["term_months"]
        )
        self.assertLessEqual(maturity, round(0.3 * 12))

    def test_three_month_search_warns_about_single_purchase(self):
        res = self.client.post("/strategies/simulate", json=self._payload("0.3"))
        self.assertEqual(res.status_code, 200)
        warnings = res.json()["warnings"]
        self.assertTrue(
            any("single" in w.lower() or "one purchase" in w.lower() for w in warnings),
            f"expected a warning explaining the single-tranche result, got: {warnings}",
        )

    def test_six_month_search_still_returns_two_tranches(self):
        res = self.client.post("/strategies/simulate", json=self._payload("0.5"))
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body["tranches"]), 2)
        for tranche in body["tranches"]:
            maturity = (
                tranche["purchase_offset_months"]
                + tranche["product"]["term_months"]
            )
            self.assertLessEqual(maturity, 6)


if __name__ == "__main__":
    unittest.main()
