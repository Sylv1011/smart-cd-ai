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


def _equal_weights(n_rungs: int) -> List[float]:
    """Uniform 1/n allocation — the equal-split baseline."""
    if n_rungs <= 0:
        return []
    base = 1.0 / n_rungs
    weights = [base] * n_rungs
    weights[-1] = 1.0 - sum(weights[:-1])  # exact sum of 1.0
    return weights


def _yield_weights(after_tax_apys: List[float]) -> List[float]:
    """
    Yield-optimized allocation: weight each rung in proportion to its
    after-tax APY, so higher-yielding rungs receive more capital. This is the
    "optimized" allocation shown alongside the equal-split baseline.

    Falls back to equal weights when every yield is zero/missing.
    """
    n = len(after_tax_apys)
    if n == 0:
        return []
    if n == 1:
        return [1.0]
    clamped = [max(0.0, float(a or 0.0)) for a in after_tax_apys]
    total = sum(clamped)
    if total <= 0:
        return _equal_weights(n)
    weights = [a / total for a in clamped]
    weights[-1] = 1.0 - sum(weights[:-1])  # exact sum of 1.0
    return weights


def _detect_inverted_curve(rung_terms: List[int], after_tax_apys: List[float]) -> bool:
    """
    An inverted yield curve is when shorter maturities out-yield longer ones.
    Compare the shortest and longest rungs by term; inverted if the shorter
    rung's after-tax APY is meaningfully higher than the longer rung's.
    """
    if len(rung_terms) < 2:
        return False
    pairs = sorted(zip(rung_terms, after_tax_apys), key=lambda p: p[0])
    shortest_apy = pairs[0][1] or 0.0
    longest_apy = pairs[-1][1] or 0.0
    return shortest_apy > longest_apy + 1e-9


def _build_allocation_reason(inverted: bool, n_rungs: int) -> str:
    """Deterministic, rule-based explanation of why the allocation isn't equal."""
    if inverted:
        return (
            "An inverted yield curve means shorter-term CDs are currently offering "
            "higher rates than longer-term ones. The optimizer shifts more allocation "
            "to the shorter rungs to capture the premium short-term rate, while keeping "
            "enough in longer rungs for future reinvestment."
        )
    return (
        "The optimizer weights each rung by its after-tax yield, tilting allocation "
        "toward the higher-yielding maturities while keeping every rung funded for "
        "staggered liquidity."
    )


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


_FILTER_TO_CATEGORY = {
    "bank cds": "bank_cds",
    "bank_cd": "bank_cds",
    "brokerage cds": "brokered_cds",
    "brokered_cd": "brokered_cds",
    "treasuries": "treasuries",
    "treasury": "treasuries",
}


def _resolve_candidates(result: Dict[str, Any], product_type_filter: Optional[str]) -> List[Dict]:
    """Pick the ranked product list for a rung based on the product-type filter."""
    key = (product_type_filter or "").strip().lower()
    if not key or key in ("all", "all products"):
        return result.get("overall_top") or []
    category = _FILTER_TO_CATEGORY.get(key)
    if category:
        return result.get(category) or []
    return result.get("overall_top") or []


def simulate_ladder(
    *,
    data_client: Any,
    investment_amount: float,
    state: str,
    income_range: str,
    filing_status: str,
    local_area: Optional[str],
    liquidity_preference: Optional[str] = None,
    rate_outlook: Optional[str] = None,
    time_horizon: Optional[str] = None,
    product_type_filter: Optional[str] = None,
) -> Dict[str, Any]:
    warnings: List[str] = []

    # 1. Validate inputs. liquidity_preference is accepted for backward
    #    compatibility but no longer drives allocation (the optimizer is
    #    yield-based); reject only clearly invalid values when provided.
    if liquidity_preference is not None:
        liq = str(liquidity_preference).strip().lower()
        if liq and liq not in LIQUIDITY_ALLOWED:
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

    # 4. Fetch the best offer (plus alternatives) per rung via the ranking engine
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
            top_n_bank_cds=3,
            top_n_brokered_cds=3,
            top_n_treasuries=3,
            top_n_overall=3,
            include_all_ranked=False,
        )
        candidates = _resolve_candidates(result, product_type_filter)
        if not candidates:
            warnings.append(f"No eligible product found for {term}-month rung — rung skipped.")
            continue
        found.append({
            "term": term,
            "product": candidates[0],
            "alternatives": candidates[1:3],
        })

    if not found:
        raise RankingEngineError("No eligible CD products found for any ladder rung.")

    rungs_with_products = [
        {"rung": i + 1, "target_term_months": r["term"], "product": r["product"]}
        for i, r in enumerate(found)
    ]

    # 5. Two allocations: yield-optimized (default) and the equal-split baseline.
    apys = [r["product"].get("after_tax_apy", 0.0) or 0.0 for r in rungs_with_products]
    optimized_rungs = _allocate_rungs(
        [dict(r) for r in rungs_with_products], investment_amount, _yield_weights(apys)
    )
    equal_rungs = _allocate_rungs(
        [dict(r) for r in rungs_with_products], investment_amount, _equal_weights(len(rungs_with_products))
    )

    def _totals(alloc_rungs: List[Dict]) -> tuple:
        nominal = 0.0
        after_tax = 0.0
        for r in alloc_rungs:
            amt = r["allocation_amount"]
            term = r["target_term_months"]
            p = r["product"]
            nominal += _interest_compound(amt, p.get("apy_nominal", 0.0) or 0.0, term)
            after_tax += _interest_compound(amt, p.get("after_tax_apy", 0.0) or 0.0, term)
        return round(nominal, 2), round(after_tax, 2)

    opt_nominal, opt_after_tax = _totals(optimized_rungs)
    _, eq_after_tax = _totals(equal_rungs)
    opt_blended = _compute_blended_apy(optimized_rungs, investment_amount)
    eq_blended = _compute_blended_apy(equal_rungs, investment_amount)

    # 6. Enrich each primary product with compound interest under the optimized allocation
    for rung in optimized_rungs:
        product = rung["product"]
        amount = rung["allocation_amount"]
        term = rung["target_term_months"]
        product["investment_amount"] = amount
        product["nominal_interest_usd"] = round(_interest_compound(amount, product.get("apy_nominal", 0.0) or 0.0, term), 2)
        product["after_tax_interest_usd"] = round(_interest_compound(amount, product.get("after_tax_apy", 0.0) or 0.0, term), 2)

    # 7. Allocation insight: inverted-curve detection, optimization gain, reason
    inverted_curve = _detect_inverted_curve(
        [r["target_term_months"] for r in optimized_rungs],
        [r["product"].get("after_tax_apy", 0.0) or 0.0 for r in optimized_rungs],
    )
    gain_usd = round(opt_after_tax - eq_after_tax, 2)
    gain_apy = round(opt_blended - eq_blended, 4)
    allocation_reason = _build_allocation_reason(inverted_curve, len(optimized_rungs))

    provider_names = {
        (r["product"].get("issuing_bank")
         or r["product"].get("institution_name")
         or r["product"].get("brokerage_firm")
         or "")
        for r in optimized_rungs
    }
    provider_names.discard("")
    provider_count = len(provider_names) or len(optimized_rungs)

    # 8. Rate scenario simulation (optimized allocation)
    # Shorter rungs (first half) mature sooner and are re-investable at new rates.
    # Longer rungs lock in today's rate regardless of what the market does.
    short_cutoff = len(optimized_rungs) // 2
    short_rungs = optimized_rungs[:short_cutoff]
    long_rungs = optimized_rungs[short_cutoff:]

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
        "blended_after_tax_apy": round(opt_blended, 6),
        "inverted_curve": inverted_curve,
        "allocation_reason": allocation_reason,
        "provider_count": provider_count,
        "optimization": {
            "gain_usd": gain_usd,
            "gain_apy": gain_apy,
            "optimized": {
                "blended_after_tax_apy": round(opt_blended, 6),
                "after_tax_interest_usd": opt_after_tax,
            },
            "equal_split": {
                "blended_after_tax_apy": round(eq_blended, 6),
                "after_tax_interest_usd": eq_after_tax,
            },
        },
        "rungs": [
            {
                "rung": r["rung"],
                "target_term_months": r["target_term_months"],
                "allocation_amount": r["allocation_amount"],
                "allocation_pct": r["allocation_pct"],
                "equal_allocation_amount": equal_rungs[i]["allocation_amount"],
                "equal_allocation_pct": equal_rungs[i]["allocation_pct"],
                "delta_pct": round(r["allocation_pct"] - equal_rungs[i]["allocation_pct"], 2),
                "product": r["product"],
                "alternatives": found[i]["alternatives"],
            }
            for i, r in enumerate(optimized_rungs)
        ],
        "portfolio": {
            "nominal_interest_usd": opt_nominal,
            "after_tax_interest_usd": opt_after_tax,
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
