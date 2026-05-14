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
