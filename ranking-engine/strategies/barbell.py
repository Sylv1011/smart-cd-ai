from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from data import RankingInput
from engine import rank_offers, RankingEngineError


LIQUIDITY_ALLOWED = {"low", "medium", "high"}
RATE_OUTLOOK_ALLOWED = {"rising", "stable", "falling"}


def _normalize_split(
    liquidity_preference: str,
    rate_outlook: Optional[str],
) -> Tuple[float, float]:
    liq = (liquidity_preference or "").strip().lower()
    outlook = (rate_outlook or "stable").strip().lower()

    if liq not in LIQUIDITY_ALLOWED:
        raise RankingEngineError("liquidity_preference must be one of: low, medium, high")
    if outlook not in RATE_OUTLOOK_ALLOWED:
        raise RankingEngineError("rate_outlook must be one of: rising, stable, falling")

    short_pct = 0.5
    long_pct = 0.5

    if liq == "high":
        short_pct += 0.2
        long_pct -= 0.2
    elif liq == "low":
        short_pct -= 0.2
        long_pct += 0.2

    if outlook == "rising":
        short_pct += 0.1
        long_pct -= 0.1
    elif outlook == "falling":
        short_pct -= 0.1
        long_pct += 0.1

    short_pct = max(0.3, min(0.7, short_pct))
    long_pct = 1.0 - short_pct
    return short_pct, long_pct


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


def _offer_preference_score(offer: Dict[str, Any], *, is_long_term: bool) -> Tuple[int, int, float]:
    # Prefer no-penalty and monthly/quarterly compounding when the fields are available.
    # If source data does not contain those fields, scoring gracefully falls back.
    no_penalty = bool(offer.get("no_penalty", False))
    comp = str(offer.get("compounding_frequency", "")).strip().lower()
    comp_pref = 1 if comp in {"monthly", "quarterly"} else 0

    # Long bucket prefers stable + insured products (PDF guidance).
    fdic = bool(offer.get("fdic_insured", False))
    product_type = str(offer.get("product_type", "")).strip().lower()
    bank_like = 1 if product_type in {"bank_cd", "brokered_cd"} else 0
    long_stability = 1 if (fdic and bank_like) else 0
    if not is_long_term:
        long_stability = 0

    apy = float(offer.get("after_tax_apy", 0.0))
    return no_penalty, (comp_pref + long_stability), apy


def _pick_offer(rank_result: Dict[str, Any], *, is_long_term: bool) -> Optional[Dict[str, Any]]:
    candidates: List[Dict[str, Any]] = []
    candidates.extend(rank_result.get("bank_cds") or [])
    candidates.extend(rank_result.get("brokered_cds") or [])
    candidates.extend(rank_result.get("overall_top") or [])
    if not candidates:
        return None

    deduped: List[Dict[str, Any]] = []
    seen = set()
    for c in candidates:
        key = (
            c.get("product_type"),
            c.get("institution_name"),
            c.get("issuing_bank"),
            c.get("brokerage_firm"),
            c.get("term_months"),
            c.get("apy_nominal"),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(c)

    deduped.sort(key=lambda x: _offer_preference_score(x, is_long_term=is_long_term), reverse=True)
    return deduped[0]


def _interest_simple(amount: float, apy_percent: float, term_months: int) -> float:
    return amount * (apy_percent / 100.0) * (term_months / 12.0)


def simulate_barbell(
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

    years = _to_years(time_horizon)
    if years is not None and years < 1.0:
        warnings.append("Barbell strategy may not fit very short horizons (<1 year).")

    short_pct, long_pct = _normalize_split(liquidity_preference, rate_outlook)

    short_amount = round(float(investment_amount) * short_pct, 2)
    long_amount = round(float(investment_amount) - short_amount, 2)

    short_input = RankingInput(
        investment_amount=short_amount,
        term_months=6,
        state=state,
        income_range=income_range,
        filing_status=filing_status,
        local_area=local_area,
    )
    long_input = RankingInput(
        investment_amount=long_amount,
        term_months=60,
        state=state,
        income_range=income_range,
        filing_status=filing_status,
        local_area=local_area,
    )

    short_rank = rank_offers(
        short_input,
        data_client=data_client,
        top_n_bank_cds=10,
        top_n_brokered_cds=10,
        top_n_treasuries=1,
        top_n_overall=10,
        include_all_ranked=False,
    )
    long_rank = rank_offers(
        long_input,
        data_client=data_client,
        top_n_bank_cds=10,
        top_n_brokered_cds=10,
        top_n_treasuries=1,
        top_n_overall=10,
        include_all_ranked=False,
    )

    short_offer = _pick_offer(short_rank, is_long_term=False)
    long_offer = _pick_offer(long_rank, is_long_term=True)
    if short_offer is None:
        raise RankingEngineError("No eligible short-term offers found for barbell strategy")
    if long_offer is None:
        warnings.append("No long-term CD data available; falling back to ladder suggestion.")
        return {
            "strategy": "barbell",
            "fallback_strategy": "ladder",
            "message": "Long-term offers are unavailable. Consider ladder strategy for graceful degradation.",
            "allocation": {
                "short_term_percentage": int(round(short_pct * 100)),
                "long_term_percentage": int(round(long_pct * 100)),
                "short_term_amount": round(short_amount, 2),
                "long_term_amount": round(long_amount, 2),
            },
            "selected_products": {
                "short_term": short_offer,
                "long_term": None,
            },
            "warnings": warnings,
        }

    short_apy = float(short_offer.get("apy_nominal", 0.0))
    long_apy = float(long_offer.get("apy_nominal", 0.0))
    short_after_tax_apy = float(short_offer.get("after_tax_apy", 0.0))
    long_after_tax_apy = float(long_offer.get("after_tax_apy", 0.0))

    total_amount = float(investment_amount)
    blended_apy = ((short_amount * short_apy) + (long_amount * long_apy)) / total_amount
    after_tax_blended_apy = ((short_amount * short_after_tax_apy) + (long_amount * long_after_tax_apy)) / total_amount

    short_nominal_interest = _interest_simple(short_amount, short_apy, 6)
    long_nominal_interest = _interest_simple(long_amount, long_apy, 60)
    short_after_tax_interest = _interest_simple(short_amount, short_after_tax_apy, 6)
    long_after_tax_interest = _interest_simple(long_amount, long_after_tax_apy, 60)

    nominal_interest_total = short_nominal_interest + long_nominal_interest
    after_tax_interest_total = short_after_tax_interest + long_after_tax_interest

    rise_short_apy = short_after_tax_apy + 0.5
    rise_interest = _interest_simple(short_amount, rise_short_apy, 6) + long_after_tax_interest

    fall_short_apy = max(0.0, short_after_tax_apy - 0.5)
    fall_interest = _interest_simple(short_amount, fall_short_apy, 6) + long_after_tax_interest

    return {
        "strategy": "barbell",
        "allocation": {
            "short_term_percentage": int(round(short_pct * 100)),
            "long_term_percentage": int(round(long_pct * 100)),
            "short_term_amount": round(short_amount, 2),
            "long_term_amount": round(long_amount, 2),
        },
        "selected_products": {
            "short_term": short_offer,
            "long_term": long_offer,
        },
        "portfolio": {
            "blended_apy": round(blended_apy, 4),
            "after_tax_blended_apy": round(after_tax_blended_apy, 4),
            "nominal_interest_usd": round(nominal_interest_total, 2),
            "after_tax_interest_usd": round(after_tax_interest_total, 2),
        },
        "simulation": {
            "scenarios": [
                {
                    "name": "rates_rise",
                    "description": "Assumes short-term CD rollover can capture +0.50% after-tax APY on the next cycle.",
                    "estimated_after_tax_interest_usd": round(rise_interest, 2),
                },
                {
                    "name": "rates_fall",
                    "description": "Assumes short-term CD rollover loses 0.50% after-tax APY while long-term lock remains unchanged.",
                    "estimated_after_tax_interest_usd": round(fall_interest, 2),
                },
            ]
        },
        "warnings": warnings,
    }
