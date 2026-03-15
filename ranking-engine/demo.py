import argparse
import json
import os
from typing import Any, Dict, List

import tax
from dotenv import load_dotenv

from data import DataClient, RankingInput
from engine import rank_offers


def _require_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise RuntimeError(f"Missing required env var: {key}")
    return val


def _init_client() -> DataClient:
    url = _require_env("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or _require_env("SUPABASE_ANON_KEY")
    return DataClient(url, key)


def _scenario_defaults(name: str) -> Dict[str, Any]:
    name = (name or "").strip().lower()

    presets: Dict[str, Dict[str, Any]] = {
        # High-tax example
        "ny_manhattan": {
            "investment_amount": 50000,
            "term_months": 12,
            "state": "NY",
            "income_range": "$100,000 - $150,000",
            "filing_status": "single",
            "local_area": "manhattan",
        },
        # No state/local income tax example
        "tx": {
            "investment_amount": 50000,
            "term_months": 12,
            "state": "TX",
            "income_range": "$100,000 - $150,000",
            "filing_status": "joint",
            "local_area": "",
        },
        # HOH example (federal HOH; state/local should fall back per your data.py rules)
        "ga_hoh": {
            "investment_amount": 50000,
            "term_months": 24,
            "state": "GA",
            "income_range": "$100,000 - $150,000",
            "filing_status": "hoh",
            "local_area": "",
        },
        # Treasury-friendly view (state/local ignored for treasuries anyway)
        "ca": {
            "investment_amount": 50000,
            "term_months": 12,
            "state": "CA",
            "income_range": "$150,000 - $200,000",
            "filing_status": "single",
            "local_area": "",
        },
    }

    if name in presets:
        return presets[name]

    return presets["ny_manhattan"]


def _to_ranked_name(o: Dict[str, Any]) -> str:
    return (
        o.get("institution_name")
        or o.get("brokerage_firm")
        or o.get("issuing_bank")
        or "Unknown"
    )


def _print_summary(title: str, offers: List[Dict[str, Any]], limit: int) -> None:
    print(f"\n=== {title} (Top {min(limit, len(offers))}) ===")
    for i, o in enumerate(offers[:limit], start=1):
        after_tax_apy = float(o.get("after_tax_apy", 0.0))
        apy_nominal = float(o.get("apy_nominal", 0.0))
        after_tax_interest = float(o.get("after_tax_interest_usd", 0.0))
        nominal_interest = float(o.get("nominal_interest_usd", 0.0))
        min_dep = o.get("minimum_deposit")
        total_rate = float(o.get("total_marginal_tax_rate", 0.0))

        min_dep_str = "N/A" if min_dep is None else f"${float(min_dep):,.2f}"

        line = (
            f"{i}. {_to_ranked_name(o)} | "
            f"type={o.get('product_type')} | "
            f"term={o.get('term_months')}m | "
            f"apy={round(apy_nominal, 4)}% | "
            f"after_tax_apy={round(after_tax_apy, 6)}% | "
            f"min_dep={min_dep_str} | "
            f"nominal_interest=${nominal_interest:,.2f} | "
            f"after_tax_interest=${after_tax_interest:,.2f} | "
            f"total_tax_rate={round(total_rate, 6)}"
        )
        print(line)


def _print_full(title: str, offers: List[Dict[str, Any]], limit: int) -> None:
    print(f"\n=== {title} (Top {min(limit, len(offers))}) ===")
    for i, o in enumerate(offers[:limit], start=1):
        print(f"\n--- Rank {i} ---")
        print(json.dumps(o, indent=2, sort_keys=True))


def _combined_ranked_offers(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Combine bank, brokered, and treasury lists and assign an overall rank."""
    combined: List[Dict[str, Any]] = []

    for k in ("bank_cds", "brokered_cds", "treasuries"):
        for o in result.get(k, []) or []:
            if isinstance(o, dict):
                combined.append(o)

    combined.sort(
        key=lambda r: (
            float(r.get("after_tax_interest_usd", 0.0)),
            float(r.get("after_tax_apy", 0.0)),
            float(r.get("apy_nominal", 0.0)),
        ),
        reverse=True,
    )

    ranked: List[Dict[str, Any]] = []
    for idx, o in enumerate(combined, start=1):
        x = dict(o)
        x["rank_overall"] = idx
        ranked.append(x)

    return ranked


def _print_combined(title: str, offers: List[Dict[str, Any]], limit: int, full: bool) -> None:
    if full:
        print(f"\n=== {title} (Top {min(limit, len(offers))}) ===")
        for o in offers[:limit]:
            r = o.get("rank_overall")
            print(f"\n--- Overall Rank {r} ---")
            print(json.dumps(o, indent=2, sort_keys=True))
        return

    print(f"\n=== {title} (Top {min(limit, len(offers))}) ===")
    for o in offers[:limit]:
        r = o.get("rank_overall")
        name = _to_ranked_name(o)
        after_tax_apy = float(o.get("after_tax_apy", 0.0))
        apy_nominal = float(o.get("apy_nominal", 0.0))
        after_tax_interest = float(o.get("after_tax_interest_usd", 0.0))
        nominal_interest = float(o.get("nominal_interest_usd", 0.0))
        min_dep = o.get("minimum_deposit")
        min_dep_str = "N/A" if min_dep is None else f"${float(min_dep):,.2f}"

        print(
            f"{r}. {name} | "
            f"type={o.get('product_type')} | "
            f"term={o.get('term_months')}m | "
            f"apy={round(apy_nominal, 4)}% | "
            f"after_tax_apy={round(after_tax_apy, 6)}% | "
            f"min_dep={min_dep_str} | "
            f"nominal_interest=${nominal_interest:,.2f} | "
            f"after_tax_interest=${after_tax_interest:,.2f}"
        )


def _load_json_input(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("Input JSON must be an object")
    return data


def _build_input(args: argparse.Namespace) -> RankingInput:
    if args.input_json:
        base = _load_json_input(args.input_json)
    else:
        base = _scenario_defaults(args.scenario)

    # CLI overrides win
    if args.investment_amount is not None:
        base["investment_amount"] = args.investment_amount
    if args.term_months is not None:
        base["term_months"] = args.term_months
    if args.state is not None:
        base["state"] = args.state
    if args.income_range is not None:
        base["income_range"] = args.income_range
    if args.filing_status is not None:
        base["filing_status"] = args.filing_status
    if args.local_area is not None:
        base["local_area"] = args.local_area

    return RankingInput(
        investment_amount=float(base["investment_amount"]),
        term_months=int(base["term_months"]),
        state=str(base["state"]),
        income_range=str(base["income_range"]),
        filing_status=str(base["filing_status"]),
        local_area=str(base.get("local_area") or ""),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run SmartCD ranking engine demo scenarios")

    parser.add_argument(
        "--scenario",
        default="ny_manhattan",
        help="Preset scenario: ny_manhattan, tx, ga_hoh, ca",
    )
    parser.add_argument(
        "--input-json",
        help="Path to a JSON file containing RankingInput fields (overrides scenario defaults)",
    )

    parser.add_argument("--investment-amount", type=float)
    parser.add_argument("--term-months", type=int)
    parser.add_argument("--state")
    parser.add_argument("--income-range")
    parser.add_argument("--filing-status")
    parser.add_argument("--local-area")

    parser.add_argument("--top", type=int, default=10, help="How many offers to show per CD group")
    parser.add_argument("--full", action="store_true", help="Print full JSON for each ranked offer")
    parser.add_argument(
        "--combined",
        dest="combined",
        action="store_true",
        default=True,
        help="Print an overall ranking across bank_cds, brokered_cds, and treasuries (default: on)",
    )
    parser.add_argument(
        "--no-combined",
        dest="combined",
        action="store_false",
        help="Disable the overall combined ranking printout",
    )
    parser.add_argument(
        "--top-all",
        type=int,
        default=None,
        help="How many offers to show in the combined ranking (defaults to --top)",
    )
    parser.add_argument("--out", help="Write the full ranking JSON output to this file")

    args = parser.parse_args()

    load_dotenv()

    print("USING tax.py FROM:", tax.__file__)

    sb = _init_client()
    inp = _build_input(args)

    result = rank_offers(inp, data_client=sb, top_n_cd=max(1, int(args.top)), top_n_treasury=1)

    print("\n=== INPUT ===")
    print(json.dumps(result["input"], indent=2, sort_keys=True))

    print("\n=== TAX CONTEXT ===")
    print(json.dumps(result["tax_context"], indent=2, sort_keys=True))

    if args.full:
        _print_full("Bank CDs", result["bank_cds"], args.top)
        _print_full("Brokered CDs", result["brokered_cds"], args.top)
        _print_full("Treasuries", result["treasuries"], 1)
    else:
        _print_summary("Bank CDs", result["bank_cds"], args.top)
        _print_summary("Brokered CDs", result["brokered_cds"], args.top)
        _print_summary("Treasuries", result["treasuries"], 1)

    combined: List[Dict[str, Any]] = []
    if args.combined:
        top_all = int(args.top_all) if args.top_all is not None else int(args.top)
        combined = _combined_ranked_offers(result)
        _print_combined("All Products", combined, top_all, full=bool(args.full))

    if args.out:
        out_obj = dict(result)
        if combined:
            out_obj["all_products"] = combined
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out_obj, f, indent=2)
        print(f"\nWrote full output to: {args.out}")


if __name__ == "__main__":
    main()