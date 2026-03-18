import json
import logging
from datetime import datetime, date
from bs4 import BeautifulSoup

HTML_IN = "data/raw/treasury.html"
JSON_OUT = "data/raw/treasury.json"

# Map table columns → term months
COL_TO_TERM_MONTHS = {
    "3 Mo": 3,
    "6 Mo": 6,
    "1 Yr": 12,
    "2 Yr": 24,
    "5 Yr": 60,
}

SOURCE_NAME_DEFAULT = "U.S. Treasury"
SOURCE_URL_DEFAULT = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates"
TREASURY_DESTINATION_URL = "https://www.treasurydirect.gov/marketable-securities/"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("treasury_html_to_json")


def _to_float(x):
    if not x:
        return None
    try:
        return float(str(x).replace("%", "").strip())
    except:
        return None


def _parse_date_mmddyyyy(s: str):
    try:
        return datetime.strptime(s.strip(), "%m/%d/%Y").date().isoformat()
    except:
        return date.today().isoformat()


def parse_treasury_html():
    try:
        with open(HTML_IN, "r", encoding="utf-8") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
    except FileNotFoundError:
        logger.error("Treasury HTML file not found")
        return []

    table = soup.find("table")
    if not table:
        logger.error("No table found in treasury HTML")
        return []

    headers = [th.get_text(strip=True) for th in table.find_all("th")]
    rows = table.find_all("tr")

    if len(rows) < 2:
        logger.error("No data rows found in treasury HTML")
        return []

    data_rows = rows[1:]  # skip header

    parsed_rows = []
    for row in data_rows:
        cols = [td.get_text(strip=True) for td in row.find_all("td")]
        if not cols:
            continue

        row_map = dict(zip(headers, cols))
        row_date = _parse_date_mmddyyyy(row_map.get("Date", ""))
        parsed_rows.append((row_date, row_map))

    if not parsed_rows:
        logger.error("No valid treasury rows found")
        return []

    retrieved_at, data_map = max(parsed_rows, key=lambda x: x[0])
    output = []

    for col, term_months in COL_TO_TERM_MONTHS.items():
        apy = _to_float(data_map.get(col))
        if apy is None:
            continue

        output.append(
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

    if not output:
        logger.error("Parsed treasury data is empty")
        raise ValueError("Treasury parsing failed")

    logger.info(f"Parsed treasury offers: {len(output)}")

    return output


def main():
    logger.info("=== TREASURY HTML PARSE START ===")

    data = parse_treasury_html()

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    logger.info(f"Wrote: {JSON_OUT}")
    logger.info("=== TREASURY HTML PARSE COMPLETE ===")


if __name__ == "__main__":
    main()