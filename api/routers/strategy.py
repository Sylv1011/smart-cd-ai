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
from api.convergence_cache import convergence_cache
from api.database import get_db
from api.models import Offer
from api.schemas import (
    AISummaryInput,
    BulletConvergenceRequest,
    BulletConvergenceResponse,
    DeviationEntry,
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
