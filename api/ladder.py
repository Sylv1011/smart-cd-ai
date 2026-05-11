from __future__ import annotations
from datetime import date, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from api.models import Offer
from api.schemas import LadderRung

# Standard ladder rung terms per time horizon (months)
RUNG_TERMS: dict[int, list[int]] = {
    1: [3, 6, 12],
    2: [6, 12, 24],
    3: [12, 24, 36],
    4: [12, 24, 36, 48],
    5: [12, 24, 36, 48, 60],
}

# If investment_amount / n_rungs falls below this, reduce rung count
MIN_RUNG_AMOUNT = 500.0

# Maximum tilt applied at the shortest/longest rung for high/low liquidity
TILT_AMPLITUDE = 0.10


def calculate_weights(n_rungs: int, liquidity: str) -> List[float]:
    """
    Returns n_rungs allocation weights that sum to 1.0.

    medium  → equal weights (1/n each)
    high    → linear gradient, more weight on shorter terms
    low     → linear gradient, more weight on longer terms

    For 5 rungs, high liquidity:
      [0.30, 0.25, 0.20, 0.15, 0.10]
    """
    base = 1.0 / n_rungs
    weights = [base] * n_rungs

    if liquidity == "medium" or n_rungs < 2:
        rounded = [round(w, 6) for w in weights]
        # Fix last element to ensure exact sum of 1.0
        rounded[-1] = round(1.0 - sum(rounded[:-1]), 6)
        return rounded

    sign = 1.0 if liquidity == "high" else -1.0

    for i in range(n_rungs):
        # fraction goes 0.0 (shortest) → 1.0 (longest)
        fraction = i / (n_rungs - 1)
        # tilt: +AMPLITUDE at shortest, -AMPLITUDE at longest (for high)
        tilt = sign * TILT_AMPLITUDE * (1.0 - 2.0 * fraction)
        weights[i] += tilt

    # Clamp each weight to a minimum of 0.01 before normalizing
    weights = [max(0.01, w) for w in weights]

    total = sum(weights)
    rounded = [round(w / total, 6) for w in weights]
    # Fix last element to ensure exact sum of 1.0
    rounded[-1] = round(1.0 - sum(rounded[:-1]), 6)
    return rounded


TERM_FALLBACK_WINDOW = 6  # months — how far to search if exact term unavailable


def fetch_best_offer_for_term(db: Session, term_months: int) -> Optional[Offer]:
    """
    Return the highest-APY offer at exactly term_months.
    If none found, return the highest-APY offer within ±TERM_FALLBACK_WINDOW months.
    Returns None if no offer exists within the fallback window.
    """
    offer = (
        db.query(Offer)
        .filter(Offer.term_months == term_months)
        .order_by(desc(Offer.apy))
        .first()
    )
    if offer:
        return offer

    offer = (
        db.query(Offer)
        .filter(Offer.term_months >= term_months - TERM_FALLBACK_WINDOW)
        .filter(Offer.term_months <= term_months + TERM_FALLBACK_WINDOW)
        .order_by(func.abs(Offer.term_months - term_months), desc(Offer.apy))
        .first()
    )
    return offer


def compute_blended_apy(rungs: List[LadderRung]) -> Tuple[float, float]:
    """
    Weighted average APY across all rungs, weighted by dollar amount.
    Returns (blended_nominal_apy, blended_after_tax_apy).
    """
    total = sum(r.amount for r in rungs)
    if total == 0:
        return 0.0, 0.0
    nominal = sum(r.amount * r.nominal_apy for r in rungs) / total
    after_tax = sum(r.amount * r.after_tax_apy for r in rungs) / total
    return round(nominal, 2), round(after_tax, 2)
