import json
import logging
import os
from typing import Any, Dict, List

import requests
from pathlib import Path
from dotenv import load_dotenv

# --- logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fetch_brokered_cds")

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH)

BROKERED_OUT = "data/raw/brokered_cd.json"
AI_LAYER_URL = os.getenv("AI_LAYER_URL", "http://127.0.0.1:8001")
logger.info("Resolved AI_LAYER_URL -> %s", AI_LAYER_URL)

SOURCE_URLS = {
    "Fidelity": "https://fixedincome.fidelity.com/ftgw/fi/FILanding",
    "Schwab": "https://www.schwab.com/brokerage",
    "Vanguard": "https://investor.vanguard.com/investment-products/cds",
    "Morgan Stanley": "https://www.morganstanley.com/what-we-do/wealth-management/cd-savings",
    "E*Trade": "https://us.etrade.com/what-we-offer/pricing-and-rates?icid=et-brokerage_pricingbanner_see-all",
}

REQUIRED_TERMS = {3, 6, 12, 24, 60}
REQUIRED_PER_TERM = 4


def ensure_dirs() -> None:
    os.makedirs("data/raw", exist_ok=True)


def write_brokered_file(products: List[Dict[str, Any]]) -> None:
    with open(BROKERED_OUT, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2)

    logger.info("Created brokered CD raw file -> %s | records=%s", BROKERED_OUT, len(products))


def fetch_ai_brokered_cds() -> List[Dict[str, Any]]:
    url = f"{AI_LAYER_URL.rstrip('/')}/generate-brokered-cds"
    logger.info("Requesting brokered CDs from AI layer -> %s", url)

    response = requests.post(url, json={}, timeout=90)
    response.raise_for_status()

    payload = response.json()
    products = payload.get("products", [])

    if not isinstance(products, list):
        raise ValueError("AI layer returned invalid products format")

    normalized: List[Dict[str, Any]] = []

    for p in products:
        try:
            brokerage = p.get("brokerage_firm")

            row = {
                "product_type": "brokered_cd",
                "institution_name": None,
                "brokerage_firm": brokerage,
                "issuing_bank": p.get("issuing_bank"),
                "term_months": int(p.get("term_months")),
                "apy": float(p.get("apy")),
                "minimum_deposit": float(p.get("minimum_deposit")),
                "fdic_insured": bool(p.get("fdic_insured")),
                "source_name": brokerage,
                "source_url": SOURCE_URLS.get(brokerage),
                "destination_url": p.get("destination_url"),
                "retrieved_at": p.get("retrieved_at"),
            }

            normalized.append(row)

        except Exception as e:
            logger.warning("Skipping invalid brokered CD row: %s | error=%s", p, e)

    return normalized


def validate_distribution(products: List[Dict[str, Any]]) -> None:
    counts = {3: 0, 6: 0, 12: 0, 24: 0, 60: 0}

    for product in products:
        term = product.get("term_months")
        if term in counts:
            counts[term] += 1

    bad_terms = {term: count for term, count in counts.items() if count < REQUIRED_PER_TERM}

    if bad_terms:
        raise ValueError(f"Insufficient brokered CD coverage by term: {bad_terms}")

    logger.info("Brokered CD term distribution validated -> %s", counts)


def main() -> None:
    logger.info("\n=== FETCH BROKERED CDS START ===")

    ensure_dirs()

    try:
        products = fetch_ai_brokered_cds()

        if not products:
            raise ValueError("AI layer returned zero brokered CD products")

        validate_distribution(products)
        write_brokered_file(products)

        logger.info("Brokered CD fetch completed successfully using AI layer")

    except Exception as e:
        logger.exception("Brokered CD fetch failed")
        raise RuntimeError(f"Brokered CD ingestion failed: {e}") from e

    logger.info("=== FETCH BROKERED CDS COMPLETE ===\n")


if __name__ == "__main__":
    main()