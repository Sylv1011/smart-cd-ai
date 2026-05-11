from api.schemas import LadderRequest, LadderRung, LadderResponse


def test_ladder_request_valid():
    req = LadderRequest(
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        income_range="$75,000 - $100,000",
        state_selection="NY",
        city_county="New York",
        tax_filing_status="single",
    )
    assert req.investment_amount == 10000
    assert req.time_horizon_years == 5
    assert req.liquidity_preference == "medium"


def test_ladder_request_rejects_bad_horizon():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        LadderRequest(
            investment_amount=10000,
            time_horizon_years=6,   # max is 5
            liquidity_preference="medium",
            income_range="$75,000 - $100,000",
            state_selection="NY",
            city_county="",
            tax_filing_status="single",
        )


def test_ladder_request_rejects_bad_liquidity():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        LadderRequest(
            investment_amount=10000,
            time_horizon_years=3,
            liquidity_preference="extreme",  # invalid
            income_range="$75,000 - $100,000",
            state_selection="NY",
            city_county="",
            tax_filing_status="single",
        )


from api.ladder import calculate_weights


def test_weights_sum_to_one():
    for n in range(2, 6):
        for liquidity in ("low", "medium", "high"):
            weights = calculate_weights(n, liquidity)
            assert abs(sum(weights) - 1.0) < 1e-6, f"n={n} liquidity={liquidity} sum={sum(weights)}"


def test_medium_liquidity_equal_weights():
    weights = calculate_weights(5, "medium")
    assert len(weights) == 5
    for w in weights:
        assert abs(w - 0.2) < 1e-6


def test_high_liquidity_short_terms_heavier():
    weights = calculate_weights(5, "high")
    for i in range(len(weights) - 1):
        assert weights[i] > weights[i + 1], f"weights[{i}]={weights[i]} not > weights[{i+1}]={weights[i+1]}"


def test_low_liquidity_long_terms_heavier():
    weights = calculate_weights(5, "low")
    for i in range(len(weights) - 1):
        assert weights[i] < weights[i + 1], f"weights[{i}]={weights[i]} not < weights[{i+1}]={weights[i+1]}"


def test_high_liquidity_5_rungs_matches_spec():
    """The spec defines exact values for 5 rungs high liquidity."""
    weights = calculate_weights(5, "high")
    assert abs(weights[0] - 0.30) < 1e-6
    assert abs(weights[1] - 0.25) < 1e-6
    assert abs(weights[2] - 0.20) < 1e-6
    assert abs(weights[3] - 0.15) < 1e-6
    assert abs(weights[4] - 0.10) < 1e-6


def test_weights_all_positive():
    for n in range(2, 6):
        for liquidity in ("low", "medium", "high"):
            weights = calculate_weights(n, liquidity)
            assert all(w > 0 for w in weights), f"n={n} liquidity={liquidity} has non-positive weight"


from api.ladder import fetch_best_offer_for_term


def test_fetch_best_offer_exact_term(db):
    offer = fetch_best_offer_for_term(db, term_months=12)
    assert offer is not None
    assert offer.term_months == 12
    assert offer.apy == 4.80  # Gamma Bank (highest at 12mo in fixtures)


def test_fetch_best_offer_picks_highest_apy(db):
    # Fixtures have two 12mo offers: 4.80 and 3.00
    offer = fetch_best_offer_for_term(db, term_months=12)
    assert offer.apy == 4.80


def test_fetch_best_offer_fallback_nearest_term(db):
    # No 18-month offer in fixtures; should fall back to nearest (12 or 24)
    offer = fetch_best_offer_for_term(db, term_months=18)
    assert offer is not None
    assert offer.term_months in (12, 24)


def test_fetch_best_offer_returns_none_when_no_data(db):
    # Query a term far outside the ±3 month window with no nearby offers
    offer = fetch_best_offer_for_term(db, term_months=120)
    assert offer is None


from api.ladder import compute_blended_apy
from api.schemas import LadderRung


def _make_rung(term_months, amount, nominal_apy, after_tax_apy):
    return LadderRung(
        term_months=term_months,
        amount=amount,
        allocation_pct=amount / 10000,
        provider="Test Bank",
        product_type="Bank CDs",
        nominal_apy=nominal_apy,
        after_tax_apy=after_tax_apy,
        nominal_interest=amount * nominal_apy / 100 * term_months / 12,
        after_tax_interest=amount * after_tax_apy / 100 * term_months / 12,
        min_deposit=1000.0,
        maturity_date="2027-05-11",
    )


def test_blended_apy_equal_weights():
    rungs = [
        _make_rung(12, 2000, 4.0, 3.0),
        _make_rung(24, 2000, 5.0, 3.75),
        _make_rung(36, 2000, 6.0, 4.5),
    ]
    nominal, after_tax = compute_blended_apy(rungs)
    assert abs(nominal - 5.0) < 0.01
    assert abs(after_tax - 3.75) < 0.01


def test_blended_apy_unequal_weights():
    rungs = [
        _make_rung(12, 3000, 4.0, 3.0),   # 30%
        _make_rung(60, 7000, 5.0, 3.75),   # 70%
    ]
    nominal, after_tax = compute_blended_apy(rungs)
    # nominal = (3000*4 + 7000*5) / 10000 = 4.7
    assert abs(nominal - 4.70) < 0.01
    # after_tax = (3000*3 + 7000*3.75) / 10000 = 3.525
    assert abs(after_tax - 3.525) < 0.01


def test_blended_apy_empty_rungs():
    nominal, after_tax = compute_blended_apy([])
    assert nominal == 0.0
    assert after_tax == 0.0


from api.ladder import build_ladder


def test_build_ladder_5yr_medium(db):
    rungs, warnings = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        fed_rate=0.22,
        state_rate=0.0685,
        local_rate=0.0,
    )
    assert len(rungs) == 5
    for rung in rungs:
        assert abs(rung.amount - 2000.0) < 0.01
    for rung in rungs:
        assert rung.after_tax_apy > 0


def test_build_ladder_rung_terms_match_horizon(db):
    from api.ladder import RUNG_TERMS
    for horizon in range(1, 6):
        rungs, _ = build_ladder(
            db=db,
            investment_amount=10000,
            time_horizon_years=horizon,
            liquidity_preference="medium",
            fed_rate=0.22,
            state_rate=0.05,
            local_rate=0.0,
        )
        expected_terms = RUNG_TERMS[horizon]
        assert len(rungs) == len(expected_terms)


def test_build_ladder_high_liquidity_short_heavier(db):
    rungs, _ = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="high",
        fed_rate=0.22,
        state_rate=0.05,
        local_rate=0.0,
    )
    assert rungs[0].amount > rungs[-1].amount


def test_build_ladder_maturity_dates_ordered(db):
    rungs, _ = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        fed_rate=0.22,
        state_rate=0.0,
        local_rate=0.0,
    )
    dates = [r.maturity_date for r in rungs]
    assert dates == sorted(dates)


def test_build_ladder_picks_best_apy_per_rung(db):
    rungs, _ = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        fed_rate=0.0,
        state_rate=0.0,
        local_rate=0.0,
    )
    rung_12 = next(r for r in rungs if r.term_months == 12)
    assert rung_12.nominal_apy == 4.80  # not 3.00 (Worse Bank)
    assert rung_12.provider == "Gamma Bank"


from api.ladder import _select_terms


def test_small_investment_reduces_rungs():
    # $1,000 / 5 rungs = $200 per rung < MIN_RUNG_AMOUNT ($500)
    # Should reduce to 2 rungs ($500 each)
    terms = _select_terms(investment_amount=1000, time_horizon_years=5)
    assert len(terms) <= 2
    assert 1000 / len(terms) >= 500


def test_large_investment_keeps_all_rungs():
    terms = _select_terms(investment_amount=50000, time_horizon_years=5)
    assert len(terms) == 5


def test_min_rung_floor_is_2():
    # Even if investment is tiny, never reduce below 2 rungs
    terms = _select_terms(investment_amount=100, time_horizon_years=5)
    assert len(terms) >= 2
