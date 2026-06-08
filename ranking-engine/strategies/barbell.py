from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from data import RankingInput
from engine import RankingEngineError, rank_offers


AVAILABLE_TERMS_MONTHS = [3, 6, 9, 12, 18, 24, 36, 48, 60]
DEFAULT_SPLIT_SHORT_PCTS = [20, 30, 40, 50]


def _to_months(time_horizon: Optional[str], target_maturity_months: Optional[int]) -> Optional[int]:
    if target_maturity_months is not None:
        return int(target_maturity_months)
    if time_horizon is None:
        return None
    value = str(time_horizon).strip().lower()
    if not value:
        return None
    if value == "short":
        return 12
    if value == "medium":
        return 36
    if value == "long":
        return 60
    try:
        years = float(value)
        return int(round(years * 12))
    except ValueError:
        return None


def _institution_key(offer: Dict[str, Any]) -> str:
    return str(
        offer.get("institution_name")
        or offer.get("issuing_bank")
        or offer.get("brokerage_firm")
        or ""
    ).strip().lower()


def _offer_sort_key(offer: Dict[str, Any]) -> Tuple[float, int, int, int]:
    after_tax_apy = float(offer.get("after_tax_apy", 0.0))
    fdic = 1 if bool(offer.get("fdic_insured", False)) else 0
    product_type = str(offer.get("product_type", "")).strip().lower()
    stable_institution = 1 if product_type in {"bank_cd", "brokered_cd"} else 0
    term_months = int(offer.get("term_months", 0) or 0)
    return (after_tax_apy, fdic, stable_institution, term_months)


def _collect_leg_candidates(
    *,
    data_client: Any,
    amount: float,
    state: str,
    income_range: str,
    filing_status: str,
    local_area: Optional[str],
    eligible_terms: List[int],
) -> List[Dict[str, Any]]:
    offers: List[Dict[str, Any]] = []
    for term in eligible_terms:
        inp = RankingInput(
            investment_amount=amount,
            term_months=term,
            state=state,
            income_range=income_range,
            filing_status=filing_status,
            local_area=local_area,
        )
        ranked = rank_offers(
            inp,
            data_client=data_client,
            top_n_bank_cds=10,
            top_n_brokered_cds=10,
            top_n_treasuries=1,
            top_n_overall=10,
            include_all_ranked=False,
        )
        leg_offers = (ranked.get("bank_cds") or []) + (ranked.get("brokered_cds") or [])
        offers.extend(leg_offers)

    deduped: List[Dict[str, Any]] = []
    seen = set()
    for offer in offers:
        key = (
            offer.get("product_type"),
            _institution_key(offer),
            offer.get("term_months"),
            offer.get("apy_nominal"),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(offer)
    deduped.sort(key=_offer_sort_key, reverse=True)
    return deduped


def _best_and_alternative(candidates: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    if not candidates:
        return None, None
    best = candidates[0]
    best_inst = _institution_key(best)
    alternative = None
    for offer in candidates[1:]:
        if _institution_key(offer) and _institution_key(offer) != best_inst:
            alternative = offer
            break
    return best, alternative


def _interest_simple(amount: float, apy_percent: float, term_months: int) -> float:
    return amount * (apy_percent / 100.0) * (term_months / 12.0)


def _build_allocation_result(
    *,
    investment_amount: float,
    short_pct: int,
    short_best: Dict[str, Any],
    short_alt: Optional[Dict[str, Any]],
    long_best: Dict[str, Any],
    long_alt: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    short_amount = round(float(investment_amount) * (short_pct / 100.0), 2)
    long_amount = round(float(investment_amount) - short_amount, 2)

    short_apy = float(short_best.get("apy_nominal", 0.0))
    long_apy = float(long_best.get("apy_nominal", 0.0))
    short_after_tax_apy = float(short_best.get("after_tax_apy", 0.0))
    long_after_tax_apy = float(long_best.get("after_tax_apy", 0.0))

    total_amount = float(investment_amount)
    blended_apy = ((short_amount * short_apy) + (long_amount * long_apy)) / total_amount
    after_tax_blended_apy = ((short_amount * short_after_tax_apy) + (long_amount * long_after_tax_apy)) / total_amount

    short_term = int(short_best.get("term_months", 0) or 0)
    long_term = int(long_best.get("term_months", 0) or 0)

    short_nominal_interest = _interest_simple(short_amount, short_apy, short_term)
    long_nominal_interest = _interest_simple(long_amount, long_apy, long_term)
    short_after_tax_interest = _interest_simple(short_amount, short_after_tax_apy, short_term)
    long_after_tax_interest = _interest_simple(long_amount, long_after_tax_apy, long_term)

    return {
        "short_term_percentage": int(short_pct),
        "long_term_percentage": int(100 - short_pct),
        "short_term_amount": short_amount,
        "long_term_amount": long_amount,
        "selected_products": {
            "short_term": {"best": short_best, "alternative": short_alt},
            "long_term": {"best": long_best, "alternative": long_alt},
        },
        "portfolio": {
            "blended_apy": round(blended_apy, 4),
            "after_tax_blended_apy": round(after_tax_blended_apy, 4),
            "estimated_total_return_usd": round(short_nominal_interest + long_nominal_interest, 2),
            "estimated_after_tax_total_return_usd": round(short_after_tax_interest + long_after_tax_interest, 2),
        },
    }


def simulate_barbell(
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
    target_maturity_months: Optional[int] = None,
    short_term_percentage: Optional[int] = None,
    short_term_months: Optional[int] = None,
    long_term_months: Optional[int] = None,
) -> Dict[str, Any]:
    _ = (liquidity_preference, rate_outlook)  # kept for backward-compatible request shape
    warnings: List[str] = []

    target_months = _to_months(time_horizon, target_maturity_months)
    if target_months is None or target_months <= 0:
        raise RankingEngineError("target_maturity_months (or time_horizon) is required for barbell")

    if target_months < 12:
        return {
            "strategy": "barbell",
            "barbell_eligible": False,
            "target_maturity_months": target_months,
            "message": "Barbell strategy is not recommended for horizons under 12 months.",
            "warnings": ["Target maturity under 12 months makes barbell ineligible."],
        }

    short_terms = [m for m in AVAILABLE_TERMS_MONTHS if m < 12]
    long_terms = [m for m in AVAILABLE_TERMS_MONTHS if m >= 12 and m <= target_months]

    if short_term_months is not None:
        selected_short = int(short_term_months)
        if selected_short not in short_terms:
            raise RankingEngineError("short_term_months must be one of: 3, 6, 9")
        short_terms = [selected_short]

    if long_term_months is not None:
        selected_long = int(long_term_months)
        if selected_long not in AVAILABLE_TERMS_MONTHS or selected_long < 12:
            raise RankingEngineError("long_term_months must be one of: 12, 18, 24, 36, 48, 60")
        if selected_long > target_months:
            raise RankingEngineError("long_term_months cannot exceed target_maturity_months")
        long_terms = [selected_long]

    if not short_terms:
        warnings.append("No short-term products found under 12 months.")
    if not long_terms:
        warnings.append("No long-term products found from 12 months up to selected maturity.")
    if not short_terms or not long_terms:
        return {
            "strategy": "barbell",
            "barbell_eligible": True,
            "target_maturity_months": target_months,
            "has_fallback": True,
            "message": "Insufficient eligible products for one or both barbell legs.",
            "short_leg_terms": short_terms,
            "long_leg_terms": long_terms,
            "warnings": warnings,
        }

    split_candidates = [int(short_term_percentage)] if short_term_percentage is not None else DEFAULT_SPLIT_SHORT_PCTS
    for pct in split_candidates:
        if pct % 10 != 0 or pct < 20 or pct > 50:
            raise RankingEngineError("short_term_percentage must be one of: 20, 30, 40, 50")

    split_results: List[Dict[str, Any]] = []
    for short_pct in split_candidates:
        short_amount = round(float(investment_amount) * (short_pct / 100.0), 2)
        long_amount = round(float(investment_amount) - short_amount, 2)

        short_candidates = _collect_leg_candidates(
            data_client=data_client,
            amount=short_amount,
            state=state,
            income_range=income_range,
            filing_status=filing_status,
            local_area=local_area,
            eligible_terms=short_terms,
        )
        long_candidates = _collect_leg_candidates(
            data_client=data_client,
            amount=long_amount,
            state=state,
            income_range=income_range,
            filing_status=filing_status,
            local_area=local_area,
            eligible_terms=long_terms,
        )

        short_best, short_alt = _best_and_alternative(short_candidates)
        long_best, long_alt = _best_and_alternative(long_candidates)

        if short_best is None or long_best is None:
            split_results.append(
                {
                    "short_term_percentage": short_pct,
                    "eligible": False,
                    "message": "No eligible products found for one or both legs at this split.",
                }
            )
            continue

        built = _build_allocation_result(
            investment_amount=investment_amount,
            short_pct=short_pct,
            short_best=short_best,
            short_alt=short_alt,
            long_best=long_best,
            long_alt=long_alt,
        )
        built["eligible"] = True
        split_results.append(built)

    eligible_splits = [x for x in split_results if x.get("eligible")]
    if not eligible_splits:
        return {
            "strategy": "barbell",
            "barbell_eligible": True,
            "target_maturity_months": target_months,
            "has_fallback": True,
            "message": "No eligible product combination found across allowed split ratios.",
            "split_candidates": split_results,
            "warnings": warnings,
        }

    best_split = max(eligible_splits, key=lambda x: float(x["portfolio"]["after_tax_blended_apy"]))
    selected_split = best_split if short_term_percentage is None else eligible_splits[0]

    return {
        "strategy": "barbell",
        "barbell_eligible": True,
        "target_maturity_months": target_months,
        "short_leg_terms": short_terms,
        "long_leg_terms": long_terms,
        "default_split": {
            "short_term_percentage": int(best_split["short_term_percentage"]),
            "long_term_percentage": int(best_split["long_term_percentage"]),
            "after_tax_blended_apy": best_split["portfolio"]["after_tax_blended_apy"],
        },
        "selected_split": selected_split,
        "split_candidates": split_results,
        "warnings": warnings,
    }
