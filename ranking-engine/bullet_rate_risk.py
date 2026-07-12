from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


SCENARIOS = [
    {"label": "Rates stay flat", "delta": 0.0},
    {"label": "Rates drop 0.5%", "delta": -0.5},
    {"label": "Rates drop 1.0%", "delta": -1.0},
    {"label": "Rates rise 0.5%", "delta": 0.5},
]


@dataclass(frozen=True)
class TrancheRateRisk:
    allocation: float
    after_tax_apy: float
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
        effective_apy += float(delta)
    if effective_apy < 0:
        effective_apy = 0.0

    years = float(term_months) / 12.0
    value = float(allocation) * (effective_apy / 100.0) * years
    return round(value, 2)


def compute_portfolio_totals(tranches: List[TrancheRateRisk]) -> List[Dict]:
    flat_total = None
    out: List[Dict] = []

    for scenario in SCENARIOS:
        total = 0.0
        tranche_returns: List[float] = []
        for tranche in tranches:
            tranche_return = compute_tranche_return(
                allocation=tranche.allocation,
                after_tax_apy=tranche.after_tax_apy,
                delta=scenario["delta"],
                term_months=tranche.term_months,
                is_locked=tranche.is_locked,
            )
            tranche_returns.append(tranche_return)
            total += tranche_return

        total = round(total, 2)
        if scenario["delta"] == 0.0:
            flat_total = total

        out.append(
            {
                "label": scenario["label"],
                "delta": scenario["delta"],
                "total_return": total,
                "tranche_returns": tranche_returns,
            }
        )

    if flat_total is None:
        flat_total = 0.0

    for row in out:
        row["dollar_impact"] = round(float(row["total_return"]) - float(flat_total), 2)

    return out


def summarize_allocations(investment_amount: float, tranches: List[TrancheRateRisk]) -> Dict[str, float]:
    locked_amount = sum(tranche.allocation for tranche in tranches if tranche.is_locked)
    deferred_amount = sum(tranche.allocation for tranche in tranches if not tranche.is_locked)
    locked_pct = (locked_amount / investment_amount) * 100.0 if investment_amount > 0 else 0.0
    deferred_pct = (deferred_amount / investment_amount) * 100.0 if investment_amount > 0 else 0.0
    return {
        "locked_amount": round(locked_amount, 2),
        "deferred_amount": round(deferred_amount, 2),
        "locked_pct": round(locked_pct, 2),
        "deferred_pct": round(deferred_pct, 2),
    }


def deferred_term_avg_months(tranches: List[TrancheRateRisk]) -> float:
    deferred = [tranche for tranche in tranches if not tranche.is_locked]
    if not deferred:
        return 0.0
    total_alloc = sum(tranche.allocation for tranche in deferred)
    if total_alloc <= 0:
        return 0.0
    weighted = sum(tranche.allocation * tranche.term_months for tranche in deferred) / total_alloc
    return float(weighted)


def deferred_flat_total(tranches: List[TrancheRateRisk]) -> float:
    return round(
        sum(
            compute_tranche_return(
                allocation=tranche.allocation,
                after_tax_apy=tranche.after_tax_apy,
                delta=0.0,
                term_months=tranche.term_months,
                is_locked=tranche.is_locked,
            )
            for tranche in tranches
            if not tranche.is_locked
        ),
        2,
    )


def compute_best_single_cd_return(
    investment_amount: float,
    tranches: List[TrancheRateRisk],
    deferred_term_avg_months_value: float,
) -> float:
    deferred_tranches = [tranche for tranche in tranches if not tranche.is_locked]
    if not deferred_tranches or deferred_term_avg_months_value <= 0:
        return 0.0

    deferred_allocation = sum(float(tranche.allocation) for tranche in deferred_tranches)
    principal = min(float(investment_amount), deferred_allocation)
    if principal <= 0:
        return 0.0

    best_apy = max((float(tranche.after_tax_apy) for tranche in deferred_tranches), default=0.0)
    years = float(deferred_term_avg_months_value) / 12.0
    return round(principal * (best_apy / 100.0) * years, 2)


def compute_break_even(
    deferred_flat_return: float,
    best_single_cd_return: float,
    deferred_allocation: float,
    deferred_term_avg_months_value: float,
) -> float:
    if deferred_allocation <= 0 or deferred_term_avg_months_value <= 0:
        return 0.0

    advantage = float(deferred_flat_return) - float(best_single_cd_return)
    if advantage <= 0:
        return 0.0

    years = float(deferred_term_avg_months_value) / 12.0
    denom = float(deferred_allocation) * years
    if denom <= 0:
        return 0.0

    drop_percent = (advantage / denom) * 100.0
    if drop_percent < 0:
        drop_percent = 0.0
    return round(drop_percent, 2)


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
    filtered_scenarios = [
        {"label": scenario["label"], "dollar_impact": scenario["dollar_impact"]}
        for scenario in scenarios
        if scenario["delta"] != 0.0
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
