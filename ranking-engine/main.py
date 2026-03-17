from pathlib import Path
from dotenv import load_dotenv

# Load env vars from `ranking-engine/.env` regardless of where the process is started from.
# In Render/production this file typically doesn't exist, so this is a no-op.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)
import os
import logging
from typing import Optional, Any, Dict
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data import DataClient, RankingInput, StaticDataClient
from engine import rank_offers

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


def normalize_state_to_code(state: str) -> str:
    value = (state or "").strip()
    if len(value) == 2:
        return value.upper()
    return STATE_NAME_TO_CODE.get(value.lower(), value.upper())


@lru_cache(maxsize=1)
def get_data_client() -> DataClient:
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
            # Fallback for local environments missing supabase-py; keep service usable.
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
        "data_mode": (_env("SMARTCD_DATA_MODE") or ("supabase" if _env("SUPABASE_URL") else "static")),
    }


@app.get("/weather")
def weather_not_supported():
    # Some browser extensions / tools probe this path. This API doesn't serve weather.
    raise HTTPException(status_code=404, detail="Route not supported. Use /docs for available endpoints.")

@app.post("/rank", response_model=RankResponse, response_model_exclude_none=True)
def rank(req: RankRequest) -> Dict[str, Any]:
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

        # Return only the sections needed by the frontend
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
