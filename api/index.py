from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from api.config import get_settings
from api.database import get_db
from api.models import (
    FederalTax,
    LocalTax,
    Offer,
    StatesTaxConfig,
    TaxBracket,
    YieldRecord,
)
from api.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    BrokerageCDResult,
    CDProduct,
    CDResult,
    FetchYieldsRequest,
    FetchYieldsResponse,
    HealthResponse,
    TaxBreakdown,
    TreasuryResult,
    YieldResponse,
)

settings = get_settings()

app = FastAPI(title="SmartCD Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass(frozen=True)
class ProductDefinition:
    provider: str
    product_type: str
    institution_type: str
    nominal_rate: float
    min_deposit: float


FALLBACK_CATALOG: Tuple[ProductDefinition, ...] = (
    ProductDefinition("Citibank", "Bank CDs", "Member of FDIC", 4.30, 1000),
    ProductDefinition("Bank of America", "Bank CDs", "Member of FDIC", 4.25, 1000),
    ProductDefinition("Morgan Stanley", "Bank CDs", "Member of FDIC", 4.20, 1000),
    ProductDefinition("JP Morgan Chase", "Bank CDs", "Member of FDIC", 4.00, 1000),
    ProductDefinition("Capital One", "Bank CDs", "Member of FDIC", 4.00, 1000),
    ProductDefinition("Citibank", "Brokerage CDs", "Member of FDIC, Issued through Fidelity", 4.30, 1000),
    ProductDefinition("Barclays Bank", "Brokerage CDs", "Member of FDIC, Issued through Fidelity", 4.10, 1000),
    ProductDefinition("Goldman Sachs", "Brokerage CDs", "Member of FDIC, Issued through Fidelity", 4.02, 1000),
    ProductDefinition("Discover Bank", "Brokerage CDs", "Member of FDIC, Issued through Fidelity", 3.95, 1000),
    ProductDefinition("US Treasury", "Treasuries", "Backed by U.S. Government", 4.15, 100),
)

STATE_ID_ALIASES: Dict[str, Tuple[str, ...]] = {
    "California": ("CA", "California"),
    "Texas": ("TX", "Texas"),
    "Florida": ("FL", "Florida"),
    "New York": ("NY", "New York"),
    "Illinois": ("IL", "Illinois"),
}


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
def analyze_yields(request: AnalysisRequest, db: Session = Depends(get_db)) -> AnalysisResponse:
    if request.investment_amount < 5000:
        raise HTTPException(status_code=400, detail="Investment amount must be at least $5,000")

    term = request.term_length_months
    amount = request.investment_amount

    income_estimate = estimate_income_from_range(request.income_range)
    filing_status = "Single"
    filing_key = normalize_filing_status(filing_status)
    state_candidates = state_id_candidates(request.user_state or "")
    locality = normalize_locality(request.user_locality or "")

    try:
        fed_rate = get_federal_rate(db, filing_key, income_estimate, request.income_range, filing_status)
        state_rate = get_state_tax_rate(db, state_candidates, filing_key, income_estimate)
        local_rate = get_local_tax_rate(db, state_candidates, locality)
        offers = fetch_offers(db, term)
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database is not reachable")

    if not offers:
        offers = build_fallback_offers(term)

    total_cd_tax_rate = fed_rate + state_rate + local_rate
    total_treasury_tax_rate = fed_rate

    bank_cds: List[CDResult] = []
    brokerage_cds: List[BrokerageCDResult] = []
    treasuries: List[TreasuryResult] = []

    avg_cd_apy = average_cd_apy(offers)
    cd_tax_paid = amount * (avg_cd_apy / 100.0) * total_cd_tax_rate * (term / 12.0)

    for offer in offers:
        product_type = map_product_type(offer.product_type)
        if product_type == "Treasuries":
            after_tax_yield = offer.apy * (1 - total_treasury_tax_rate)
            treasury_tax_paid = amount * (offer.apy / 100.0) * total_treasury_tax_rate * (term / 12.0)
            tax_savings = cd_tax_paid - treasury_tax_paid
            treasuries.append(
                TreasuryResult(
                    security_type="Treasury",
                    cusip=offer.record_hash or "N/A",
                    maturity_term=f"{term} Months",
                    apy_nominal=offer.apy,
                    after_tax_yield=round(after_tax_yield, 2),
                    minimum_deposit=offer.minimum_deposit,
                    tax_savings_vs_cd=round(max(0, tax_savings), 2),
                    product_link=offer.destination_url or offer.source_url or "https://treasurydirect.gov",
                )
            )
            continue

        after_tax_apy = offer.apy * (1 - total_cd_tax_rate)
        net_earnings = amount * (after_tax_apy / 100.0) * (term / 12.0)

        if product_type == "Brokerage CDs":
            brokerage_cds.append(
                BrokerageCDResult(
                    institution_name=offer.institution_name or offer.issuing_bank or "Unknown",
                    brokerage_platform=offer.brokerage_firm or "Brokerage",
                    apy_nominal=offer.apy,
                    after_tax_yield=round(after_tax_apy, 2),
                    minimum_deposit=offer.minimum_deposit,
                    product_term=term,
                    product_link=offer.destination_url or offer.source_url or "https://example.com/brokerage",
                )
            )
        else:
            bank_cds.append(
                CDResult(
                    bank_name=offer.institution_name or offer.issuing_bank or "Unknown",
                    apy_nominal=offer.apy,
                    after_tax_apy=round(after_tax_apy, 2),
                    after_tax_yield=round(after_tax_apy, 2),
                    minimum_deposit=offer.minimum_deposit,
                    product_term=term,
                    product_link=offer.destination_url or offer.source_url or "https://example.com/apply",
                    fdic_insured=bool(offer.fdic_insured) if offer.fdic_insured is not None else True,
                    net_earnings_usd=round(net_earnings, 2),
                    data_source=offer.source_name or "SmartCD.AI",
                )
            )

    return AnalysisResponse(
        bank_cds=bank_cds,
        brokerage_cds=brokerage_cds,
        treasuries=treasuries,
    )


@app.post("/api/v1/fetch-yields", response_model=FetchYieldsResponse)
@app.post("/v1/fetch-yields", response_model=FetchYieldsResponse)
def fetch_yields(request: FetchYieldsRequest, db: Session = Depends(get_db)) -> FetchYieldsResponse:
    if request.investment_amount < 5000:
        raise HTTPException(status_code=400, detail="Investment amount must be at least $5,000")

    try:
        results = build_results(db, request)
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database is not reachable")

    return FetchYieldsResponse(results=results)


def build_results(db: Session, request: FetchYieldsRequest) -> List[CDProduct]:
    income_estimate = estimate_income_from_range(request.income_range)
    filing_key = normalize_filing_status(request.filing_status)
    state_candidates = state_id_candidates(request.user_state)
    locality = normalize_locality(request.user_locality)

    fed_rate = get_federal_rate(db, filing_key, income_estimate, request.income_range, request.filing_status)
    state_rate = get_state_tax_rate(db, state_candidates, filing_key, income_estimate)
    local_rate = get_local_tax_rate(db, state_candidates, locality)

    offers = fetch_offers(db, request.term_length_months)
    if not offers:
        return build_fallback_results(request, fed_rate, state_rate, local_rate)

    results: List[CDProduct] = []
    for offer in offers:
        product_type = map_product_type(offer.product_type)
        total_tax_rate = fed_rate if product_type == "Treasuries" else (fed_rate + state_rate + local_rate)

        gross_interest = request.investment_amount * (offer.apy / 100.0) * (request.term_length_months / 12.0)
        tax_amount = gross_interest * total_tax_rate
        after_tax_interest = gross_interest - tax_amount

        provider = offer.institution_name or offer.issuing_bank or offer.brokerage_firm or "Unknown"
        institution_type = build_institution_type(product_type, offer)

        federal_tax_text = f"-${gross_interest * fed_rate:,.2f}"
        state_tax_text = "$0.00" if product_type == "Treasuries" else f"-${gross_interest * state_rate:,.2f}"
        local_tax_text = "$0.00" if product_type == "Treasuries" else f"-${gross_interest * local_rate:,.2f}"

        results.append(
            CDProduct(
                id=offer.record_hash or slugify(f"{provider}-{offer.term_months}-{product_type}"),
                provider=provider,
                institutionType=institution_type,
                productType=product_type,
                nominalRate=round(offer.apy, 2),
                afterTaxYield=round(offer.apy * (1 - total_tax_rate), 2),
                minDeposit=offer.minimum_deposit,
                isTopPick=False,
                taxBreakdown=TaxBreakdown(
                    federalBracket=federal_tax_text,
                    stateTax=state_tax_text,
                    localOswego=local_tax_text,
                ),
                netReturn=f"${after_tax_interest:,.2f}",
                whyThisFits=build_fit_message(product_type),
                matchPercentage=0,
            )
        )

    mark_top_picks(results)
    compute_match_scores(results)
    return results


def fetch_offers(db: Session, term_months: int) -> List[Offer]:
    offers = db.query(Offer).filter(Offer.term_months == term_months).all()
    if offers:
        return offers

    return (
        db.query(Offer)
        .order_by(func.abs(Offer.term_months - term_months))
        .limit(50)
        .all()
    )


def build_fallback_offers(term_months: int) -> List[Offer]:
    offers: List[Offer] = []
    for product in FALLBACK_CATALOG:
        offers.append(
            Offer(
                record_hash=slugify(f"{product.provider}-{product.product_type}-{term_months}"),
                product_type=product.product_type,
                institution_name=product.provider,
                brokerage_firm="Fidelity" if product.product_type == "Brokerage CDs" else None,
                issuing_bank=product.provider,
                term_months=term_months,
                apy=product.nominal_rate,
                minimum_deposit=product.min_deposit,
                fdic_insured=True if product.product_type != "Treasuries" else None,
                source_name="Fallback",
                source_url=None,
                destination_url=None,
                retrieved_at=None,
            )
        )
    return offers


def average_cd_apy(offers: List[Offer]) -> float:
    cd_rates = [offer.apy for offer in offers if map_product_type(offer.product_type) != "Treasuries"]
    if not cd_rates:
        return 0.0
    return sum(cd_rates) / len(cd_rates)


def get_federal_rate(
    db: Session,
    filing_key: str,
    income: float,
    income_range: str,
    filing_status: str,
) -> float:
    row = (
        db.query(FederalTax)
        .filter(func.lower(FederalTax.filing_status).contains(filing_key))
        .filter(FederalTax.min_income <= income)
        .filter(or_(FederalTax.max_income.is_(None), FederalTax.max_income >= income))
        .order_by(desc(FederalTax.min_income))
        .first()
    )

    if row and row.rate is not None:
        return float(row.rate)

    return estimate_federal_tax_rate(income_range, filing_status)


def get_state_tax_rate(
    db: Session,
    state_candidates: Tuple[str, ...],
    filing_key: str,
    income: float,
) -> float:
    config = (
        db.query(StatesTaxConfig)
        .filter(StatesTaxConfig.state_id.in_(state_candidates))
        .first()
    )

    if config and not config.has_tax:
        return 0.0

    taxable_income = income
    if config:
        deduction = config.std_ded_jnt if filing_key == "joint" else config.std_ded_sgl
        if deduction:
            taxable_income = max(0.0, taxable_income - deduction)

        exemption = config.pers_exmpt_jnt if filing_key == "joint" else config.pers_exmpt_sgl
        if exemption:
            taxable_income = max(0.0, taxable_income - exemption)

    bracket = (
        db.query(TaxBracket)
        .filter(TaxBracket.state_id.in_(state_candidates))
        .filter(func.lower(TaxBracket.filing_status).contains(filing_key))
        .filter(TaxBracket.bracket_thrld <= taxable_income)
        .order_by(desc(TaxBracket.bracket_thrld))
        .first()
    )

    if bracket and bracket.tax_rate is not None:
        return float(bracket.tax_rate)

    return 0.0 if config and config.has_tax else 0.0


def get_local_tax_rate(db: Session, state_candidates: Tuple[str, ...], locality: str) -> float:
    if not locality:
        return 0.0

    candidates_lower = [candidate.lower() for candidate in state_candidates]
    locality_lower = locality.lower()

    row = (
        db.query(LocalTax)
        .filter(func.lower(LocalTax.state).in_(candidates_lower))
        .filter(
            or_(
                func.lower(LocalTax.city) == locality_lower,
                func.lower(LocalTax.county) == locality_lower,
            )
        )
        .order_by(desc(LocalTax.tax_rate))
        .first()
    )

    if row and row.tax_rate is not None:
        return float(row.tax_rate)

    return 0.0


def build_fallback_results(
    request: FetchYieldsRequest,
    fed_rate: float,
    state_rate: float,
    local_rate: float,
) -> List[CDProduct]:
    results: List[CDProduct] = []
    for product in FALLBACK_CATALOG:
        total_tax_rate = fed_rate if product.product_type == "Treasuries" else (fed_rate + state_rate + local_rate)
        gross_interest = request.investment_amount * (product.nominal_rate / 100.0) * (request.term_length_months / 12.0)
        after_tax_interest = gross_interest * (1 - total_tax_rate)

        results.append(
            CDProduct(
                id=slugify(f"{product.provider}-{product.product_type}-{request.term_length_months}"),
                provider=product.provider,
                institutionType=product.institution_type,
                productType=product.product_type,
                nominalRate=round(product.nominal_rate, 2),
                afterTaxYield=round(product.nominal_rate * (1 - total_tax_rate), 2),
                minDeposit=product.min_deposit,
                isTopPick=False,
                taxBreakdown=TaxBreakdown(
                    federalBracket=f"-${gross_interest * fed_rate:,.2f}",
                    stateTax="$0.00" if product.product_type == "Treasuries" else f"-${gross_interest * state_rate:,.2f}",
                    localOswego="$0.00" if product.product_type == "Treasuries" else f"-${gross_interest * local_rate:,.2f}",
                ),
                netReturn=f"${after_tax_interest:,.2f}",
                whyThisFits=build_fit_message(product.product_type),
                matchPercentage=0,
            )
        )

    mark_top_picks(results)
    compute_match_scores(results)
    return results


def map_product_type(value: str) -> str:
    normalized = (value or "").lower()
    if "treasury" in normalized:
        return "Treasuries"
    if "brokerage" in normalized:
        return "Brokerage CDs"
    return "Bank CDs"


def build_institution_type(product_type: str, offer: Offer) -> str:
    if product_type == "Treasuries":
        return "Backed by U.S. Government"

    if product_type == "Brokerage CDs":
        brokerage = offer.brokerage_firm or "Brokerage"
        return f"Member of FDIC, Issued through {brokerage}"

    if offer.fdic_insured is False:
        return "Not FDIC Insured"

    return "Member of FDIC"


def build_fit_message(product_type: str) -> str:
    if product_type == "Treasuries":
        return (
            "US Treasuries are exempt from state and local taxes, which often makes their "
            "after-tax yield more competitive when compared to CDs in higher-tax states."
        )
    if product_type == "Brokerage CDs":
        return (
            "Brokerage CDs combine FDIC insurance with access to marketplace pricing, "
            "often delivering strong yields for term-focused investors."
        )
    return (
        "This bank CD offers FDIC insurance and a predictable return, "
        "making it a solid fit for conservative investors seeking stability."
    )


def mark_top_picks(results: Iterable[CDProduct]) -> None:
    best_by_type: Dict[str, CDProduct] = {}
    for result in results:
        current_best = best_by_type.get(result.productType)
        if current_best is None or result.afterTaxYield > current_best.afterTaxYield:
            best_by_type[result.productType] = result

    for result in results:
        if best_by_type.get(result.productType) == result:
            result.isTopPick = True


def compute_match_scores(results: List[CDProduct]) -> None:
    if not results:
        return

    max_yield = max(result.afterTaxYield for result in results)
    for result in results:
        if max_yield <= 0:
            result.matchPercentage = 70
            continue
        ratio = result.afterTaxYield / max_yield
        result.matchPercentage = int(round(70 + (30 * ratio)))


def estimate_income_from_range(income_range: str) -> float:
    normalized = income_range.lower()
    matches = [int(value.replace(",", "")) for value in re.findall(r"\d[\d,]*", normalized)]

    if not matches:
        return 50000.0

    if "less" in normalized:
        return float(matches[0])

    if "above" in normalized:
        return float(matches[0])

    if len(matches) >= 2:
        return float(sum(matches[:2]) / 2)

    return float(matches[0])


def estimate_federal_tax_rate(income_range: str, filing_status: str) -> float:
    normalized = income_range.lower()
    rate = 0.22

    if "less" in normalized or "25,000" in normalized:
        rate = 0.12
    elif "35,000" in normalized or "50,000" in normalized:
        rate = 0.12
    elif "75,000" in normalized or "100,000" in normalized:
        rate = 0.22
    elif "150,000" in normalized:
        rate = 0.24
    elif "200,000" in normalized:
        rate = 0.32
    elif "250,000" in normalized:
        rate = 0.35

    if "married" in filing_status.lower() and rate > 0.12:
        rate -= 0.02

    return max(rate, 0.1)


def normalize_filing_status(value: str) -> str:
    lowered = value.lower()
    if "joint" in lowered or "surviving" in lowered:
        return "joint"
    if "separate" in lowered:
        return "separate"
    if "head" in lowered:
        return "head"
    return "single"


def state_id_candidates(state: str) -> Tuple[str, ...]:
    if not state:
        return ("",)
    return STATE_ID_ALIASES.get(state, (state,))


def normalize_locality(value: str) -> str:
    if not value:
        return ""
    return re.sub(r"\s*\(.*?\)\s*", "", value).strip()


def slugify(value: str) -> str:
    return "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in value).split())
