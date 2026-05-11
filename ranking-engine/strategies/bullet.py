from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from data import RankingInput, Offer
from engine import rank_offers, RankingEngineError
import logging

LIQUIDITY_ALLOWED = {"low", "medium", "high"}
RATE_OUTLOOK_ALLOWED = {"rising", "stable", "falling"}

logger = logging.getLogger(__name__)


# Available CD terms in the database (in months)
_AVAILABLE_TERMS_MONTHS = [3, 6, 9, 12, 18, 24, 36, 48, 60]

#Temp Assuming that we only receive years between 1-7
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
    
def _snap_to_available_term(months: int, exclude: set[int] = None) -> int | None:
    """
    Snap to the nearest available CD term at or below the target,
    skipping any terms already used by a prior tranche.
    Returns None if no valid term is available.
    """
    exclude = exclude or set()
    candidates = [t for t in _AVAILABLE_TERMS_MONTHS if t <= months and t not in exclude]
    return max(candidates) if candidates else None

def _target_maturity_windows(horizon_years: float) -> list[dict]:
    """
    Given a time horizon in years (1–7), return a list of tranches for a CD
    bullet strategy. Each tranche specifies when to purchase (offset in months
    from today) and what maturity CD to buy (in months).

    Tranche count by horizon:
        < 12 months  → 2 tranches
        12 months+   → 3 tranches
        18 months    → 3–4 tranches
        24 months+   → 4 tranches
    """

    horizon_months = round(horizon_years * 12)

    if horizon_months < 12:
        # 2 tranches: buy a 3-month now, buy another 3-month in 3 months
        # Both mature around the ~6-month mark, converging on a sub-12 target
        purchase_offsets = [0, 3]
        maturities = [
            horizon_months,
            max(3, horizon_months - 3),
        ]

    elif horizon_months == 12:
        # 3 tranches: 12-month now → 9-month in 3 months → 6-month in 6 months
        purchase_offsets = [0, 3, 6]
        maturities = [12, 9, 6]

    elif horizon_months <= 18:
        # 3–4 tranches staggered converging on 18-month target
        num_tranches = 3 if horizon_months < 18 else 4
        purchase_offsets = [i * 3 for i in range(num_tranches)]
        maturities = [
            horizon_months - offset
            for offset in purchase_offsets
        ]

    else:
        # 24+ months → 4 tranches, purchases every 6 months
        purchase_offsets = [0, 6, 12, 18]
        maturities = [
            horizon_months - offset
            for offset in purchase_offsets
        ]

    # Snap all maturities to nearest available DB term
     # Snap down to available terms, excluding already-used terms
    used_terms: set[int] = set()
    snapped_maturities: list[int] = []
    valid_offsets: list[int] = []

    for i, (raw, offset) in enumerate(zip(maturities, purchase_offsets)):
        snapped = _snap_to_available_term(raw, exclude=used_terms)
        if snapped is None:
            # No unique term available for this tranche — drop it
            logger.warning(
                "Tranche %d dropped: no unique available term at or below %dmo "
                "(already used: %s)", i + 1, raw, used_terms
            )
            continue
        used_terms.add(snapped)
        snapped_maturities.append(snapped)
        valid_offsets.append(offset)


    return [
        {
            "tranche": i + 1,
            "purchase_offset_months": purchase_offsets[i],
            "target_maturity_months": snapped_maturities[i],
        }
        for i in range(len(purchase_offsets))
    ]

def _allocate_tranches(
    tranches_with_products: list[dict],
    total_amount: float,
    min_floor_pct: float = 0.15,
) -> list[dict]:
    """
    Yield-weighted allocation across tranches, subject to:
      - minimum floor of min_floor_pct per tranche
      - each tranche meeting its product's minimum deposit
      - total allocated never exceeding total_amount

    Two-pass approach:
      Pass 1 — iteratively pin every tranche whose yield-weighted share of the
               remaining pool falls below its product minimum to exactly that
               minimum, deducting it from the pool.  Repeated until stable,
               because pinning one tranche can push another below its minimum.
      Pass 2 — distribute the remaining pool yield-weighted (with pct floor)
               across all unpinned tranches.

    Raises RankingEngineError up-front if combined minimums exceed total_amount.
    Falls back to equal-weight if all yields are zero or missing.
    """
    n = len(tranches_with_products)
    min_deposits = [
        t["product"].get("minimum_deposit", 0.0) or 0.0
        for t in tranches_with_products
    ]

    # Guard: combined minimums must not exceed total
    total_minimums = sum(min_deposits)
    if total_minimums > total_amount:
        raise RankingEngineError(
            f"Combined product minimums (${total_minimums:,.2f}) exceed the "
            f"total investment amount (${total_amount:,.2f}). "
            "Increase your investment or choose products with lower minimums."
        )

    yields = [
        t["product"].get("after_tax_apy", 0.0) or 0.0
        for t in tranches_with_products
    ]

    def _weighted(indices: list[int], pool: float) -> dict[int, float]:
        """Return {index: dollar_amount} for the given free indices and pool."""
        subset_yields = [yields[i] for i in indices]
        total_y = sum(subset_yields)
        if total_y > 0:
            raw = [y / total_y for y in subset_yields]
        else:
            raw = [1 / len(indices)] * len(indices)
        floored = [max(w, min_floor_pct) for w in raw]
        total_f = sum(floored)
        return {i: pool * (floored[k] / total_f) for k, i in enumerate(indices)}

    # Pass 1 — pin tranches that can't be covered by their weighted share
    allocations = [0.0] * n
    pinned = [False] * n
    remaining_pool = total_amount

    changed = True
    while changed:
        changed = False
        free = [i for i in range(n) if not pinned[i]]
        if not free:
            break
        shares = _weighted(free, remaining_pool)
        for i in free:
            if shares[i] < min_deposits[i]:
                allocations[i] = min_deposits[i]
                remaining_pool -= min_deposits[i]
                pinned[i] = True
                changed = True
                break  # restart with updated pool and free set

    # Pass 2 — distribute remaining pool among unpinned tranches
    free = [i for i in range(n) if not pinned[i]]
    if free:
        shares = _weighted(free, remaining_pool)
        for i in free:
            allocations[i] = shares[i]

    return [
        {
            **tranche,
            "allocation_amount": round(allocations[i], 2),
            "allocation_pct": round((allocations[i] / total_amount) * 100, 2),
        }
        for i, tranche in enumerate(tranches_with_products)
    ]


def _compute_blended_yield(tranches: list[dict], total_amount: float) -> float:
    """
    True allocation-weighted blended after-tax APY across all tranches.
    """
    if total_amount <= 0:
        return 0.0
    return sum(
        (t["allocation_amount"] / total_amount) * t["product"].get("after_tax_apy", 0.0)
        for t in tranches
    )

def _interest_simple(amount: float, apy_percent: float, term_months: int) -> float:
    return amount * (apy_percent / 100.0) * (term_months / 12.0)

def simulate_bullet(*,
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

    # 1. Convert horizon → years
    years = _to_years(time_horizon)
    if years is None:
        raise RankingEngineError("time_horizon must be a number or one of: short, medium, long")

    if years <= 1.0:
        warnings.append("Bullet strategy may not fit very short horizons (<1 year).")

    # 2. Compute maturity windows
    windows = _target_maturity_windows(years)
    logger.info('Tranches  : %s',len(windows))
    
    
    


    # 3. Get the best after-tax AYP per term
    distributed_amount = investment_amount/len(windows)
    tranches_with_products: list[dict] = []
    for tranche in windows:
        target_months = tranche["target_maturity_months"]
        logger.info("Getting offer for tranch=%s",tranche["target_maturity_months"])

        input = RankingInput(
        investment_amount=distributed_amount,
        term_months=target_months,
        state=state,
        income_range=income_range,
        filing_status=filing_status,
        local_area=local_area,
        )

        offers = rank_offers(
            data_client=data_client,
            inp=input,
            top_n_bank_cds=10,
            top_n_brokered_cds=10,
            top_n_treasuries=1,
            top_n_overall=10,
            include_all_ranked=False,
        )

        if not offers.get("overall_top"):
            raise RankingEngineError(
                f"No eligible product found for tranche {tranche['tranche']} "
                f"(target: {target_months}mo). "
                "Consider relaxing eligibility filters or deposit minimums."
            )

        tranches_with_products.append({**tranche, "product": offers.get("overall_top")[0]})

    # 4. Compute allocation split
    allocated_tranches = _allocate_tranches(tranches_with_products, investment_amount)

    # Validate that minimum deposits are satisfied; warn or swap if not
    for tranche in allocated_tranches:
        product = tranche["product"]
        min_deposit = product.get("minimum_deposit", 0.0) or 0.0
        if tranche["allocation_amount"] < min_deposit:
            warnings.append(
                f"Tranche {tranche['tranche']}: allocated "
                f"${tranche['allocation_amount']:,.2f} is below the product minimum "
                f"(${min_deposit:,.2f}). Consider increasing total investment "
                "or removing this tranche."
            )
    
    # 5. Calculate Portfolio Data
    blended_apy = _compute_blended_yield(allocated_tranches, investment_amount)

    logger.info("Blended after-tax APY: %.4f", blended_apy)

    # 6. Return the result
    return {
        "strategy": "bullet",
        "horizon_years": years,
        "total_investment": investment_amount,
        "blended_after_tax_apy": round(blended_apy, 6),
        "tranches": [
            {
                "tranche": t["tranche"],
                "target_maturity_months": t["target_maturity_months"],
                "actual_term_months": t["product"]["term_months"],
                "nominal_APY" : t["product"]["apy_nominal"],
                "after_tax_APY" : t["product"]["after_tax_apy"],
                "nominal_interest_usd": (t["product"]["apy_nominal"]/100) * t["allocation_amount"],
                "allocation_amount": t["allocation_amount"],
                "allocation_pct": t["allocation_pct"],
            }
            for t in allocated_tranches
        ],
        "warnings": warnings,
    }
    

    

