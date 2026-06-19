from __future__ import annotations

from datetime import date
from typing import List

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from api.bullet_convergence import (
    TrancheComputed,
    availability_score,
    build_ai_summary_input,
    compute_deviation_days,
    compute_flags,
    confidence_label,
    deposit_score,
    overall_confidence,
    term_match_score,
    tranche_composite_score,
)
from api.bullet_rate_risk import (
    TrancheRateRisk,
    build_ai_summary_input as build_rate_risk_ai_summary_input,
    compute_best_single_cd_return,
    compute_break_even,
    compute_portfolio_totals,
    deferred_flat_total,
    deferred_term_avg_months,
    summarize_allocations,
)
from api.convergence_cache import convergence_cache
from api.rate_risk_cache import rate_risk_cache
from api.database import get_db
from api.models import Offer
from api.schemas import (
    AISummaryInput,
    BulletConvergenceRequest,
    BulletConvergenceResponse,
    BulletRateRiskAiSummaryInput,
    BulletRateRiskRequest,
    BulletRateRiskResponse,
    DeviationEntry,
    RateRiskScenario,
    TrancheResult,
)

router = APIRouter(prefix="/strategy", tags=["strategy"])


@router.post("/bullet/convergence", response_model=BulletConvergenceResponse)
def bullet_convergence(
    request: BulletConvergenceRequest,
    db: Session = Depends(get_db),
) -> BulletConvergenceResponse:
    today = date.today()

    if request.target_maturity_date <= today:
        raise HTTPException(
            status_code=400, detail="Target maturity date must be in the future"
        )
    if not request.tranches:
        raise HTTPException(status_code=400, detail="At least one tranche is required")
    for t in request.tranches:
        if not t.product_id:
            raise HTTPException(status_code=400, detail="product_id required for all tranches")

    tranche_dicts = [
        {"product_id": t.product_id, "buy_in_months": t.buy_in_months,
         "required_term_months": t.required_term_months}
        for t in request.tranches
    ]
    cache_key = convergence_cache.make_key(str(request.target_maturity_date), tranche_dicts)

    # Always query Supabase in real time — never use cached product data
    try:
        product_ids = [t.product_id for t in request.tranches]
        offers = db.query(Offer).filter(Offer.record_hash.in_(product_ids)).all()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Product availability check unavailable — try again shortly",
        )

    offer_map = {o.record_hash: o for o in offers}

    computed_tranches: List[TrancheComputed] = []
    tranche_results: List[TrancheResult] = []

    for t in request.tranches:
        offer = offer_map.get(t.product_id)
        product_found = offer is not None
        actual_term = offer.term_months if offer else t.required_term_months
        status = (offer.status or "active") if offer else None
        min_deposit = float(offer.minimum_deposit) if offer else 0.0

        if not product_found:
            t_score = a_score = d_score = composite = 0.0
        else:
            t_score = term_match_score(t.required_term_months, actual_term)
            a_score = availability_score(status)
            d_score = deposit_score(t.allocation, min_deposit)
            composite = tranche_composite_score(t_score, a_score, d_score)

        deviation = compute_deviation_days(today, t.buy_in_months, actual_term, request.target_maturity_date)
        flags = compute_flags(
            deviation_days=deviation,
            status=status,
            product_found=product_found,
            allocation=t.allocation,
            min_deposit=min_deposit,
            required_term_months=t.required_term_months,
            actual_term_months=actual_term,
        )
        actual_maturity = today + relativedelta(months=t.buy_in_months + actual_term)

        computed_tranches.append(
            TrancheComputed(
                slot=t.slot,
                tranche_score=composite,
                deviation_days=deviation,
                flags=flags,
                actual_maturity_date=actual_maturity,
            )
        )
        tranche_results.append(
            TrancheResult(
                slot=t.slot,
                buy_in_months=t.buy_in_months,
                product_id=t.product_id,
                term_match_score=t_score,
                availability_score=a_score,
                deposit_score=d_score,
                tranche_score=composite,
                actual_maturity_date=actual_maturity,
                deviation_days=deviation,
                flags=flags,
            )
        )

    ov_score = overall_confidence([c.tranche_score for c in computed_tranches])
    label = confidence_label(ov_score)

    # Spec: all products not found → score 0, At Risk
    if all("product_not_found" in c.flags for c in computed_tranches):
        ov_score = 0.0
        label = "At Risk"

    ai_dict = build_ai_summary_input(ov_score, label, request.target_maturity_date, computed_tranches)

    cached = convergence_cache.get(cache_key)
    cache_hit = cached is not None
    if not cache_hit:
        convergence_cache.set(
            cache_key,
            ai_dict,
            product_ids={t.product_id for t in request.tranches},
        )

    ai_summary = AISummaryInput(
        overall_score=ai_dict["overall_score"],
        confidence_label=ai_dict["confidence_label"],
        target_maturity_date=ai_dict["target_maturity_date"],
        tranche_count=ai_dict["tranche_count"],
        flags=ai_dict["flags"],
        deviations=[DeviationEntry(**d) for d in ai_dict["deviations"]],
        at_risk_tranches=ai_dict["at_risk_tranches"],
        limited_availability_tranches=ai_dict["limited_availability_tranches"],
    )

    return BulletConvergenceResponse(
        overall_score=ov_score,
        confidence_label=label,
        target_maturity_date=request.target_maturity_date,
        cache_hit=cache_hit,
        tranches=tranche_results,
        ai_summary_input=ai_summary,
    )


@router.post("/bullet/convergence/invalidate-cache")
def invalidate_convergence_cache(product_ids: List[str]) -> dict:
    """Called by the ingestion pipeline after marking products inactive."""
    convergence_cache.invalidate_by_product_ids(product_ids)
    return {"invalidated": True, "product_ids": product_ids}


# NOTE:
# - /strategy/bullet/rate-risk computes deterministic numeric scenario data only.
# - The plain-English AI explanation now lives in the separate ai-layer service.
@router.post("/bullet/rate-risk", response_model=BulletRateRiskResponse)
def bullet_rate_risk(
    request: BulletRateRiskRequest,
) -> BulletRateRiskResponse:
    # Validate allocations sum to investment amount (within a small tolerance).
    allocation_sum = sum(t.allocation for t in request.tranches)
    if allocation_sum <= 0:
        raise HTTPException(status_code=400, detail="Total allocation must be > 0")
    if abs(allocation_sum - request.investment_amount) > 0.01:
        raise HTTPException(
            status_code=400,
            detail="Sum of tranche allocations must equal investment_amount",
        )

    tranches = [
        TrancheRateRisk(
            allocation=float(t.allocation),
            after_tax_apy=float(t.after_tax_apy),
            term_months=int(t.cd_term_months),
            buy_in_months=int(t.buy_in_months),
        )
        for t in request.tranches
    ]

    # The cache identity must include every field that can affect the computation.
    # This prevents two different portfolios from colliding on the same cached response.
    cache_key = rate_risk_cache.make_key(
        investment_amount=request.investment_amount,
        user_state=request.user_state,
        user_income_range=request.user_income_range,
        tranches=[t.model_dump() for t in request.tranches],
    )

    cached = rate_risk_cache.get(cache_key)
    if cached is not None:
        cached_payload = dict(cached)
        cached_payload["cache_hit"] = True
        return BulletRateRiskResponse(**cached_payload)

    scenarios_full = compute_portfolio_totals(tranches)
    flat_total = next((s["total_return"] for s in scenarios_full if s["delta"] == 0.0), 0.0)

    alloc_summary = summarize_allocations(request.investment_amount, tranches)
    deferred_avg = deferred_term_avg_months(tranches)
    best_single = compute_best_single_cd_return(request.investment_amount, tranches, deferred_avg)
    deferred_flat = deferred_flat_total(tranches)
    break_even_drop = compute_break_even(
        deferred_flat_return=float(deferred_flat),
        best_single_cd_return=float(best_single),
        deferred_allocation=float(alloc_summary["deferred_amount"]),
        deferred_term_avg_months=float(deferred_avg),
    )

    scenarios = [
        RateRiskScenario(
            label=s["label"],
            delta=float(s["delta"]),
            total_return=float(s["total_return"]),
            dollar_impact=float(s["dollar_impact"]),
        )
        for s in scenarios_full
    ]
    worst_case = min((s.dollar_impact for s in scenarios), default=0.0)

    ai_summary_dict = build_rate_risk_ai_summary_input(
        locked_pct=float(alloc_summary["locked_pct"]),
        deferred_pct=float(alloc_summary["deferred_pct"]),
        worst_case_dollar_impact=float(worst_case),
        break_even_drop=float(break_even_drop),
        user_state=request.user_state,
        flat_total_return=float(flat_total),
        scenarios=[s.model_dump() for s in scenarios],
    )
    ai_summary = BulletRateRiskAiSummaryInput(**ai_summary_dict)

    response_payload = {
        "locked_amount": float(alloc_summary["locked_amount"]),
        "locked_pct": float(alloc_summary["locked_pct"]),
        "deferred_amount": float(alloc_summary["deferred_amount"]),
        "deferred_pct": float(alloc_summary["deferred_pct"]),
        "scenarios": [s.model_dump() for s in scenarios],
        "break_even_drop": float(break_even_drop),
        "cache_hit": False,
        "ai_summary_input": ai_summary.model_dump(),
    }

    # Cache stores the same payload shape but without cache_hit=true; response overrides cache_hit.
    try:
        rate_risk_cache.set(cache_key, response_payload)
    except Exception:
        # Cache failures should not break the request.
        pass

    return BulletRateRiskResponse(**response_payload)
