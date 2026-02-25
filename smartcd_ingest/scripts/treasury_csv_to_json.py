import csv
import json
from datetime import datetime, date

CSV_IN = "data/raw/treasury.csv"
JSON_OUT = "data/raw/treasury.json"

# Only output these terms for MVP (matches your allowed term_months)
# CSV header -> term_months
COL_TO_TERM_MONTHS = {
    "3 Mo": 3,
    "6 Mo": 6,
    "1 Yr": 12,
    "2 Yr": 24,
    "5 Yr": 60,
}

SOURCE_NAME_DEFAULT = "U.S. Treasury"
SOURCE_URL_DEFAULT = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates"

# Universal landing page for users
TREASURY_DESTINATION_URL = "https://www.treasurydirect.gov/marketable-securities/"


def _to_float(x):
    if x is None:
        return None
    s = str(x).strip().replace("%", "")
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_date_mmddyyyy(s: str):
    # Input example: 02/19/2026 -> output: 2026-02-19
    return datetime.strptime(s.strip(), "%m/%d/%Y").date().isoformat()


def main():
    out = []

    with open(CSV_IN, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        print("No rows found in treasury.csv")
        with open(JSON_OUT, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        return

    # Use latest row (top row in your file is latest)
    row = rows[0]
    retrieved_at = _parse_date_mmddyyyy(row["Date"]) if row.get("Date") else date.today().isoformat()

    for col, term_months in COL_TO_TERM_MONTHS.items():
        apy = _to_float(row.get(col))
        if apy is None:
            continue

        out.append(
            {
                "product_type": "treasury",
                "institution_name": "U.S. Treasury",
                "brokerage_firm": None,
                "issuing_bank": None,
                "term_months": term_months,
                "apy": apy,
                "minimum_deposit": 100,
                "fdic_insured": False,
                "source_name": SOURCE_NAME_DEFAULT,
                "source_url": SOURCE_URL_DEFAULT,
                "destination_url": TREASURY_DESTINATION_URL,
                "retrieved_at": retrieved_at,
            }
        )

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Rows written: {len(out)} -> {JSON_OUT}")


if __name__ == "__main__":
    main()