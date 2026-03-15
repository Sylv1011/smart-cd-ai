from dotenv import load_dotenv
load_dotenv()
import os
import logging
from typing import Optional, Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data import DataClient, RankingInput
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

# ---------------- Supabase client (created once) ----------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase configuration")

sb = DataClient(SUPABASE_URL, SUPABASE_KEY)

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
    }


@app.get("/weather")
def weather_not_supported():
    # Some browser extensions / tools probe this path. This API doesn't serve weather.
    raise HTTPException(status_code=404, detail="Route not supported. Use /docs for available endpoints.")

@app.post("/rank", response_model=RankResponse, response_model_exclude_none=True)
def rank(req: RankRequest) -> Dict[str, Any]:
    try:
        logger.info(
            "Rank request: amount=%s term=%s state=%s income=%s",
            req.investment_amount,
            req.term_months,
            req.state,
            req.income_range,
        )

        inp = RankingInput(
            investment_amount=req.investment_amount,
            term_months=req.term_months,
            state=req.state.upper(),
            income_range=req.income_range,
            filing_status=req.filing_status.lower(),
            local_area=req.local_area.lower() if req.local_area else None,
        )

        result = rank_offers(
            inp,
            data_client=sb,
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
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        logger.exception("Ranking failed")
        raise HTTPException(status_code=500, detail="Ranking engine failed")