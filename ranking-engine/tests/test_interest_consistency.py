import unittest

from fastapi.testclient import TestClient

from main import app
from strategies.barbell import _interest_compound as barbell_interest
from strategies.bullet import _interest_compound as bullet_interest
from strategies.ladder import _interest_compound as ladder_interest


def reference_compound(amount, apy_percent, term_months):
    t = term_months / 12.0
    return amount * ((1.0 + apy_percent / 100.0) ** t - 1.0)


def reference_simple(amount, apy_percent, term_months):
    return amount * (apy_percent / 100.0) * (term_months / 12.0)


CASES = [
    (10000.0, 4.0, 12),
    (10000.0, 4.0, 60),
    (50000.0, 5.6, 60),
    (25000.0, 3.25, 36),
    (5000.0, 0.5, 6),
    (100000.0, 5.0, 84),
]


class InterestFormulaTests(unittest.TestCase):
    """
    All three strategies must project interest the same way. This drifted once:
    barbell and bullet used simple interest while ladder used compound, so the
    same money showed different returns depending on the tab. Pin it.
    """

    def test_all_three_strategies_agree(self):
        for amount, apy, months in CASES:
            with self.subTest(amount=amount, apy=apy, months=months):
                lad = ladder_interest(amount, apy, months)
                bul = bullet_interest(amount, apy, months)
                bar = barbell_interest(amount, apy, months)
                self.assertAlmostEqual(lad, bul, places=6)
                self.assertAlmostEqual(lad, bar, places=6)

    def test_all_three_match_compound_reference(self):
        for amount, apy, months in CASES:
            with self.subTest(amount=amount, apy=apy, months=months):
                expected = reference_compound(amount, apy, months)
                self.assertAlmostEqual(ladder_interest(amount, apy, months), expected, places=6)
                self.assertAlmostEqual(bullet_interest(amount, apy, months), expected, places=6)
                self.assertAlmostEqual(barbell_interest(amount, apy, months), expected, places=6)

    def test_compound_is_not_simple_for_multi_year_terms(self):
        amount, apy, months = 50000.0, 5.6, 60
        compound = reference_compound(amount, apy, months)
        simple = reference_simple(amount, apy, months)

        self.assertGreater(compound - simple, 100.0)
        for fn in (ladder_interest, bullet_interest, barbell_interest):
            self.assertAlmostEqual(fn(amount, apy, months), compound, places=6)
            self.assertNotAlmostEqual(fn(amount, apy, months), simple, places=2)


class InterestResponseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def _base_payload(self):
        return {
            "investment_amount": 50000,
            "state": "NY",
            "income_range": "$100,000 - $150,000",
            "filing_status": "single",
            "local_area": "manhattan",
        }

    def _assert_leg_is_compound(self, amount, product):
        expected = reference_compound(
            amount, product["apy_nominal"], product["term_months"]
        )
        self.assertAlmostEqual(product["nominal_interest_usd"], round(expected, 2), places=2)

    def test_ladder_rung_interest_is_compound(self):
        payload = {**self._base_payload(), "strategy_type": "ladder", "time_horizon": "long"}
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 200)

        rungs = res.json()["rungs"]
        self.assertTrue(rungs)
        for rung in rungs:
            with self.subTest(rung=rung["rung"]):
                self._assert_leg_is_compound(rung["allocation_amount"], rung["product"])

    def test_bullet_tranche_interest_is_compound(self):
        payload = {**self._base_payload(), "strategy_type": "bullet", "time_horizon": "long"}
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 200)

        tranches = res.json()["tranches"]
        self.assertTrue(tranches)
        for tranche in tranches:
            with self.subTest(term=tranche["product"]["term_months"]):
                self._assert_leg_is_compound(tranche["allocation_amount"], tranche["product"])

    def test_barbell_total_return_is_compound(self):
        payload = {
            **self._base_payload(),
            "strategy_type": "barbell",
            "target_maturity_months": 60,
        }
        res = self.client.post("/strategies/simulate", json=payload)
        self.assertEqual(res.status_code, 200)

        split = res.json()["selected_split"]
        short = split["selected_products"]["short_term"]["best"]
        long = split["selected_products"]["long_term"]["best"]
        expected = reference_compound(
            split["short_term_amount"], short["apy_nominal"], short["term_months"]
        ) + reference_compound(
            split["long_term_amount"], long["apy_nominal"], long["term_months"]
        )

        self.assertAlmostEqual(
            split["portfolio"]["estimated_total_return_usd"], round(expected, 2), places=2
        )


if __name__ == "__main__":
    unittest.main()
