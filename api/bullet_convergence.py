from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, List, Optional

from dateutil.relativedelta import relativedelta


# ---------------------------------------------------------------------------
# Scoring functions
# ---------------------------------------------------------------------------

def term_match_score(required_term_months: int, actual_term_months: int) -> float:
    deviation_weeks = abs(required_term_months - actual_term_months) * 4.33
    if deviation_weeks == 0:
        return 100
    if deviation_weeks <= 2:
        return 80
    if deviation_weeks <= 4:
        return 60
    if deviation_weeks <= 8:
        return 40
    return 20


def availability_score(status: Optional[str]) -> float:
    if status is None:
        return 0
    if status == "active":
        return 100
    if status == "limited":
        return 60
    return 20


def deposit_score(allocation: float, min_deposit: float) -> float:
    if min_deposit <= 0:
        return 100
    if allocation >= min_deposit:
        return 100
    if allocation >= min_deposit * 0.8:
        return 50
    return 0


def tranche_composite_score(term_score: float, avail_score: float, dep_score: float) -> float:
    return (term_score * 0.50) + (avail_score * 0.30) + (dep_score * 0.20)


def overall_confidence(tranche_scores: List[float]) -> float:
    if not tranche_scores:
        return 0.0
    return sum(tranche_scores) / len(tranche_scores)


def confidence_label(score: float) -> str:
    if score >= 85:
        return "High"
    if score >= 65:
        return "Medium"
    if score >= 40:
        return "Low"
    return "At Risk"


# ---------------------------------------------------------------------------
# Data container for per-tranche computed results
# ---------------------------------------------------------------------------

@dataclass
class TrancheComputed:
    slot: int
    tranche_score: float
    deviation_days: int
    flags: List[str]
    actual_maturity_date: date


# ---------------------------------------------------------------------------
# Deviation and flags
# ---------------------------------------------------------------------------

def compute_deviation_days(
    today: date,
    buy_in_months: int,
    actual_term_months: int,
    target_maturity_date: date,
) -> int:
    actual_maturity = today + relativedelta(months=buy_in_months + actual_term_months)
    return (actual_maturity - target_maturity_date).days


def compute_flags(
    deviation_days: int,
    status: Optional[str],
    product_found: bool,
    allocation: float,
    min_deposit: float,
    required_term_months: int,
    actual_term_months: int,
) -> List[str]:
    if not product_found:
        return ["product_not_found"]

    flags: List[str] = []

    if deviation_days > 0:
        flags.append(f"maturity_deviation_{deviation_days}_days")

    if status == "limited":
        flags.append("product_availability_limited")

    if min_deposit > 0 and allocation < min_deposit:
        flags.append("deposit_shortfall")

    if actual_term_months != required_term_months:
        flags.append("no_exact_term_match")

    return flags


# ---------------------------------------------------------------------------
# ai_summary_input builder — exactly 8 fields, no extras
# ---------------------------------------------------------------------------

def build_ai_summary_input(
    overall_score: float,
    label: str,
    target_maturity_date: date,
    tranches: List[TrancheComputed],
) -> Dict[str, Any]:
    seen: List[str] = []
    for t in tranches:
        for f in t.flags:
            if f not in seen:
                seen.append(f)

    deviations = [
        {
            "slot": t.slot,
            "deviation_days": t.deviation_days,
            "direction": "late" if t.deviation_days > 0 else "early",
        }
        for t in tranches
        if t.deviation_days != 0
    ]

    return {
        "overall_score": overall_score,
        "confidence_label": label,
        "target_maturity_date": target_maturity_date,
        "tranche_count": len(tranches),
        "flags": seen,
        "deviations": deviations,
        "at_risk_tranches": [t.slot for t in tranches if t.tranche_score < 40],
        "limited_availability_tranches": [
            t.slot for t in tranches if "product_availability_limited" in t.flags
        ],
    }
