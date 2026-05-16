from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, AliasChoices, field_validator


class HealthResponse(BaseModel):
    status: str


class YieldResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    yield_value: float = Field(serialization_alias="yield")


# --- New Schemas for Analysis Feature ---

class AnalysisRequest(BaseModel):
    investment_amount: float = Field(..., gt=0)
    term_length_months: int = Field(...)
    income_range: str = Field(...)
    zip_code: str = Field(..., min_length=5, max_length=5)
    user_state: Optional[str] = None
    user_locality: Optional[str] = None


class CDResult(BaseModel):
    bank_name: str
    apy_nominal: float
    after_tax_apy: float
    after_tax_yield: float
    minimum_deposit: float
    product_term: int
    product_link: str
    fdic_insured: bool
    net_earnings_usd: float
    data_source: Optional[str] = None


class BrokerageCDResult(BaseModel):
    institution_name: str
    brokerage_platform: str
    apy_nominal: float
    after_tax_yield: float
    minimum_deposit: float
    product_term: int
    product_link: str


class TreasuryResult(BaseModel):
    security_type: str
    cusip: str
    maturity_term: str
    apy_nominal: float
    after_tax_yield: float
    minimum_deposit: float
    product_link: Optional[str] = None
    tax_savings_vs_cd: float


class AnalysisResponse(BaseModel):
    bank_cds: List[CDResult]
    brokerage_cds: List[BrokerageCDResult]
    treasuries: List[TreasuryResult]

# --- New Schemas for Fetch Yields Feature ---

class FetchYieldsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    investment_amount: float = Field(..., ge=5000.0)
    term_length_months: int = Field(
        ...,
        json_schema_extra={'options': [3, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60]},
    )
    income_range: str
    user_state: str = Field(validation_alias=AliasChoices("user_state", "state_selection"))
    user_locality: str = Field(validation_alias=AliasChoices("user_locality", "city_county"))
    filing_status: str = Field(validation_alias=AliasChoices("filing_status", "tax_filing_status"))
    zip_code: Optional[str] = Field(default=None, validation_alias=AliasChoices("zip_code", "zipcode"))

    @field_validator("investment_amount", mode="before")
    @classmethod
    def parse_investment_amount(cls, value):
        if isinstance(value, str):
            return float(value.replace(",", "").strip())
        return value

    @field_validator("term_length_months", mode="before")
    @classmethod
    def parse_term_length_months(cls, value):
        if isinstance(value, str):
            normalized = value.lower().strip()
            if "year" in normalized:
                digits = "".join(ch for ch in normalized if ch.isdigit())
                if digits:
                    return int(digits) * 12
                if "above" in normalized:
                    return 60
            digits = "".join(ch for ch in normalized if ch.isdigit())
            if digits:
                return int(digits)
        return value


class TaxBreakdown(BaseModel):
    federalBracket: str
    stateTax: str
    localOswego: str


class CDProduct(BaseModel):
    model_config = ConfigDict(validate_assignment=True)
    id: str
    provider: str
    institutionType: str
    productType: str
    nominalRate: float
    afterTaxYield: float
    minDeposit: float
    isTopPick: bool
    taxBreakdown: TaxBreakdown
    netReturn: str
    whyThisFits: str
    matchPercentage: int


class FetchYieldsResponse(BaseModel):
    results: List[CDProduct]


# --- Bullet Convergence Schemas ---

class TrancheInput(BaseModel):
    slot: int = Field(..., ge=1)
    buy_in_months: int = Field(..., ge=0)
    required_term_months: int = Field(..., gt=0)
    product_id: str
    allocation: float = Field(..., gt=0)


class BulletConvergenceRequest(BaseModel):
    target_maturity_date: date
    investment_amount: float = Field(..., gt=0)
    tranches: List[TrancheInput] = Field(..., min_length=1)


class TrancheResult(BaseModel):
    slot: int
    buy_in_months: int
    product_id: str
    term_match_score: float
    availability_score: float
    deposit_score: float
    tranche_score: float
    actual_maturity_date: date
    deviation_days: int
    flags: List[str]


class DeviationEntry(BaseModel):
    slot: int
    deviation_days: int
    direction: str  # "late" | "early"


class AISummaryInput(BaseModel):
    overall_score: float
    confidence_label: str
    target_maturity_date: date
    tranche_count: int
    flags: List[str]
    deviations: List[DeviationEntry]
    at_risk_tranches: List[int]
    limited_availability_tranches: List[int]


class BulletConvergenceResponse(BaseModel):
    overall_score: float
    confidence_label: str
    target_maturity_date: date
    cache_hit: bool
    tranches: List[TrancheResult]
    ai_summary_input: AISummaryInput


# --- Bullet Rate Risk Schemas ---


class BulletRateRiskTranche(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slot: int = Field(..., ge=1)
    buy_in_months: int = Field(..., ge=0)
    cd_term_months: int = Field(..., gt=0)
    product_id: str
    after_tax_apy: float = Field(..., ge=0)
    allocation: float = Field(..., gt=0)


class BulletRateRiskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    investment_amount: float = Field(..., gt=0)
    tranches: List[BulletRateRiskTranche] = Field(..., min_length=1)
    user_state: str = Field(..., min_length=1)
    user_income_range: str = Field(..., min_length=1)


class RateRiskScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    delta: float
    total_return: float
    dollar_impact: float


class AiSummaryInputScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    dollar_impact: float


class BulletRateRiskAiSummaryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locked_pct: float
    deferred_pct: float
    worst_case_dollar_impact: float
    break_even_drop: float
    user_state: str
    flat_total_return: float
    scenarios: List[AiSummaryInputScenario]


class BulletRateRiskResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locked_amount: float
    locked_pct: float
    deferred_amount: float
    deferred_pct: float
    scenarios: List[RateRiskScenario]
    break_even_drop: float
    cache_hit: bool
    ai_summary_input: BulletRateRiskAiSummaryInput
