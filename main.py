import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

import ai_service
from ai_service import (
    AIServiceConfigError,
    AIServiceResponseError,
    explain_why_this_fits,
    stream_chat_about_results,
    summarize_bullet_rate_risk,
)

app = FastAPI(title="SmartCD AI Layer", version="1.0.0")

_cors_origins = [origin.strip() for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if origin.strip()]
if not _cors_origins:
    _cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User's chatbot question")
    ranking_response: Dict[str, Any] = Field(..., description="Full ranking API response")


class WhyThisFitsRequest(BaseModel):
    product_type: str = Field(..., description="Product type")
    term_months: int = Field(..., description="Product term in months")
    apy_nominal: Optional[float] = Field(default=None, description="Nominal APY if available")
    after_tax_apy: Optional[float] = Field(default=None, description="After-tax APY if available")
    fdic_insured: Optional[bool] = Field(default=None, description="Is Product FDIC Insured")
    minimum_deposit: Optional[float] = Field(default=None, description="Minimum deposit if available")
    user_state: Optional[str] = Field(default=None, description="State Location of User")
    income_range: Optional[str] = Field(default=None, description="Income Range of User")
    rank_overall: Optional[int] = Field(default=None, description="Overall rank if available")


class WhyThisFitsResponse(BaseModel):
    headline: str = Field(..., description="Punchy benefit-focused headline, max 8 words")
    insight: str = Field(..., description="1-2 sentence explanation of the why, max 40 words")


class GenerateBrokeredCDsRequest(BaseModel):
    trigger: Optional[str] = Field(default=None, description="Optional trigger field for manual generation")


class GenerateBrokeredCDsResponse(BaseModel):
    products: list[Dict[str, Any]] = Field(..., description="Generated brokered CD products")


class BulletRateRiskScenarioInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(..., min_length=1)
    dollar_impact: float


class BulletRateRiskSummaryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    locked_pct: float
    deferred_pct: float
    worst_case_dollar_impact: float
    break_even_drop: float
    user_state: str = Field(..., min_length=1)
    flat_total_return: float
    scenarios: List[BulletRateRiskScenarioInput] = Field(..., min_length=1)


class BulletRateRiskSummaryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ai_summary_input: BulletRateRiskSummaryInput


class BulletRateRiskSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    headline: str = Field(..., min_length=1, max_length=120)
    insight: str = Field(..., min_length=1, max_length=240)
    cache_hit: bool = False


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "message": "SmartCD AI Layer is running",
        "endpoints": {
            "health": "/health",
            "explain_why_this_fits": "/explain-why-this-fits",
            "generate_brokered_cds": "/generate-brokered-cds (generates 16 brokered CDs across 3, 6, 12, 24 month terms)",
            "chat_stream": "/chat/stream",
            "bullet_rate_risk_summary": "/strategy/bullet/rate-risk/summary",
        },
    }


@app.post("/explain-why-this-fits", response_model=WhyThisFitsResponse)
def explain_why_this_fits_endpoint(req: WhyThisFitsRequest) -> WhyThisFitsResponse:
    try:
        result = explain_why_this_fits(req.model_dump())
        return WhyThisFitsResponse(
            headline=result.get("headline", ""),
            insight=result.get("insight", ""),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Why this fits failed: {str(exc)}")


@app.post("/generate-brokered-cds", response_model=GenerateBrokeredCDsResponse)
def generate_brokered_cds_endpoint(req: GenerateBrokeredCDsRequest) -> GenerateBrokeredCDsResponse:
    try:
        generator = getattr(ai_service, "generate_brokered_cds", None)
        if generator is None:
            generator = getattr(ai_service, "generate_brokered_cds_multi_term", None)

        if generator is None:
            raise RuntimeError("No brokered CD generator found in ai_service")

        result = generator()
        return GenerateBrokeredCDsResponse(products=result.get("products", []))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Brokered CD generation failed: {str(exc)}")


@app.post("/chat/stream")
def stream_chat(req: ChatRequest):
    try:
        def generator():
            for chunk in stream_chat_about_results(req.question, req.ranking_response):
                yield chunk

        return StreamingResponse(generator(), media_type="text/plain")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Streaming chat failed: {str(exc)}")


@app.post("/strategy/bullet/rate-risk/summary", response_model=BulletRateRiskSummaryResponse)
def bullet_rate_risk_summary(req: BulletRateRiskSummaryRequest) -> BulletRateRiskSummaryResponse:
    try:
        result = summarize_bullet_rate_risk(req.ai_summary_input.model_dump())
        return BulletRateRiskSummaryResponse(**result)
    except AIServiceConfigError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "ai_service_unavailable", "message": str(exc)},
        )
    except AIServiceResponseError as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "invalid_ai_response", "message": str(exc)},
        )
    except TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail={"code": "ai_timeout", "message": str(exc)},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"code": "bullet_rate_risk_summary_failed", "message": str(exc)},
        )
