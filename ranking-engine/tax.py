# smartcd_ranking_engine/tax.py
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, Set
import logging

from data import DataClient, Offer

DEBUG = os.getenv("DEBUG_TAX", "0") == "1"
logger = logging.getLogger(__name__)


@dataclass
class TaxContext:
    state: str
    filing_status: str
    estimated_income: float
    federal_rate: float  # decimal, e.g. 0.24
    state_rate: float    # decimal, e.g. 0.059
    local_rate: float    # decimal, e.g. 0.035


INCOME_RANGE_MAP = {
    "<$25,000": (0.0, 25000.0),
    "$25,000 - $50,000": (25000.0, 50000.0),
    "$50,000 - $75,000": (50000.0, 75000.0),
    "$75,000 - $100,000": (75000.0, 100000.0),
    "$100,000 - $150,000": (100000.0, 150000.0),
    "$150,000 - $200,000": (150000.0, 200000.0),
    "$200,000+": (200000.0, 300000.0),
}


def estimate_income_from_range(income_range: str) -> float:
    rng = (income_range or "").strip()
    if rng not in INCOME_RANGE_MAP:
        return 100000.0
    lo, hi = INCOME_RANGE_MAP[rng]
    return (lo + hi) / 2.0


def _normalize_fs_common(fs: str) -> str:
    return (fs or "").strip().lower()


def _normalize_filing_status_federal(fs: str) -> str:
    """Normalize filing status for federal lookups.

    Supports a best-effort pass-through for head of household.
    """
    v = _normalize_fs_common(fs)
    if v in {"head_of_household", "head of household", "hoh"}:
        return "head_of_household"
    if v in {"married", "married_joint", "mfj", "joint", "married_filing_jointly"}:
        return "joint"
    return "single"


def _normalize_filing_status_state_local(
    fs: str,
    supported: Optional[Set[str]] = None,
    *,
    warn: bool = True,
) -> str:
    """Normalize filing status for state/local lookups.

    HOH is provided but not supported by state/local tables, falls back to 'single'.
    """
    supported = supported or {"single", "joint"}
    v = _normalize_fs_common(fs)

    # Treat HOH as a distinct intent; optionally fall back.
    if v in {"head_of_household", "head of household", "hoh"}:
        if "head_of_household" in supported:
            return "head_of_household"
        if warn:
            logger.warning("Filing status HOH not supported for state/local; falling back to single")
        return "single"

    if v in {"married", "married_joint", "mfj", "joint", "married_filing_jointly"}:
        return "joint" if "joint" in supported else "single"

    return "single"


def _clamp_rate(x: float) -> float:
    # keep it sane; prevents accidental 3.5 being treated as 350%
    return max(0.0, min(0.99, float(x)))


def compute_marginal_rates(
    data_client: DataClient,
    state: str,
    filing_status: str,
    estimated_income: float,
    local_area: Optional[str] = None,
) -> Dict[str, float]:
    st_code = (state or "").strip().upper()
    fs_fed = _normalize_filing_status_federal(filing_status)
    fs_state = _normalize_filing_status_state_local(filing_status)
    income = float(estimated_income)

    if DEBUG:
        logger.debug("[TAX] inputs state=%s filing_status_fed=%s filing_status_state=%s income=%s local_area=%s",
                     st_code, fs_fed, fs_state, income, local_area)

    fed = float(data_client.fetch_federal_marginal_rate(fs_fed, income))
    st_rate = float(data_client.fetch_state_marginal_rate(st_code, fs_state, income))
    loc_rate = float(data_client.fetch_local_interest_rate(st_code, local_area))

    fed = _clamp_rate(fed)
    st_rate = _clamp_rate(st_rate)
    loc_rate = _clamp_rate(loc_rate)

    if DEBUG:
        logger.debug("[TAX] lookup results federal_rate=%s state_rate=%s local_rate=%s",
                     fed, st_rate, loc_rate)

    return {
        "federal_rate": fed,
        "state_rate": st_rate,
        "local_rate": loc_rate,
    }


def after_tax_rate_for_offer(offer: Offer, tax_ctx: TaxContext) -> Tuple[float, float, float, float, float]:
    """
    Returns:
      after_tax_apy (percent),
      total_marginal_tax_rate (decimal),
      fed, state, local (decimals)
    """
    apy = float(offer.apy)

    fed = _clamp_rate(tax_ctx.federal_rate)
    st = _clamp_rate(tax_ctx.state_rate)
    loc = _clamp_rate(tax_ctx.local_rate)

    # Treasury interest: exempt from state + local
    if offer.product_type == "treasury":
        total = fed
    else:
        total = _clamp_rate(fed + st + loc)

    after_tax_apy = apy * (1.0 - total)
    return after_tax_apy, total, fed, st, loc