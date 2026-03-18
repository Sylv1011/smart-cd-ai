

import requests
import logging
import os

# --- logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fetch_bank_treasury")

# --- paths ---
BANKRATE_URL = "https://www.bankrate.com/banking/cds/cd-rates/"
TREASURY_URL = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value=202603"

BANKRATE_OUT = "data/raw/bankrate.html"
TREASURY_OUT = "data/raw/treasury.html"


def ensure_dirs():
    os.makedirs("data/raw", exist_ok=True)


def fetch_bankrate():
    logger.info("Fetching Bankrate HTML...")

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
    }

    response = requests.get(BANKRATE_URL, headers=headers, timeout=20)

    logger.info(f"Bankrate status: {response.status_code}")
    logger.info(f"Bankrate content length: {len(response.text)}")

    if response.status_code != 200:
        raise ValueError("Bankrate request failed")

    if not response.text or len(response.text) < 1000:
        raise ValueError("Bankrate response too small")

    with open(BANKRATE_OUT, "w", encoding="utf-8") as f:
        f.write(response.text)

    logger.info(f"Saved Bankrate HTML → {BANKRATE_OUT}")


def fetch_treasury():
    logger.info("Fetching Treasury data...")

    headers = {
        "User-Agent": "Mozilla/5.0",
    }

    response = requests.get(TREASURY_URL, headers=headers, timeout=20)

    logger.info(f"Treasury status: {response.status_code}")
    logger.info(f"Treasury content length: {len(response.text)}")

    if response.status_code != 200:
        raise ValueError("Treasury request failed")

    if not response.text:
        raise ValueError("Empty Treasury response")

    with open(TREASURY_OUT, "w", encoding="utf-8") as f:
        f.write(response.text)

    logger.info(f"Saved Treasury → {TREASURY_OUT}")


def main():
    logger.info("\n=== FETCH BANK + TREASURY START ===")

    ensure_dirs()

    fetch_bankrate()
    fetch_treasury()

    logger.info("=== FETCH COMPLETE ===\n")


if __name__ == "__main__":
    main()