from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from data import RankingInput
from engine import rank_offers, RankingEngineError

LIQUIDITY_ALLOWED = {"low", "medium", "high"}
RATE_OUTLOOK_ALLOWED = {"rising", "stable", "falling"}

MIN_RUNG_AMOUNT = 500.0
TILT_AMPLITUDE = 0.10

logger = logging.getLogger(__name__)

# Standard rung terms (months) keyed by time horizon in years.
# Shorter terms are listed first (index 0 = soonest maturity).
_RUNG_TERMS: Dict[int, List[int]] = {
    1: [3, 6, 12],
    2: [6, 12, 24],
    3: [12, 24, 36],
    4: [12, 24, 36, 48],
    5: [12, 24, 36, 48, 60],
}


def _to_years(time_horizon: Optional[str]) -> Optional[float]:
    if time_horizon is None:
        return None
    value = str(time_horizon).strip().lower()
    if not value:
        return None
    if value == "short":
        return 1.0
    if value == "medium":
        return 3.0
    if value == "long":
        return 5.0
    try:
        return float(value)
    except ValueError:
        return None


def _select_terms(investment_amount: float, horizon_years: int) -> List[int]:
    """
    Return rung terms for the horizon. If the per-rung share falls below
    MIN_RUNG_AMOUNT, drop the shortest rung until it fits (min 2 rungs).
    """
    clamped = max(1, min(5, horizon_years))
    terms = list(_RUNG_TERMS[clamped])
    while len(terms) > 2 and investment_amount / len(terms) < MIN_RUNG_AMOUNT:
        terms = terms[1:]  # drop shortest rung
    return terms


def _calculate_weights(n_rungs: int, liquidity: str, rate_outlook: Optional[str]) -> List[float]:
    """
    Produce n_rungs allocation weights that sum to 1.0, using a linear tilt.

    - high liquidity / rising rates  → more weight on shorter rungs
    - low liquidity  / falling rates → more weight on longer rungs
    - rate_outlook is half-weighted relative to liquidity preference
    """
    base = 1.0 / n_rungs
    weights = [base] * n_rungs

    if n_rungs < 2:
        return weights

    liq_sign = {"high": 1.0, "medium": 0.0, "low": -1.0}.get(liquidity, 0.0)
    outlook_sign = {"rising": 1.0, "stable": 0.0, "falling": -1.0}.get(
        (rate_outlook or "stable").strip().lower(), 0.0
    )
    combined = liq_sign + outlook_sign * 0.5

    if combined != 0.0:
        for i in range(n_rungs):
            fraction = i / (n_rungs - 1)  # 0.0 = shortest rung, 1.0 = longest
            weights[i] += combined * TILT_AMPLITUDE * (1.0 - 2.0 * fraction)

    weights = [max(0.01, w) for w in weights]
    total = sum(weights)
    normalized = [w / total for w in weights]
    normalized[-1] = 1.0 - sum(normalized[:-1])  # ensure exact sum of 1.0
    return normalized


def _interest_compound(amount: float, apy_percent: float, term_months: float) -> float:
    """
    P × ((1 + APY)^t − 1) where t is term in years.
    APY already accounts for within-year compounding, so this correctly
    projects multi-year growth without double-counting.
    """
    t = term_months / 12.0
    return amount * ((1.0 + apy_percent / 100.0) ** t - 1.0)


def _allocate_rungs(
    rungs_with_products: List[Dict],
    total_amount: float,
    weights: List[float],
) -> List[Dict]:
    """
    Two-pass allocation across rungs, respecting product minimum deposits.

    Pass 1 — iteratively pin any rung whose weighted share falls below its
              product minimum to exactly that minimum and deduct from the pool.
              Repeated until stable (pinning one rung can push another below).
    Pass 2 — distribute remaining pool using normalized weights across free rungs.

    Raises RankingEngineError if combined minimums exceed total_amount.
    """
    n = len(rungs_with_products)
    min_deposits = [r["product"].get("minimum_deposit", 0.0) or 0.0 for r in rungs_with_products]

    if sum(min_deposits) > total_amount:
        raise RankingEngineError(
            f"Combined product minimums (${sum(min_deposits):,.2f}) exceed the "
            f"total investment amount (${total_amount:,.2f}). "
            "Increase your investment or choose products with lower minimums."
        )

    allocations = [0.0] * n
    pinned = [False] * n
    remaining_pool = total_amount

    def _shares(free_indices: List[int], pool: float) -> Dict[int, float]:
        free_weights = [weights[i] for i in free_indices]
        total_w = sum(free_weights)
        return {i: pool * (weights[i] / total_w) for i in free_indices}

    changed = True
    while changed:
        changed = False
        free = [i for i in range(n) if not pinned[i]]
        if not free:
            break
        shares = _shares(free, remaining_pool)
        for i in free:
            if shares[i] < min_deposits[i]:
                allocations[i] = min_deposits[i]
                remaining_pool -= min_deposits[i]
                pinned[i] = True
                changed = True
                break  # restart with updated pool and free set

    free = [i for i in range(n) if not pinned[i]]
    if free:
        shares = _shares(free, remaining_pool)
        for i in free:
            allocations[i] = shares[i]

    return [
        {
            **rung,
            "allocation_amount": round(allocations[i], 2),
            "allocation_pct": round((allocations[i] / total_amount) * 100, 2),
        }
        for i, rung in enumerate(rungs_with_products)
    ]


def _compute_blended_apy(rungs: List[Dict], total_amount: float) -> float:
    """Dollar-weighted blended after-tax APY across all rungs."""
    if total_amount <= 0:
        return 0.0
    return sum(
        (r["allocation_amount"] / total_amount) * (r["product"].get("after_tax_apy", 0.0) or 0.0)
        for r in rungs
    )


def simulate_ladder(
    *,
    data_client: Any,
    investment_amount: float,
    state: str,
    income_range: str,
    filing_status: str,
    local_area: Optional[str],
    liquidity_preference: str,
    rate_outlook: Optional[str] = None,
    time_horizon: Optional[str] = None,
) -> Dict[str, Any]:
    warnings: List[str] = []

    # 1. Validate inputs
    liq = (liquidity_preference or "").strip().lower()
    if liq not in LIQUIDITY_ALLOWED:
        raise RankingEngineError("liquidity_preference must be one of: low, medium, high")
    outlook = (rate_outlook or "stable").strip().lower()
    if outlook not in RATE_OUTLOOK_ALLOWED:
        raise RankingEngineError("rate_outlook must be one of: rising, stable, falling")

    # 2. Convert time horizon
    years = _to_years(time_horizon)
    if years is None:
        raise RankingEngineError("time_horizon must be a number or one of: short, medium, long")
    if years < 1.0:
        warnings.append("Short time horizon: a ladder under 1 year provides limited diversification.")

    # 3. Select rung terms based on horizon and investment size
    horizon_int = max(1, min(5, round(years)))
    terms = _select_terms(investment_amount, horizon_int)
    logger.info("Ladder rungs: %s", terms)

    # 4. Fetch the best offer per rung via the ranking engine
    found: List[Dict] = []
    for term in terms:
        inp = RankingInput(
            investment_amount=investment_amount / len(terms),
            term_months=term,
            state=state,
            income_range=income_range,
            filing_status=filing_status,
            local_area=local_area,
        )
        result = rank_offers(
            data_client=data_client,
            inp=inp,
            top_n_bank_cds=2,
            top_n_brokered_cds=2,
            top_n_treasuries=1,
            top_n_overall=2,
            include_all_ranked=False,
        )
        top = result.get("overall_top") or []
        if not top:
            warnings.append(f"No eligible product found for {term}-month rung — rung skipped.")
            continue
        found.append({"term": term, "product": top[0]})

    if not found:
        raise RankingEngineError("No eligible CD products found for any ladder rung.")

    # 5. Recalculate weights for the rungs that were actually found, then allocate
    weights = _calculate_weights(len(found), liq, outlook)
    rungs_with_products = [
        {"rung": i + 1, "target_term_months": r["term"], "product": r["product"]}
        for i, r in enumerate(found)
    ]
    allocated_rungs = _allocate_rungs(rungs_with_products, investment_amount, weights)

    # 6. Enrich each rung with compound interest figures
    for rung in allocated_rungs:
        product = rung["product"]
        amount = rung["allocation_amount"]
        term = rung["target_term_months"]
        nominal_apy = product.get("apy_nominal", 0.0) or 0.0
        after_tax_apy = product.get("after_tax_apy", 0.0) or 0.0

        product["investment_amount"] = amount
        product["nominal_interest_usd"] = round(_interest_compound(amount, nominal_apy, term), 2)
        product["after_tax_interest_usd"] = round(_interest_compound(amount, after_tax_apy, term), 2)

    # 7. Portfolio-level metrics
    blended_apy = _compute_blended_apy(allocated_rungs, investment_amount)
    total_nominal = sum(r["product"]["nominal_interest_usd"] for r in allocated_rungs)
    total_after_tax = sum(r["product"]["after_tax_interest_usd"] for r in allocated_rungs)

    # 8. Rate scenario simulation
    # Shorter rungs (first half) mature sooner and are re-investable at new rates.
    # Longer rungs lock in today's rate regardless of what the market does.
    short_cutoff = len(allocated_rungs) // 2
    short_rungs = allocated_rungs[:short_cutoff]
    long_rungs = allocated_rungs[short_cutoff:]

    def _scenario_interest(rate_delta: float) -> float:
        total = 0.0
        for r in short_rungs:
            shifted = max(0.0, (r["product"].get("after_tax_apy", 0.0) or 0.0) + rate_delta)
            total += _interest_compound(r["allocation_amount"], shifted, r["target_term_months"])
        for r in long_rungs:
            total += r["product"]["after_tax_interest_usd"]
        return round(total, 2)

    return {
        "strategy": "ladder",
        "horizon_years": years,
        "total_investment": investment_amount,
        "blended_after_tax_apy": round(blended_apy, 6),
        "rungs": [
            {
                "rung": r["rung"],
                "target_term_months": r["target_term_months"],
                "allocation_amount": r["allocation_amount"],
                "allocation_pct": r["allocation_pct"],
                "product": r["product"],
            }
            for r in allocated_rungs
        ],
        "portfolio": {
            "nominal_interest_usd": round(total_nominal, 2),
            "after_tax_interest_usd": round(total_after_tax, 2),
        },
        "simulation": {
            "scenarios": [
                {
                    "name": "rates_rise",
                    "description": (
                        "Illustrative: applies a +0.50% after-tax APY shift to shorter rungs "
                        "to show directional sensitivity if rates rise at renewal. "
                        "Longer rungs are unaffected — their rate is already locked."
                    ),
                    "estimated_after_tax_interest_usd": _scenario_interest(+0.5),
                },
                {
                    "name": "rates_fall",
                    "description": (
                        "Illustrative: applies a −0.50% after-tax APY shift to shorter rungs "
                        "to show directional sensitivity if rates fall at renewal. "
                        "Longer rungs preserve today's locked rate, cushioning the portfolio."
                    ),
                    "estimated_after_tax_interest_usd": _scenario_interest(-0.5),
                },
            ]
        },
        "warnings": warnings,
    }
