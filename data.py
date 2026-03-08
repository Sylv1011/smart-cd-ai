# smartcd_ranking_engine/data.py
from __future__ import annotations

import os
import logging
from dataclasses import dataclass
from typing import List, Optional

try:
    from supabase import create_client  # type: ignore
except Exception:
    create_client = None


logger = logging.getLogger(__name__)
DEBUG = os.getenv("DEBUG_TAX", "0") == "1"


@dataclass
class RankingInput:
    investment_amount: float
    term_months: int
    state: str
    income_range: str
    filing_status: str  # "single" | "joint" | "hoh" (hoh affects federal only; state/local treat hoh as single)
    local_area: Optional[str] = None  # county or city name depending on state rule


@dataclass
class Offer:
    product_type: str  # bank_cd | brokered_cd | treasury
    institution_name: Optional[str]
    brokerage_firm: Optional[str]
    issuing_bank: Optional[str]
    term_months: int
    apy: float
    minimum_deposit: Optional[float]
    fdic_insured: Optional[bool]
    source_name: Optional[str]
    source_url: Optional[str]
    destination_url: Optional[str]
    retrieved_at: str


def _normalize_filing_status(fs: str) -> str:
    fs = (fs or "").strip().lower()
    if fs in {"married", "married_joint", "mfj", "joint"}:
        return "joint"
    if fs in {"hoh", "head_of_household", "head household", "head_household"}:
        return "hoh"
    return "single"


def _federal_status_value(fs: str) -> str:
    """
    federal_taxes.filing_status values in your DB:
      single | married | head_household
    UI/engine uses: single | joint | hoh
    """
    n = _normalize_filing_status(fs)
    if n == "joint":
        return "married"
    if n == "hoh":
        return "head_household"
    return "single"


def _state_status_value(fs: str) -> str:
    """
    State/local tax tables only support: single | joint

    Policy:
      - If user picks HOH, treat it as single for state + local.
    """
    n = _normalize_filing_status(fs)
    if n == "joint":
        return "joint"
    # HOH -> single for state/local
    return "single"


def _norm_text(x: Optional[str]) -> str:
    return (x or "").strip().lower()


def _percent_to_decimal(x) -> float:
    """
    Accepts:
      0.24 -> 0.24
      24   -> 0.24
      "0.24" / "24" -> parsed
    """
    if x is None:
        return 0.0
    try:
        v = float(x)
    except Exception:
        return 0.0
    return v / 100.0 if v > 1.0 else v


class DataClient:
    """
    Table names (Supabase):
      offers
      states_tax_config
      tax_brackets
      local_taxes
      federal_taxes
    """

    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        offers_table: str = "offers",
        state_config_table: str = "states_tax_config",
        state_brackets_table: str = "tax_brackets",
        federal_brackets_table: str = "federal_taxes",
        local_tax_table: str = "local_taxes",
    ):
        if create_client is None:
            raise RuntimeError("supabase-py is not installed. Install it in your venv.")

        self.sb = create_client(supabase_url, supabase_key)

        self.offers_table = offers_table
        self.state_config_table = state_config_table
        self.state_brackets_table = state_brackets_table
        self.federal_brackets_table = federal_brackets_table
        self.local_tax_table = local_tax_table

        # simple in‑memory caches (avoid repeated DB hits for tax tables)
        self._federal_cache = {}
        self._state_cache = {}
        self._local_cache = {}

    # ---------------- Offers ----------------

    def fetch_offers(self, term_months: int) -> List[Offer]:
        resp = (
            self.sb.table(self.offers_table)
            .select(
                "product_type,institution_name,brokerage_firm,issuing_bank,term_months,apy,minimum_deposit,fdic_insured,source_name,source_url,destination_url,retrieved_at"
            )
            .eq("term_months", term_months)
            .execute()
        )

        rows = resp.data or []

        if not rows:
            logger.warning("No offers returned for term_months=%s", term_months)

        out: List[Offer] = []
        for r in rows:
            out.append(
                Offer(
                    product_type=r.get("product_type"),
                    institution_name=r.get("institution_name"),
                    brokerage_firm=r.get("brokerage_firm"),
                    issuing_bank=r.get("issuing_bank"),
                    term_months=int(r.get("term_months")),
                    apy=float(r.get("apy")),
                    minimum_deposit=float(r["minimum_deposit"]) if r.get("minimum_deposit") is not None else None,
                    fdic_insured=r.get("fdic_insured"),
                    source_name=r.get("source_name"),
                    source_url=r.get("source_url"),
                    destination_url=r.get("destination_url"),
                    retrieved_at=r.get("retrieved_at"),
                )
            )
        return out

    # ---------------- Tax: Federal ----------------

    def fetch_federal_marginal_rate(self, filing_status: str, estimated_income: float) -> float:
        """
        federal_taxes:
          filing_status: single | married | head_household
          rate: can be decimal (0.24) OR percent-like (24) depending on how it was loaded
          min_income / max_income (max can be null)

        Returns: DECIMAL (0.24)
        """
        fs_db = _federal_status_value(filing_status)
        income = float(estimated_income)

        cache_key = (fs_db, round(income, 2))
        if cache_key in self._federal_cache:
            return self._federal_cache[cache_key]

        try:
            resp = (
                self.sb.table(self.federal_brackets_table)
                .select("rate,min_income,max_income,filing_status")
                .eq("filing_status", fs_db)
                .lte("min_income", income)
                .or_(f"max_income.is.null,max_income.gte.{income}")
                .order("min_income", desc=True)
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                logger.warning(
                    "Federal tax lookup found no matching bracket for filing_status=%s income=%s. Using fallback 22%%.",
                    fs_db,
                    income,
                )
                return 0.22

            row = rows[0]
            rate = _percent_to_decimal(row.get("rate"))

            if DEBUG:
                logger.debug(
                    "[FED] matched bracket: status=%s min=%s max=%s rate=%s -> %s",
                    row.get("filing_status"),
                    row.get("min_income"),
                    row.get("max_income"),
                    row.get("rate"),
                    rate,
                )

            self._federal_cache[cache_key] = rate
            return rate

        except Exception as e:
            logger.exception("Federal tax lookup failed; using fallback 22%%. error=%s", e)
            return 0.22

    # ---------------- Tax: State ----------------

    def fetch_state_marginal_rate(self, state: str, filing_status: str, income: float) -> float:
        """
        states_tax_config(state_id, has_tax, ...)
        tax_brackets(state_id, filing_status, tax_rate, bracket_thrld)

        Returns: DECIMAL (0.059)
        """
        st = (state or "").strip().upper()
        fs_norm = _normalize_filing_status(filing_status)
        fs = _state_status_value(filing_status)

        if fs_norm == "hoh" and DEBUG:
            logger.debug("State/local do not support HOH; using single for state/local lookup")

        inc = float(income)

        cache_key = (st, fs, round(inc, 2))
        if cache_key in self._state_cache:
            return self._state_cache[cache_key]

        # 1) check if state has income tax
        try:
            cfg_rows = (
                self.sb.table(self.state_config_table)
                .select("has_tax")
                .eq("state_id", st)
                .limit(1)
                .execute()
            ).data or []

            # if config missing, treat as taxable (don’t zero it out)
            has_tax = True if not cfg_rows else bool(cfg_rows[0].get("has_tax", True))
            if not has_tax:
                if DEBUG:
                    logger.debug("[STATE] %s marked has_tax=false -> 0.0", st)
                return 0.0
        except Exception as e:
            # if config lookup fails, still try brackets
            logger.warning("State config lookup failed for state=%s; trying brackets anyway. error=%s", st, e)

        # 2) pick marginal bracket: largest threshold <= income
        try:
            rows = (
                self.sb.table(self.state_brackets_table)
                .select("tax_rate,bracket_thrld,state_id,filing_status")
                .eq("state_id", st)
                .eq("filing_status", fs)
                .lte("bracket_thrld", inc)
                .order("bracket_thrld", desc=True)
                .limit(1)
                .execute()
            ).data or []

            if not rows:
                if DEBUG:
                    logger.debug("[STATE] no bracket match for state=%s status=%s income=%s", st, fs, inc)
                return 0.0

            row = rows[0]
            rate = _percent_to_decimal(row.get("tax_rate"))

            if DEBUG:
                logger.debug(
                    "[STATE] matched bracket: state=%s status=%s thr=%s rate=%s -> %s",
                    row.get("state_id"),
                    row.get("filing_status"),
                    row.get("bracket_thrld"),
                    row.get("tax_rate"),
                    rate,
                )

            self._state_cache[cache_key] = rate
            return rate
        except Exception as e:
            logger.exception(
                "State bracket lookup failed for state=%s status=%s income=%s; returning 0.0. error=%s",
                st,
                fs,
                inc,
                e,
            )
            return 0.0

    # ---------------- Tax: Local ----------------

    def fetch_local_interest_rate(self, state: str, local_area: Optional[str]) -> float:
        """
        local_taxes:
          state (ex: NY)
          city, county
          tax_rate can be decimal (0.035) or percent-like (3.5)

        Returns: DECIMAL
        """
        st = (state or "").strip().upper()
        area = _norm_text(local_area)

        cache_key = (st, area)
        if cache_key in self._local_cache:
            return self._local_cache[cache_key]

        if not area:
            if DEBUG:
                logger.debug("[LOCAL] no local area provided -> 0.0")
            return 0.0

        def _try(col: str) -> Optional[float]:
            resp = (
                self.sb.table(self.local_tax_table)
                .select("state,city,county,tax_rate")
                .eq("state", st)
                .ilike(col, f"%{area}%")
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                return None

            row = rows[0]
            rate = _percent_to_decimal(row.get("tax_rate"))

            if DEBUG:
                logger.debug(
                    "[LOCAL] matched %s: state=%s city=%s county=%s rate=%s -> %s",
                    col,
                    row.get("state"),
                    row.get("city"),
                    row.get("county"),
                    row.get("tax_rate"),
                    rate,
                )
            self._local_cache[cache_key] = rate
            return rate

        try:
            v = _try("city")
            if v is not None:
                return v
        except Exception as e:
            logger.warning("Local city lookup failed for state=%s area=%s. error=%s", st, area, e)

        try:
            v = _try("county")
            if v is not None:
                return v
        except Exception as e:
            logger.warning("Local county lookup failed for state=%s area=%s. error=%s", st, area, e)

        if DEBUG:
            logger.debug("[LOCAL] no local match for state=%s area=%s -> 0.0", st, area)
        return 0.0