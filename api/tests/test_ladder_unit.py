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
