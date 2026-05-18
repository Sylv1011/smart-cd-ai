from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


SCENARIOS = [
    {"label": "Rates stay flat", "delta": 0.0},
    {"label": "Rates drop 0.5%", "delta": -0.5},
    {"label": "Rates drop 1.0%", "delta": -1.0},
    {"label": "Rates rise 0.5%", "delta": 0.5},
]


@dataclass(frozen=True)
class TrancheRateRisk:
    allocation: float  # dollars
    after_tax_apy: float  # percent
    term_months: int
    buy_in_months: int

    @property
    def is_locked(self) -> bool:
        return self.buy_in_months == 0


def compute_tranche_return(
    allocation: float,
    after_tax_apy: float,
    delta: float,
    term_months: int,
    is_locked: bool,
) -> float:
    effective_apy = float(after_tax_apy)
    if not is_locked:
        effective_apy = effective_apy + float(delta)
    if effective_apy < 0:
        effective_apy = 0.0

    years = float(term_months) / 12.0
    value = float(allocation) * (effective_apy / 100.0) * years
    return round(value, 2)


def compute_portfolio_totals(
    tranches: List[TrancheRateRisk],
) -> List[Dict]:
    flat_total = None
    out: List[Dict] = []

    for s in SCENARIOS:
        scenario_total = 0.0
        tranche_returns: List[float] = []
        for t in tranches:
            r = compute_tranche_return(
                allocation=t.allocation,
                after_tax_apy=t.after_tax_apy,
                delta=s["delta"],
                term_months=t.term_months,
                is_locked=t.is_locked,
            )
            tranche_returns.append(r)
            scenario_total += r

        scenario_total = round(scenario_total, 2)
        if s["delta"] == 0.0:
            flat_total = scenario_total

        out.append(
            {
                "label": s["label"],
                "delta": s["delta"],
                "total_return": scenario_total,
                "tranche_returns": tranche_returns,
            }
        )

    # baseline impact vs flat
    if flat_total is None:
        flat_total = 0.0

    for row in out:
        row["dollar_impact"] = round(float(row["total_return"]) - float(flat_total), 2)

    return out


def compute_best_single_cd_return(
    investment_amount: float,
    tranches: List[TrancheRateRisk],
    deferred_term_avg_months: float,
) -> float:
    # Deterministic proxy: compare only the deferred portion against a single-CD alternative.
    # This keeps locked tranches out of the baseline so compute_break_even can hold them constant.
    deferred_tranches = [t for t in tranches if not t.is_locked]
    if not deferred_tranches or deferred_term_avg_months <= 0:
        return 0.0

    deferred_allocation = sum(float(t.allocation) for t in deferred_tranches)
    principal = min(float(investment_amount), deferred_allocation)
    if principal <= 0:
        return 0.0

    best_apy = max((float(t.after_tax_apy) for t in deferred_tranches), default=0.0)
    years = float(deferred_term_avg_months) / 12.0
    return round(principal * (best_apy / 100.0) * years, 2)


def compute_break_even(
    flat_total: float,
    best_single_cd_return: float,
    deferred_allocation: float,
    deferred_term_avg_months: float,
) -> float:
    # break_even_drop = percentage points (e.g., 0.5) that deferred APYs could drop
    # before Bullet underperforms best single CD (holding locked portion constant).
    # If Bullet is already <= best single, break_even_drop is 0.
    if deferred_allocation <= 0 or deferred_term_avg_months <= 0:
        return 0.0

    advantage = float(flat_total) - float(best_single_cd_return)
    if advantage <= 0:
        return 0.0

    years = float(deferred_term_avg_months) / 12.0
    denom = float(deferred_allocation) * years
    if denom <= 0:
        return 0.0

    drop_percent = (advantage / denom) * 100.0  # convert from return dollars to percent points
    if drop_percent < 0:
        drop_percent = 0.0
    return round(drop_percent, 2)


def summarize_allocations(investment_amount: float, tranches: List[TrancheRateRisk]) -> Dict[str, float]:
    locked_amount = sum(t.allocation for t in tranches if t.is_locked)
    deferred_amount = sum(t.allocation for t in tranches if not t.is_locked)
    locked_pct = (locked_amount / investment_amount) * 100.0 if investment_amount > 0 else 0.0
    deferred_pct = (deferred_amount / investment_amount) * 100.0 if investment_amount > 0 else 0.0
    return {
        "locked_amount": round(locked_amount, 2),
        "deferred_amount": round(deferred_amount, 2),
        "locked_pct": round(locked_pct, 2),
        "deferred_pct": round(deferred_pct, 2),
    }


def deferred_term_avg_months(tranches: List[TrancheRateRisk]) -> float:
    deferred = [t for t in tranches if not t.is_locked]
    if not deferred:
        return 0.0
    total_alloc = sum(t.allocation for t in deferred)
    if total_alloc <= 0:
        return 0.0
    weighted = sum(t.allocation * t.term_months for t in deferred) / total_alloc
    return float(weighted)


def build_ai_summary_input(
    *,
    locked_pct: float,
    deferred_pct: float,
    worst_case_dollar_impact: float,
    break_even_drop: float,
    user_state: str,
    flat_total_return: float,
    scenarios: List[Dict],
) -> Dict:
    # Filter scenarios: exclude flat (delta == 0), keep only label and dollar_impact
    filtered_scenarios = [
        {"label": s["label"], "dollar_impact": s["dollar_impact"]}
        for s in scenarios if s["delta"] != 0.0
    ]
    
    return {
        "locked_pct": locked_pct,
        "deferred_pct": deferred_pct,
        "worst_case_dollar_impact": worst_case_dollar_impact,
        "break_even_drop": break_even_drop,
        "user_state": user_state,
        "flat_total_return": flat_total_return,
        "scenarios": filtered_scenarios,
    }

