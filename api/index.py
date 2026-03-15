from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import YieldRecord
from api.schemas import (
    HealthResponse, 
    YieldResponse, 
    AnalysisRequest, 
    AnalysisResponse, 
    CDResult, 
    BrokerageCDResult, 
    TreasuryResult,
    FetchYieldsRequest,
    FetchYieldsResponse,
    CDProduct
)

app = FastAPI(title="SmartCD Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="OK")


@app.get("/api/yield", response_model=YieldResponse)
@app.get("/yield", response_model=YieldResponse)
def get_current_yield(db: Session = Depends(get_db)) -> YieldResponse:
    try:
        row = db.query(YieldRecord).order_by(desc(YieldRecord.id)).first()
    except SQLAlchemyError:
        # Graceful failure when PostgreSQL is unavailable or query fails.
        raise HTTPException(status_code=503, detail="Database is not reachable")

    if row is None:
        raise HTTPException(status_code=404, detail="No yield data available")

    return YieldResponse(yield_value=row.yield_value)


@app.post("/api/analyze", response_model=AnalysisResponse)
@app.post("/analyze", response_model=AnalysisResponse)
def analyze_yields(request: AnalysisRequest) -> AnalysisResponse:
    if request.investment_amount < 5000:
        raise HTTPException(status_code=400, detail="Investment amount must be at least $5,000")

    # 1. Map Income Range to mock Federal Tax Rate
    # <$25,000 to >$200,000 mappings
    fed_tax_rate = 0.22 
    if "100" in request.income_range or "150" in request.income_range:
        fed_tax_rate = 0.24
    elif "200" in request.income_range:
        fed_tax_rate = 0.32

    # 2. Map ZIP code to mock State/Local Tax Rate
    # E.g. California/NYC vs Texas
    if request.zip_code.startswith("9"): # CA mock
        state_tax_rate = 0.093
        local_tax_rate = 0.01
    elif request.zip_code.startswith("1"): # NY mock
        state_tax_rate = 0.06
        local_tax_rate = 0.038
    else:
        state_tax_rate = 0.04
        local_tax_rate = 0.0

    total_cd_tax_rate = fed_tax_rate + state_tax_rate + local_tax_rate
    total_treasury_tax_rate = fed_tax_rate # Exempt from state/local
    
    amount = request.investment_amount
    term = request.term_length_months

    # 3. Generate Bank CDs (Section A)
    # CD Yield: Yield * (1 - Total CD Tax)
    bank_cds = []
    mocks_a = [("Ally Bank", 5.00), ("Capital One", 4.90), ("Discover Bank", 4.80)]
    for bank, apy in mocks_a:
        after_tax_apy = apy * (1 - total_cd_tax_rate)
        after_tax_yield = after_tax_apy
        net_earnings = amount * (after_tax_yield / 100.0) * (term / 12.0)
        
        bank_cds.append(CDResult(
            bank_name=bank,
            apy_nominal=apy,
            after_tax_apy=round(after_tax_apy, 2),
            after_tax_yield=round(after_tax_yield, 2),
            minimum_deposit=500.0,
            product_term=term,
            product_link="https://example.com/apply",
            fdic_insured=True,
            net_earnings_usd=round(net_earnings, 2),
            data_source="Mock API"
        ))

    # 4. Generate Brokerage CDs (Section B)
    brokerage_cds = []
    mocks_b = [("Goldman Sachs", "Fidelity", 5.30), ("Morgan Stanley", "Charles Schwab", 5.25)]
    for inst, plat, apy in mocks_b:
        after_tax_yield = apy * (1 - total_cd_tax_rate)
        brokerage_cds.append(BrokerageCDResult(
            institution_name=inst,
            brokerage_platform=plat,
            apy_nominal=apy,
            after_tax_yield=round(after_tax_yield, 2),
            minimum_deposit=1000.0,
            product_term=term,
            product_link="https://example.com/brokerage"
        ))

    # 5. Generate Treasuries (Section C)
    # Treasury Yield: Yield * (1 - Fed Tax Only)
    treasuries = []
    
    # Calculate baseline CD tax payment for comparison
    avg_cd_apy = 5.00
    cd_tax_paid = amount * (avg_cd_apy / 100.0) * total_cd_tax_rate * (term / 12.0)
    
    mocks_c = [("T-Bill", "912797ABC", 5.42)]
    for sec_type, cusip, apy in mocks_c:
        after_tax_yield = apy * (1 - total_treasury_tax_rate)
        
        treasury_tax_paid = amount * (apy / 100.0) * total_treasury_tax_rate * (term / 12.0)
        tax_savings = cd_tax_paid - treasury_tax_paid
        
        treasuries.append(TreasuryResult(
            security_type=sec_type,
            cusip=cusip,
            maturity_term=f"{term} Months",
            apy_nominal=apy,
            after_tax_yield=round(after_tax_yield, 2),
            minimum_deposit=100.0,
            tax_savings_vs_cd=round(max(0, tax_savings), 2),
            product_link="https://treasurydirect.gov"
        ))

    return AnalysisResponse(
        bank_cds=bank_cds,
        brokerage_cds=brokerage_cds,
        treasuries=treasuries
    )

INVESTMENT_AMOUNT = 5000.0

@app.post("/api/v1/fetch-yields", response_model=FetchYieldsResponse)
@app.post("/v1/fetch-yields", response_model=FetchYieldsResponse)
def fetch_yields(request: FetchYieldsRequest) -> FetchYieldsResponse:
    print(f"Incoming Request for fetch-yields: {request.model_dump()}")

    if request.investment_amount < 5000:
        raise HTTPException(status_code=400, detail="Investment amount must be at least $5,000")

    # 1. Map Income Range to numeric base value
    income_str = request.income_range.lower()
    numeric_income = 50000.0 # Default
@app.post("/api/v1/fetch-yields")
async def fetch_yields(request: FetchYieldsRequest, db: Session = Depends(get_db)):
    # Basic Validation
    if request.investment_amount < 5000:
        raise HTTPException(
            status_code=400,
            detail="Investment amount must be at least $5,000"
        )
        
    # Lead Capture Mode - Silent Mode JSON
    return {}
