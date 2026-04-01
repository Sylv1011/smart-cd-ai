import os
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import ai_service
from ai_service import explain_why_this_fits, stream_chat_about_results

app = FastAPI(title="SmartCD AI Layer", version="1.0.0")

# CORS: required for browser calls from Vercel/SmartCD domains (preflight OPTIONS).
_cors_origins = [o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if o.strip()]
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
    institution_name: Optional[str] = Field(default=None, description="Institution name if applicable")
    brokerage_firm: Optional[str] = Field(default=None, description="Brokerage firm if applicable")
    term_months: int = Field(..., description="Product term in months")
    apy_nominal: Optional[float] = Field(default=None, description="Nominal APY if available")
    after_tax_apy: Optional[float] = Field(default=None, description="After-tax APY if available")
    minimum_deposit: Optional[float] = Field(default=None, description="Minimum deposit if available")
    after_tax_interest_usd: Optional[float] = Field(default=None, description="After-tax interest in USD if available")
    fdic_insured: Optional[bool] = Field(default=None, description="FDIC insured flag if applicable")
    rank_overall: Optional[int] = Field(default=None, description="Overall rank if available")


class WhyThisFitsResponse(BaseModel):
    why_this_fits: str = Field(..., description="Short user-facing explanation")


class GenerateBrokeredCDsRequest(BaseModel):
    trigger: Optional[str] = Field(default=None, description="Optional trigger field for manual generation")


class GenerateBrokeredCDsResponse(BaseModel):
    products: list[Dict[str, Any]] = Field(..., description="Generated brokered CD products")


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
        },
    }


@app.post("/explain-why-this-fits", response_model=WhyThisFitsResponse)
def explain_why_this_fits_endpoint(req: WhyThisFitsRequest) -> WhyThisFitsResponse:
    try:
        result = explain_why_this_fits(req.model_dump())
        return WhyThisFitsResponse(why_this_fits=result.get("why_this_fits", ""))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Why this fits failed: {str(e)}")


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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brokered CD generation failed: {str(e)}")

@app.post("/chat/stream")
def stream_chat(req: ChatRequest):
    try:
        def generator():
            for chunk in stream_chat_about_results(req.question, req.ranking_response):
                yield chunk

        return StreamingResponse(generator(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming chat failed: {str(e)}")