#!/usr/bin/env python3
"""
CD Ladder demo — calls ladder logic directly against the local database.
Run from the repo root:
    python scripts/demo_ladder.py
    python scripts/demo_ladder.py --scenario high_liquidity
    python scripts/demo_ladder.py --amount 20000 --horizon 3 --liquidity low --state CA
"""
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from api.ladder import build_ladder, compute_blended_apy
from api.index import (
    get_federal_rate, get_state_tax_rate, get_local_tax_rate,
    estimate_income_from_range, normalize_filing_status,
    state_id_candidates, normalize_locality,
    estimate_federal_tax_rate,
)

DB_URL = os.getenv("DATABASE_URL", "sqlite:///test.db")

SCENARIOS = {
    "default": {
        "investment_amount": 10000,
        "time_horizon_years": 5,
        "liquidity_preference": "medium",
        "income_range": "$75,000 - $100,000",
        "state": "NY",
        "city_county": "New York",
        "filing_status": "single",
    },
    "high_liquidity": {
        "investment_amount": 25000,
        "time_horizon_years": 5,
        "liquidity_preference": "high",
        "income_range": "$100,000 - $150,000",
        "state": "CA",
        "city_county": "",
        "filing_status": "single",
    },
    "low_liquidity": {
        "investment_amount": 50000,
        "time_horizon_years": 5,
        "liquidity_preference": "low",
        "income_range": "$150,000 - $200,000",
        "state": "TX",
        "city_county": "",
        "filing_status": "joint",
    },
    "short_horizon": {
        "investment_amount": 10000,
        "time_horizon_years": 1,
        "liquidity_preference": "high",
        "income_range": "$50,000 - $75,000",
        "state": "FL",
        "city_county": "",
        "filing_status": "single",
    },
}


def run_demo(scenario: dict) -> None:
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        income = estimate_income_from_range(scenario["income_range"])
        filing_key = normalize_filing_status(scenario["filing_status"])
        state_candidates = state_id_candidates(scenario["state"])
        locality = normalize_locality(scenario.get("city_county", ""))

        try:
            fed_rate = get_federal_rate(db, filing_key, income, scenario["income_range"], scenario["filing_status"])
        except OperationalError:
            fed_rate = estimate_federal_tax_rate(scenario["income_range"], scenario["filing_status"])

        try:
            state_rate = get_state_tax_rate(db, state_candidates, filing_key, income)
        except OperationalError:
            state_rate = 0.0

        try:
            local_rate = get_local_tax_rate(db, state_candidates, locality)
        except OperationalError:
            local_rate = 0.0

        try:
            rungs, warnings = build_ladder(
                db=db,
                investment_amount=scenario["investment_amount"],
                time_horizon_years=scenario["time_horizon_years"],
                liquidity_preference=scenario["liquidity_preference"],
                fed_rate=fed_rate,
                state_rate=state_rate,
                local_rate=local_rate,
            )
        except OperationalError:
            rungs, warnings = [], ["Database tables not found — no offer data available."]

        blended_nominal, blended_after_tax = compute_blended_apy(rungs)
        total_nominal = sum(r.nominal_interest for r in rungs)
        total_after_tax = sum(r.after_tax_interest for r in rungs)

        print("\n" + "=" * 60)
        print(f"  CD LADDER — {scenario['state']} | "
              f"${scenario['investment_amount']:,.0f} | "
              f"{scenario['time_horizon_years']}yr | "
              f"{scenario['liquidity_preference'].upper()} liquidity")
        print("=" * 60)
        print(f"  Tax rates:  Federal {fed_rate:.1%}  |  State {state_rate:.1%}  |  Local {local_rate:.1%}")
        print(f"  Blended APY:  {blended_nominal:.2f}% nominal  ->  {blended_after_tax:.2f}% after-tax")
        print(f"  Total interest:  ${total_nominal:,.2f} nominal  ->  ${total_after_tax:,.2f} after-tax")
        print()

        max_amount = max((r.amount for r in rungs), default=1)
        bar_max = 30

        print(f"  {'TERM':>8}  {'AMOUNT':>10}  {'APY':>6}  {'AFTER-TAX':>9}  {'PROVIDER'}")
        print(f"  {'-'*8}  {'-'*10}  {'-'*6}  {'-'*9}  {'-'*20}")
        for rung in rungs:
            bar_len = int(rung.amount / max_amount * bar_max)
            bar = "#" * bar_len
            print(
                f"  {rung.term_months:>5}mo  "
                f"${rung.amount:>9,.0f}  "
                f"{rung.nominal_apy:>5.2f}%  "
                f"{rung.after_tax_apy:>8.2f}%  "
                f"{rung.provider:<20}  {bar}"
            )

        if not rungs:
            print("  (no CD offers found in the database — connect a real DB to see results)")

        if warnings:
            print()
            print("  Warnings:")
            for w in warnings:
                print(f"    - {w}")

        print()

        output = {
            "scenario": scenario,
            "tax_rates": {"federal": fed_rate, "state": state_rate, "local": local_rate},
            "blended_nominal_apy": blended_nominal,
            "blended_after_tax_apy": blended_after_tax,
            "total_nominal_interest": round(total_nominal, 2),
            "total_after_tax_interest": round(total_after_tax, 2),
            "rungs": [r.model_dump() for r in rungs],
            "warnings": warnings,
        }
        print("  JSON output:")
        print(json.dumps(output, indent=2))

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="SmartCD Ladder POC Demo")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()), default="default")
    parser.add_argument("--amount", type=float)
    parser.add_argument("--horizon", type=int, choices=[1, 2, 3, 4, 5])
    parser.add_argument("--liquidity", choices=["low", "medium", "high"])
    parser.add_argument("--state", type=str)
    args = parser.parse_args()

    scenario = dict(SCENARIOS[args.scenario])
    if args.amount:
        scenario["investment_amount"] = args.amount
    if args.horizon:
        scenario["time_horizon_years"] = args.horizon
    if args.liquidity:
        scenario["liquidity_preference"] = args.liquidity
    if args.state:
        scenario["state"] = args.state

    run_demo(scenario)


if __name__ == "__main__":
    main()
