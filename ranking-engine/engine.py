# smartcd_ranking_engine/engine.py
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple, Iterable
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from data import DataClient, RankingInput, Offer
from tax import TaxContext, compute_marginal_rates, after_tax_rate_for_offer, estimate_income_from_range


logger = logging.getLogger(__name__)


class RankingEngineError(RuntimeError):
    """Raised when ranking cannot be completed due to invalid inputs or upstream failures."""


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    """Best-effort parser for ISO-8601 timestamps.

    Returns a timezone-aware datetime in UTC if possible; otherwise None.
    """
    if not value:
        return None
    v = value.strip()
    try:
        # Handle common ISO format and trailing 'Z'
        if v.endswith("Z"):
            v = v[:-1] + "+00:00"
        dt = datetime.fromisoformat(v)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _require_positive_int(name: str, value: Any) -> int:
    try:
        iv = int(value)
    except Exception as e:
        raise RankingEngineError(f"{name} must be an integer") from e
    if iv <= 0:
        raise RankingEngineError(f"{name} must be > 0")
    return iv


def _require_positive_money(name: str, value: Any) -> float:
    """Validate principal-like inputs; returns float for compatibility with existing models."""
    try:
        dv = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as e:
        raise RankingEngineError(f"{name} must be a number") from e
    if dv <= 0:
        raise RankingEngineError(f"{name} must be > 0")
    # Clamp extreme precision but keep compatibility
    return float(dv)


def _stable_offer_tiebreaker(o: Offer) -> Tuple:
    """Provide a stable, deterministic tie-breaker across otherwise equal ranked offers."""
    dt = _parse_iso_datetime(getattr(o, "retrieved_at", None))
    # For reverse sorting, later datetimes should rank higher; use timestamp int.
    ts = int(dt.timestamp()) if dt else 0
    return (
        ts,
        (o.source_name or ""),
        (o.source_url or ""),
        (o.destination_url or ""),
        (o.institution_name or ""),
        (o.issuing_bank or ""),
        (o.brokerage_firm or ""),
        (o.product_type or ""),
        int(getattr(o, "term_months", 0) or 0),
    )


def _validate_input(inp: RankingInput) -> None:
    _require_positive_int("term_months", getattr(inp, "term_months", None))
    _require_positive_money("investment_amount", getattr(inp, "investment_amount", None))
    # Optional normalization checks for known fields
    if getattr(inp, "filing_status", None) is not None:
        fs = str(inp.filing_status).strip().lower()
        # Accept common variants. Tax layer will normalize and apply any fallbacks.
        allowed = {
            "single",
            "married_filing_jointly",
            "married_filing_separately",
            "head_of_household",
            "head of household",
            "hoh",
            "qualifying_surviving_spouse",
            "married",
            "joint",
            "mfj",
        }
        if fs and fs not in allowed:
            logger.warning("Unknown filing_status=%s; downstream tax lookup may fail", fs)

    # TODO: tighten allowed statuses once product spec and DataClient supported enums are finalized.
    if getattr(inp, "state", None) is not None:
        st = str(inp.state).strip()
        if st and len(st) not in {2}:
            logger.warning("State value=%s does not look like a 2-letter code", st)

    # Basic sanity limits
    if getattr(inp, "term_months", 0) > 600:
        raise RankingEngineError("term_months is unrealistically large")

    if getattr(inp, "investment_amount", 0) > 1_000_000_000:
        raise RankingEngineError("investment_amount exceeds supported range")


@dataclass
class RankedOffer:
    product_type: str
    institution_name: Optional[str]
    brokerage_firm: Optional[str]
    issuing_bank: Optional[str]
    term_months: int
    apy_nominal: float
    after_tax_apy: float
    minimum_deposit: Optional[float]
    source_name: Optional[str]
    source_url: Optional[str]
    destination_url: Optional[str]
    fdic_insured: Optional[bool]
    retrieved_at: str

    investment_amount: float
    term_fraction_years: float
    nominal_interest_usd: float
    after_tax_interest_usd: float
    total_marginal_tax_rate: float
    fed_rate: float
    state_rate: float
    local_rate: float


def _interest_simple(principal: float, apy: float, term_months: int) -> Tuple[float, float]:
    """Simple-interest estimate.
    This is a simplification for ranking purposes; actual interest may differ based on compounding frequency and bank policies.
    """
    term_months = int(term_months)
    if term_months <= 0:
        raise RankingEngineError("term_months must be > 0")
    if principal <= 0:
        raise RankingEngineError("investment_amount must be > 0")
    term_years = float(term_months) / 12.0
    interest = principal * (float(apy) / 100.0) * term_years
    return term_years, interest


def _rank_group(
    offers: List[Offer],
    inp: RankingInput,
    tax_ctx: TaxContext,
) -> List[RankedOffer]:
    ranked: List[RankedOffer] = []

    principal = _require_positive_money("investment_amount", inp.investment_amount)
    term_months = _require_positive_int("term_months", inp.term_months)

    for o in offers:
        # Skip offers the user cannot qualify for
        try:
            if o.minimum_deposit is not None and principal < float(o.minimum_deposit):
                continue
        except Exception:
            continue

        after_tax_apy, total_rate, fed, st, loc = after_tax_rate_for_offer(o, tax_ctx)

        term_years, nominal_interest = _interest_simple(principal, o.apy, term_months)
        _, after_tax_interest = _interest_simple(principal, after_tax_apy, term_months)

        # Normalize financial outputs to avoid floating point artifacts
        nominal_interest = round(nominal_interest, 2)
        after_tax_interest = round(after_tax_interest, 2)
        after_tax_apy = round(after_tax_apy, 6)

        # Normalize rate outputs for clean API responses
        total_rate = round(total_rate, 4)
        fed = round(fed, 4)
        st = round(st, 4)
        loc = round(loc, 4)

        ranked.append(
            RankedOffer(
                product_type=o.product_type,
                institution_name=o.institution_name,
                brokerage_firm=o.brokerage_firm,
                issuing_bank=o.issuing_bank,
                term_months=term_months,
                apy_nominal=o.apy,
                after_tax_apy=after_tax_apy,
                minimum_deposit=o.minimum_deposit,
                source_name=o.source_name,
                source_url=o.source_url,
                destination_url=o.destination_url,
                fdic_insured=o.fdic_insured,
                retrieved_at=o.retrieved_at,
                investment_amount=float(principal),
                term_fraction_years=term_years,
                nominal_interest_usd=nominal_interest,
                after_tax_interest_usd=after_tax_interest,
                total_marginal_tax_rate=total_rate,
                fed_rate=fed,
                state_rate=st,
                local_rate=loc,
            )
        )

    ranked.sort(
        key=lambda r: (
            r.after_tax_interest_usd,
            r.after_tax_apy,
            r.apy_nominal,
            (lambda dt: dt.timestamp() if dt else 0)(_parse_iso_datetime(r.retrieved_at)),
            r.source_name or "",
            r.source_url or "",
            r.destination_url or "",
            r.institution_name or "",
            r.issuing_bank or "",
            r.brokerage_firm or "",
        ),
        reverse=True,
    )
    return ranked


def _combine_ranked_groups(groups: Iterable[List[RankedOffer]]) -> List[Dict[str, Any]]:
    combined: List[RankedOffer] = []
    for g in groups:
        combined.extend(g)

    combined.sort(
        key=lambda r: (
            r.after_tax_interest_usd,
            r.after_tax_apy,
            r.apy_nominal,
            (lambda dt: dt.timestamp() if dt else 0)(_parse_iso_datetime(r.retrieved_at)),
        ),
        reverse=True,
    )

    result: List[Dict[str, Any]] = []
    for idx, r in enumerate(combined, start=1):
        d = asdict(r)
        d["rank_overall"] = idx
        result.append(d)

    return result


def rank_offers(
    inp: RankingInput,
    data_client: DataClient,
    top_n_bank_cds: int = 10,
    top_n_brokered_cds: int = 10,
    top_n_treasuries: int = 1,
    top_n_overall: int = 5,
    include_all_ranked: bool = True,
) -> Dict[str, Any]:
    _validate_input(inp)

    top_n_bank_cds = _require_positive_int("top_n_bank_cds", top_n_bank_cds)
    top_n_brokered_cds = _require_positive_int("top_n_brokered_cds", top_n_brokered_cds)
    top_n_treasuries = _require_positive_int("top_n_treasuries", top_n_treasuries)
    top_n_overall = _require_positive_int("top_n_overall", top_n_overall)

    try:
        offers = data_client.fetch_offers(term_months=inp.term_months)
    except Exception as e:
        logger.exception("Failed to fetch offers")
        raise RankingEngineError("Unable to fetch offers at this time") from e

    if not offers:
        logger.warning("No offers returned for term_months=%s", inp.term_months)
        result = {
            "input": asdict(inp),
            "tax_context": None,
            "bank_cds": [],
            "brokered_cds": [],
            "treasuries": [],
            "overall_top": [],
        }
        if include_all_ranked:
            result["all_products"] = []
            result["all_ranked"] = []
        return result

    bank = [o for o in offers if o.product_type == "bank_cd"]
    brokered = [o for o in offers if o.product_type == "brokered_cd"]
    treas = [o for o in offers if o.product_type == "treasury"]

    def _valid_offer(o: Offer) -> bool:
        try:
            return (o is not None) and (getattr(o, "apy", None) is not None) and (float(o.apy) >= 0) and (int(getattr(o, "term_months", 0) or 0) > 0)
        except Exception:
            return False

    bank = [o for o in bank if _valid_offer(o)]
    brokered = [o for o in brokered if _valid_offer(o)]
    treas = [o for o in treas if _valid_offer(o)]

    logger.info(
        "Offer distribution after validation: bank=%s brokered=%s treasury=%s",
        len(bank),
        len(brokered),
        len(treas),
    )

    logger.info(
        "Ranking offers: term_months=%s principal=%s offers_total=%s bank=%s brokered=%s treasury=%s",
        inp.term_months,
        inp.investment_amount,
        len(offers),
        len(bank),
        len(brokered),
        len(treas),
    )

    est_income = estimate_income_from_range(inp.income_range)

    try:
        rates = compute_marginal_rates(
            data_client=data_client,
            state=inp.state,
            filing_status=inp.filing_status,
            estimated_income=est_income,
            local_area=inp.local_area,
        )
    except Exception as e:
        logger.exception("Failed to compute marginal tax rates")
        raise RankingEngineError("Unable to compute tax rates for the provided inputs") from e

    tax_ctx = TaxContext(
        state=(inp.state or "").strip().upper(),
        filing_status=(inp.filing_status or "").strip().lower(),
        estimated_income=est_income,
        federal_rate=rates["federal_rate"],
        state_rate=rates["state_rate"],
        local_rate=rates["local_rate"],
    )

    ranked_bank_all = _rank_group(bank, inp, tax_ctx)
    ranked_brokered_all = _rank_group(brokered, inp, tax_ctx)
    ranked_treas_all = _rank_group(treas, inp, tax_ctx)

    ranked_bank = ranked_bank_all[:top_n_bank_cds]
    ranked_brokered = ranked_brokered_all[:top_n_brokered_cds]
    ranked_treas = ranked_treas_all[:top_n_treasuries]

    logger.info(
        "Ranking completed: bank=%s brokered=%s treasury=%s",
        len(ranked_bank),
        len(ranked_brokered),
        len(ranked_treas),
    )

    bank_json = [asdict(x) for x in ranked_bank]
    brokered_json = [asdict(x) for x in ranked_brokered]
    treasury_json = [asdict(x) for x in ranked_treas]

    all_products = _combine_ranked_groups([
        ranked_bank_all,
        ranked_brokered_all,
        ranked_treas_all,
    ])

    overall_top = all_products[:top_n_overall]

    result = {
        "input": asdict(inp),
        "tax_context": asdict(tax_ctx),
        "bank_cds": bank_json,
        "brokered_cds": brokered_json,
        "treasuries": treasury_json,
        "overall_top": overall_top,
    }

    if include_all_ranked:
        result["all_products"] = all_products
        result["all_ranked"] = all_products

    return result