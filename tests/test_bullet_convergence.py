import pytest
from api.bullet_convergence import (
    availability_score,
    confidence_label,
    deposit_score,
    overall_confidence,
    term_match_score,
    tranche_composite_score,
)


class TestTermMatchScore:
    def test_exact_match(self):
        assert term_match_score(12, 12) == 100

    def test_one_month_deviation(self):
        # 1 month = 4.33 weeks → falls in (4, 8] → score 40
        assert term_match_score(12, 11) == 40

    def test_two_month_deviation(self):
        # 2 months = 8.66 weeks → > 8 → score 20
        assert term_match_score(12, 10) == 20

    def test_large_deviation(self):
        assert term_match_score(12, 6) == 20

    def test_symmetrical(self):
        assert term_match_score(6, 9) == term_match_score(9, 6)


class TestAvailabilityScore:
    def test_active(self):
        assert availability_score("active") == 100

    def test_limited(self):
        assert availability_score("limited") == 60

    def test_other_status(self):
        assert availability_score("inactive") == 20

    def test_none_means_not_found(self):
        assert availability_score(None) == 0


class TestDepositScore:
    def test_allocation_meets_minimum(self):
        assert deposit_score(1000, 1000) == 100

    def test_allocation_exceeds_minimum(self):
        assert deposit_score(2000, 1000) == 100

    def test_allocation_at_80_percent(self):
        # 800 / 1000 = 80% → exactly at boundary → score 50
        assert deposit_score(800, 1000) == 50

    def test_allocation_between_80_and_100_percent(self):
        # 850 / 1000 = 85% → ≥ 80% → score 50
        assert deposit_score(850, 1000) == 50

    def test_allocation_below_80_percent(self):
        # 700 / 1000 = 70% → score 0
        assert deposit_score(700, 1000) == 0

    def test_zero_min_deposit(self):
        assert deposit_score(100, 0) == 100


class TestTrancheCompositeScore:
    def test_all_perfect(self):
        assert tranche_composite_score(100, 100, 100) == 100.0

    def test_term_weight_is_50_percent(self):
        assert tranche_composite_score(100, 0, 0) == 50.0

    def test_availability_weight_is_30_percent(self):
        assert tranche_composite_score(0, 100, 0) == 30.0

    def test_deposit_weight_is_20_percent(self):
        assert tranche_composite_score(0, 0, 100) == 20.0


class TestOverallConfidence:
    def test_single_tranche(self):
        assert overall_confidence([80.0]) == 80.0

    def test_average_of_three(self):
        assert overall_confidence([100.0, 80.0, 60.0]) == pytest.approx(80.0)

    def test_empty_returns_zero(self):
        assert overall_confidence([]) == 0.0


class TestConfidenceLabel:
    def test_high_at_exactly_85(self):
        assert confidence_label(85.0) == "High"

    def test_high_above_85(self):
        assert confidence_label(100.0) == "High"

    def test_medium_at_exactly_65(self):
        assert confidence_label(65.0) == "Medium"

    def test_medium_just_below_85(self):
        assert confidence_label(84.9) == "Medium"

    def test_low_at_exactly_40(self):
        assert confidence_label(40.0) == "Low"

    def test_low_just_below_65(self):
        assert confidence_label(64.9) == "Low"

    def test_at_risk_just_below_40(self):
        assert confidence_label(39.9) == "At Risk"

    def test_at_risk_at_zero(self):
        assert confidence_label(0.0) == "At Risk"


# --- Task 5 tests appended below ---

from datetime import date as DateType
from api.bullet_convergence import (
    TrancheComputed,
    build_ai_summary_input,
    compute_deviation_days,
    compute_flags,
)


class TestComputeDeviationDays:
    def test_zero_deviation(self):
        result = compute_deviation_days(
            today=DateType(2026, 5, 7),
            buy_in_months=0,
            actual_term_months=12,
            target_maturity_date=DateType(2027, 5, 7),
        )
        assert result == 0

    def test_positive_deviation_means_late(self):
        result = compute_deviation_days(
            today=DateType(2026, 5, 10),
            buy_in_months=0,
            actual_term_months=12,
            target_maturity_date=DateType(2027, 5, 7),
        )
        assert result == 3

    def test_negative_deviation_means_early(self):
        result = compute_deviation_days(
            today=DateType(2026, 5, 10),
            buy_in_months=0,
            actual_term_months=11,
            target_maturity_date=DateType(2027, 5, 7),
        )
        assert result == -27

    def test_buy_in_offset_adds_to_term(self):
        result = compute_deviation_days(
            today=DateType(2026, 5, 10),
            buy_in_months=3,
            actual_term_months=9,
            target_maturity_date=DateType(2027, 5, 7),
        )
        assert result == 3


class TestComputeFlags:
    def test_no_flags_when_all_good(self):
        flags = compute_flags(
            deviation_days=0, status="active", product_found=True,
            allocation=6667, min_deposit=1000,
            required_term_months=12, actual_term_months=12,
        )
        assert flags == []

    def test_positive_deviation_produces_flag_with_value(self):
        flags = compute_flags(
            deviation_days=14, status="active", product_found=True,
            allocation=6667, min_deposit=1000,
            required_term_months=12, actual_term_months=12,
        )
        assert "maturity_deviation_14_days" in flags

    def test_negative_deviation_produces_no_flag(self):
        flags = compute_flags(
            deviation_days=-5, status="active", product_found=True,
            allocation=6667, min_deposit=1000,
            required_term_months=12, actual_term_months=12,
        )
        assert not any(f.startswith("maturity_deviation") for f in flags)

    def test_product_not_found_flag(self):
        flags = compute_flags(
            deviation_days=0, status=None, product_found=False,
            allocation=6667, min_deposit=0,
            required_term_months=12, actual_term_months=12,
        )
        assert flags == ["product_not_found"]

    def test_limited_availability_flag(self):
        flags = compute_flags(
            deviation_days=0, status="limited", product_found=True,
            allocation=6667, min_deposit=1000,
            required_term_months=12, actual_term_months=12,
        )
        assert "product_availability_limited" in flags

    def test_deposit_shortfall_flag(self):
        flags = compute_flags(
            deviation_days=0, status="active", product_found=True,
            allocation=500, min_deposit=1000,
            required_term_months=12, actual_term_months=12,
        )
        assert "deposit_shortfall" in flags

    def test_no_exact_term_match_flag(self):
        flags = compute_flags(
            deviation_days=0, status="active", product_found=True,
            allocation=6667, min_deposit=1000,
            required_term_months=12, actual_term_months=11,
        )
        assert "no_exact_term_match" in flags

    def test_multiple_flags_coexist(self):
        flags = compute_flags(
            deviation_days=14, status="limited", product_found=True,
            allocation=500, min_deposit=1000,
            required_term_months=12, actual_term_months=11,
        )
        assert set(flags) == {
            "maturity_deviation_14_days",
            "product_availability_limited",
            "deposit_shortfall",
            "no_exact_term_match",
        }


class TestBuildAISummaryInput:
    def _tranches(self):
        return [
            TrancheComputed(slot=1, tranche_score=100.0, deviation_days=0,
                            flags=[], actual_maturity_date=DateType(2027, 5, 7)),
            TrancheComputed(slot=2, tranche_score=89.0, deviation_days=14,
                            flags=["maturity_deviation_14_days", "no_exact_term_match"],
                            actual_maturity_date=DateType(2027, 5, 21)),
            TrancheComputed(slot=3, tranche_score=78.0, deviation_days=0,
                            flags=["product_availability_limited"],
                            actual_maturity_date=DateType(2027, 5, 7)),
        ]

    def test_exactly_8_fields(self):
        result = build_ai_summary_input(87.0, "High", DateType(2027, 5, 7), self._tranches())
        assert set(result.keys()) == {
            "overall_score", "confidence_label", "target_maturity_date",
            "tranche_count", "flags", "deviations",
            "at_risk_tranches", "limited_availability_tranches",
        }

    def test_no_extra_fields(self):
        result = build_ai_summary_input(87.0, "High", DateType(2027, 5, 7), self._tranches())
        assert len(result) == 8

    def test_flags_are_deduplicated(self):
        tranches = [
            TrancheComputed(slot=1, tranche_score=80.0, deviation_days=0,
                            flags=["no_exact_term_match"], actual_maturity_date=DateType(2027, 5, 7)),
            TrancheComputed(slot=2, tranche_score=80.0, deviation_days=0,
                            flags=["no_exact_term_match"], actual_maturity_date=DateType(2027, 5, 7)),
        ]
        result = build_ai_summary_input(80.0, "Medium", DateType(2027, 5, 7), tranches)
        assert result["flags"].count("no_exact_term_match") == 1

    def test_at_risk_tranches_below_40(self):
        tranches = [
            TrancheComputed(slot=1, tranche_score=39.0, deviation_days=0,
                            flags=[], actual_maturity_date=DateType(2027, 5, 7)),
            TrancheComputed(slot=2, tranche_score=50.0, deviation_days=0,
                            flags=[], actual_maturity_date=DateType(2027, 5, 7)),
        ]
        result = build_ai_summary_input(44.5, "Low", DateType(2027, 5, 7), tranches)
        assert result["at_risk_tranches"] == [1]

    def test_deviations_only_nonzero(self):
        result = build_ai_summary_input(87.0, "High", DateType(2027, 5, 7), self._tranches())
        assert len(result["deviations"]) == 1
        assert result["deviations"][0]["slot"] == 2
        assert result["deviations"][0]["direction"] == "late"

    def test_early_deviation_direction(self):
        tranches = [
            TrancheComputed(slot=1, tranche_score=80.0, deviation_days=-10,
                            flags=[], actual_maturity_date=DateType(2027, 4, 27)),
        ]
        result = build_ai_summary_input(80.0, "Medium", DateType(2027, 5, 7), tranches)
        assert result["deviations"][0]["direction"] == "early"

    def test_limited_availability_tranches(self):
        result = build_ai_summary_input(87.0, "High", DateType(2027, 5, 7), self._tranches())
        assert result["limited_availability_tranches"] == [3]
