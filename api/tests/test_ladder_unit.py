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
