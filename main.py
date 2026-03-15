import os
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_service import explain_top_3, chat_about_results

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


class ExplainTop3Request(BaseModel):
    ranking_response: Dict[str, Any] = Field(..., description="Full ranking API response")


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User's chatbot question")
    ranking_response: Dict[str, Any] = Field(..., description="Full ranking API response")


class ProductExplanation(BaseModel):
    rank_overall: int = Field(..., description="Overall rank position")
    title: str = Field(..., description="Product title for the UI")
    why_this_fits: str = Field(..., description="Short user-facing explanation for the product card")
    highlights: List[str] = Field(default_factory=list, description="Concise supporting points for the UI")


class Top3ProductsResponse(BaseModel):
    products: List[ProductExplanation] = Field(default_factory=list, description="Per-product explanations for the top 5 results")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Single chatbot response returned to the UI")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "SmartCD AI Layer is running"}


@app.post("/explain-top-3", response_model=Top3ProductsResponse)
def explain_top3(req: ExplainTop3Request) -> Top3ProductsResponse:
    try:
        result = explain_top_3(req.ranking_response)
        products = result.get("products", [])

        normalized_products: List[ProductExplanation] = []
        for product in products:
            normalized_products.append(
                ProductExplanation(
                    rank_overall=product.get("rank_overall", 0),
                    title=product.get("title", ""),
                    why_this_fits=product.get("why_this_fits", ""),
                    highlights=product.get("highlights", []),
                )
            )

        return Top3ProductsResponse(products=normalized_products)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Top 5 explanation failed: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    try:
        response_text = chat_about_results(req.question, req.ranking_response)
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat response failed: {str(e)}")
