from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


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
    investment_amount: float = Field(..., ge=5000.0)
    term_length_months: int = Field(..., json_schema_extra={'options': [3, 6, 9, 12, 18, 24, 36, 48, 60]})
    income_range: str
    user_state: str
    user_locality: str
    filing_status: str

class CDProduct(BaseModel):
    product_name: str
    gross_yield: float
    after_tax_yield: float
    term_length_months: int
    minimum_deposit: float

class FetchYieldsResponse(BaseModel):
    cds: List[CDProduct]

