from pathlib import Path
from dotenv import load_dotenv

# Load env vars from `ranking-engine/.env` regardless of where the process is started from.
# In Render/production this file typically doesn't exist, so this is a no-op.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)

import os
import logging
from typing import Optional, Any, Dict, Literal, List
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from data import DataClient, RankingInput, StaticDataClient
from bullet_rate_risk import (
    TrancheRateRisk,
    build_ai_summary_input,
    compute_best_single_cd_return,
    compute_break_even,
    compute_portfolio_totals,
    deferred_flat_total,
    deferred_term_avg_months,
    summarize_allocations,
)
from engine import rank_offers, RankingEngineError
from rate_risk_cache import rate_risk_cache
from strategies import simulate_barbell, simulate_ladder, simulate_bullet

# ---------------- Logging ----------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("smartcd_api")

# ---------------- App ----------------
app = FastAPI(title="SmartCD Ranking API")

# CORS (lock this down later to your Vercel domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _env(key: str) -> Optional[str]:
    v = os.getenv(key)
    return v.strip() if v and v.strip() else None


STATE_NAME_TO_CODE = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
}

VALID_STATE_CODES = set(STATE_NAME_TO_CODE.values())
LOCAL_TAX_STATES = {"NY", "MD", "IN", "MI"}

# log cache metrics every N rank requests
METRICS_LOG_EVERY = int(os.getenv("METRICS_LOG_EVERY", "10"))
_rank_request_count = 0


def normalize_state_to_code(state: str) -> str:
    value = (state or "").strip()
    if len(value) == 2:
        return value.upper()
    return STATE_NAME_TO_CODE.get(value.lower(), value.upper())


@lru_cache(maxsize=1)
def get_data_client():
    """
    Chooses the data backend for ranking:
      - default: Supabase if configured
      - fallback: a deterministic in-memory dataset for local dev

    Override with SMARTCD_DATA_MODE=supabase|static.
    """
    mode = (_env("SMARTCD_DATA_MODE") or "").lower()
    environment = (_env("ENVIRONMENT") or "").lower()

    supabase_url = _env("SUPABASE_URL")
    supabase_key = _env("SUPABASE_SERVICE_ROLE_KEY") or _env("SUPABASE_ANON_KEY")

    if mode == "static":
        logger.warning("SMARTCD_DATA_MODE=static -> using StaticDataClient (no Supabase)")
        return StaticDataClient()

    if not mode and environment == "production":
        mode = "supabase"

    if mode == "supabase" and (not supabase_url or not supabase_key):
        raise RuntimeError("SMARTCD_DATA_MODE=supabase requires SUPABASE_URL and SUPABASE_*_KEY")

    if supabase_url and supabase_key:
        try:
            return DataClient(supabase_url, supabase_key)
        except Exception as e:
            logger.exception("Supabase client init failed; falling back to StaticDataClient. error=%s", e)
            return StaticDataClient()

    logger.warning("Supabase not configured -> using StaticDataClient (set SUPABASE_URL + SUPABASE_*_KEY to enable)")
    return StaticDataClient()


# ---------------- Request model ----------------
class RankRequest(BaseModel):
    investment_amount: float = Field(gt=0)
    term_months: int = Field(gt=0, le=120)
    state: str = Field(min_length=2, max_length=32)
    income_range: str
    filing_status: str
    local_area: Optional[str] = None

    top_n_bank_cds: int = Field(default=10, ge=1, le=50)
    top_n_brokered_cds: int = Field(default=10, ge=1, le=50)
    top_n_treasuries: int = Field(default=1, ge=1, le=10)
    top_n_overall: int = Field(default=3, ge=1, le=50)


class RankedOfferResponse(BaseModel):
    product_type: str
    institution_name: Optional[str] = None
    brokerage_firm: Optional[str] = None
    issuing_bank: Optional[str] = None
    term_months: int
    apy_nominal: float
    after_tax_apy: float
    minimum_deposit: Optional[float] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    destination_url: Optional[str] = None
    fdic_insured: Optional[bool] = None
    retrieved_at: str
    investment_amount: float
    term_fraction_years: float
    nominal_interest_usd: float
    after_tax_interest_usd: float
    total_marginal_tax_rate: float
    fed_rate: float
    state_rate: float
    local_rate: float
    match_percentage: int = 0
    rank_overall: Optional[int] = None


class RankResponse(BaseModel):
    bank_cds: list[RankedOfferResponse]
    brokered_cds: list[RankedOfferResponse]
    treasuries: list[RankedOfferResponse]
    overall_top: list[RankedOfferResponse]


class StrategySimulateRequest(BaseModel):
    strategy_type: Literal["barbell", "ladder", "bullet"]
    investment_amount: float = Field(gt=0)
    state: str = Field(min_length=2, max_length=32)
    income_range: str
    filing_status: str
    local_area: Optional[str] = None
    time_horizon: Optional[str] = None
    target_maturity_months: Optional[int] = Field(default=None, gt=0, le=120)
    short_term_percentage: Optional[int] = Field(default=None, ge=20, le=50)
    short_term_months: Optional[int] = Field(default=None, gt=0, lt=12)
    long_term_months: Optional[int] = Field(default=None, ge=12, le=60)
    liquidity_preference: Optional[Literal["low", "medium", "high"]] = None
    rate_outlook: Optional[Literal["rising", "stable", "falling"]] = None
    product_type_filter: Optional[str] = None


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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("%s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "name": "SmartCD Ranking API",
        "version": "1.0",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
        "rank": "/rank",
        "metrics": "/metrics",
        "data_mode": (_env("SMARTCD_DATA_MODE") or ("supabase" if _env("SUPABASE_URL") else "static")),
    }


@app.get("/metrics")
def metrics():
    data_client = get_data_client()

    if hasattr(data_client, "get_cache_metrics"):
        return {
            "data_mode": data_client.__class__.__name__,
            "cache_metrics": data_client.get_cache_metrics(),
        }

    if hasattr(data_client, "_metrics"):
        return {
            "data_mode": data_client.__class__.__name__,
            "cache_metrics": dict(data_client._metrics),
        }

    return {
        "data_mode": data_client.__class__.__name__,
        "cache_metrics": {},
        "message": "Metrics not available for current data client",
    }


@app.get("/weather")
def weather_not_supported():
    # Some browser extensions / tools probe this path. This API doesn't serve weather.
    raise HTTPException(status_code=404, detail="Route not supported. Use /docs for available endpoints.")


@app.post("/rank", response_model=RankResponse, response_model_exclude_none=True)
def rank(req: RankRequest) -> Dict[str, Any]:
    global _rank_request_count

    try:
        normalized_state = normalize_state_to_code(req.state)
        if normalized_state not in VALID_STATE_CODES:
            raise HTTPException(status_code=422, detail="Invalid state provided")

        normalized_local_area = (req.local_area or "").strip().lower() or None
        if normalized_state not in LOCAL_TAX_STATES:
            normalized_local_area = None

        logger.info(
            "Rank request: amount=%s term=%s state=%s income=%s",
            req.investment_amount,
            req.term_months,
            normalized_state,
            req.income_range,
        )

        inp = RankingInput(
            investment_amount=req.investment_amount,
            term_months=req.term_months,
            state=normalized_state,
            income_range=req.income_range,
            filing_status=req.filing_status.lower(),
            local_area=normalized_local_area,
        )

        data_client = get_data_client()

        result = rank_offers(
            inp,
            data_client=data_client,
            top_n_bank_cds=req.top_n_bank_cds,
            top_n_brokered_cds=req.top_n_brokered_cds,
            top_n_treasuries=req.top_n_treasuries,
            top_n_overall=req.top_n_overall,
        )

        _rank_request_count += 1
        if METRICS_LOG_EVERY > 0 and _rank_request_count % METRICS_LOG_EVERY == 0:
            if hasattr(data_client, "log_cache_metrics"):
                data_client.log_cache_metrics()

        return {
            "bank_cds": result.get("bank_cds", []),
            "brokered_cds": result.get("brokered_cds", []),
            "treasuries": result.get("treasuries", []),
            "overall_top": result.get("overall_top", []),
        }

    except RuntimeError as e:
        logger.exception("Server configuration error")
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Ranking failed")
        raise HTTPException(status_code=500, detail="Ranking engine failed")


@app.post("/strategies/simulate")
def simulate_strategy(req: StrategySimulateRequest) -> Dict[str, Any]:
    try:
        normalized_state = normalize_state_to_code(req.state)
        if normalized_state not in VALID_STATE_CODES:
            raise HTTPException(status_code=422, detail="Invalid state provided")

        normalized_local_area = (req.local_area or "").strip().lower() or None
        if normalized_state not in LOCAL_TAX_STATES:
            normalized_local_area = None

        data_client = get_data_client()

        strategy_type = req.strategy_type.lower()
        if strategy_type == "barbell":
            return simulate_barbell(
                data_client=data_client,
                investment_amount=req.investment_amount,
                state=normalized_state,
                income_range=req.income_range,
                filing_status=req.filing_status.lower(),
                local_area=normalized_local_area,
                liquidity_preference=req.liquidity_preference,
                rate_outlook=req.rate_outlook,
                time_horizon=req.time_horizon,
                target_maturity_months=req.target_maturity_months,
                short_term_percentage=req.short_term_percentage,
                short_term_months=req.short_term_months,
                long_term_months=req.long_term_months,
            )

        if strategy_type == "ladder":
            return simulate_ladder(
                data_client=data_client,
                investment_amount=req.investment_amount,
                state=normalized_state,
                income_range=req.income_range,
                filing_status=req.filing_status.lower(),
                local_area=normalized_local_area,
                liquidity_preference=req.liquidity_preference,
                rate_outlook=req.rate_outlook,
                time_horizon=req.time_horizon,
                product_type_filter=req.product_type_filter,
            )

        if strategy_type == "bullet":
            return simulate_bullet(data_client=data_client,
                investment_amount=req.investment_amount,
                state=normalized_state,
                income_range=req.income_range,
                filing_status=req.filing_status.lower(),
                local_area=normalized_local_area,
                liquidity_preference=req.liquidity_preference,
                rate_outlook=req.rate_outlook,
                time_horizon=req.time_horizon,
                )

        raise HTTPException(status_code=400, detail="Invalid strategy_type")

    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except RankingEngineError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        logger.exception("Server configuration error")
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Strategy simulation failed")
        raise HTTPException(status_code=500, detail="Strategy simulation failed")


@app.post("/strategy/bullet/rate-risk", response_model=BulletRateRiskResponse)
def bullet_rate_risk(req: BulletRateRiskRequest) -> BulletRateRiskResponse:
    allocation_sum = sum(tranche.allocation for tranche in req.tranches)
    if allocation_sum <= 0:
        raise HTTPException(status_code=400, detail="Total allocation must be > 0")
    if abs(allocation_sum - req.investment_amount) > 0.01:
        raise HTTPException(
            status_code=400,
            detail="Sum of tranche allocations must equal investment_amount",
        )

    tranches = [
        TrancheRateRisk(
            allocation=float(tranche.allocation),
            after_tax_apy=float(tranche.after_tax_apy),
            term_months=int(tranche.cd_term_months),
            buy_in_months=int(tranche.buy_in_months),
        )
        for tranche in req.tranches
    ]

    cache_key = rate_risk_cache.make_key(
        investment_amount=req.investment_amount,
        user_state=req.user_state,
        user_income_range=req.user_income_range,
        tranches=[tranche.model_dump() for tranche in req.tranches],
    )

    cached = rate_risk_cache.get(cache_key)
    if cached is not None:
        cached_payload = dict(cached)
        cached_payload["cache_hit"] = True
        return BulletRateRiskResponse(**cached_payload)

    scenarios_full = compute_portfolio_totals(tranches)
    flat_total = next((scenario["total_return"] for scenario in scenarios_full if scenario["delta"] == 0.0), 0.0)

    allocation_summary = summarize_allocations(req.investment_amount, tranches)
    deferred_avg = deferred_term_avg_months(tranches)
    best_single = compute_best_single_cd_return(req.investment_amount, tranches, deferred_avg)
    deferred_flat = deferred_flat_total(tranches)
    break_even_drop = compute_break_even(
        deferred_flat_return=float(deferred_flat),
        best_single_cd_return=float(best_single),
        deferred_allocation=float(allocation_summary["deferred_amount"]),
        deferred_term_avg_months_value=float(deferred_avg),
    )

    scenarios = [
        RateRiskScenario(
            label=scenario["label"],
            delta=float(scenario["delta"]),
            total_return=float(scenario["total_return"]),
            dollar_impact=float(scenario["dollar_impact"]),
        )
        for scenario in scenarios_full
    ]
    worst_case = min((scenario.dollar_impact for scenario in scenarios), default=0.0)

    ai_summary = BulletRateRiskAiSummaryInput(
        **build_ai_summary_input(
            locked_pct=float(allocation_summary["locked_pct"]),
            deferred_pct=float(allocation_summary["deferred_pct"]),
            worst_case_dollar_impact=float(worst_case),
            break_even_drop=float(break_even_drop),
            user_state=req.user_state,
            flat_total_return=float(flat_total),
            scenarios=[scenario.model_dump() for scenario in scenarios],
        )
    )

    response_payload = {
        "locked_amount": float(allocation_summary["locked_amount"]),
        "locked_pct": float(allocation_summary["locked_pct"]),
        "deferred_amount": float(allocation_summary["deferred_amount"]),
        "deferred_pct": float(allocation_summary["deferred_pct"]),
        "scenarios": [scenario.model_dump() for scenario in scenarios],
        "break_even_drop": float(break_even_drop),
        "cache_hit": False,
        "ai_summary_input": ai_summary.model_dump(),
    }

    try:
        rate_risk_cache.set(cache_key, response_payload)
    except Exception:
        logger.exception("Failed to cache Bullet rate-risk response")

    return BulletRateRiskResponse(**response_payload)
