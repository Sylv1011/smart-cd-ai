

import json
import logging
import os

# --- logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fetch_brokered_cds")

BROKERED_OUT = "data/raw/brokered_cd.json"


def ensure_dirs():
    os.makedirs("data/raw", exist_ok=True)


def write_empty_brokered_file():
    """
    For now we do not have an API / LLM / automated brokered source.
    This script must still succeed so the daily ingestion pipeline does not fail.
    It creates an empty brokered CD raw file that can later be manually replaced.
    """
    with open(BROKERED_OUT, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)

    logger.info(f"Created empty brokered CD file -> {BROKERED_OUT}")


def main():
    logger.info("\n=== FETCH BROKERED CDS START ===")
    logger.info("No automated brokered source configured yet. Writing empty placeholder file.")

    ensure_dirs()
    write_empty_brokered_file()

    logger.info("=== FETCH BROKERED CDS COMPLETE ===\n")


if __name__ == "__main__":
    main()