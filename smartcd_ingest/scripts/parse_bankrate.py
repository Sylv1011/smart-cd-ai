# scripts/parse_bankrate.py
import re
import json
from datetime import date
from bs4 import BeautifulSoup

from bank_maps import bank_destination_url

BANKRATE_HTML_PATH = "data/raw/bankrate.html"
SOURCE_URL = "https://www.bankrate.com/banking/cds/cd-rates/"
RETRIEVED_AT = date.today().isoformat()

TERM_MAP = {
    "3 months": 3,
    "6 months": 6,
    "9 months": 9,
    "12 months": 12,
    "1 year": 12,
    "18 months": 18,
    "2 years": 24,
    "24 months": 24,
    "3 years": 36,
    "36 months": 36,
    "4 years": 48,
    "48 months": 48,
    "5 years": 60,
    "60 months": 60,
}

ALLOWED_TERMS = {3, 6, 9, 12, 18, 24, 36, 48, 60}


def normalize_term_to_months(term_str: str):
    t = " ".join(term_str.lower().split())

    if t in TERM_MAP:
        return TERM_MAP[t]

    m = re.search(r"(\d+)\s*[- ]?(month|months|mo)\b", t)
    if m:
        val = int(m.group(1))
        return val if val in ALLOWED_TERMS else None

    m = re.search(r"(\d+)\s*[- ]?(year|years|yr)\b", t)
    if m:
        val = int(m.group(1)) * 12
        return val if val in ALLOWED_TERMS else None

    return None


def parse_apy(apy_str: str):
    s = apy_str.strip().replace("APY", "").replace("%", "").strip()
    m = re.search(r"(\d+(\.\d+)?)", s)
    return float(m.group(1)) if m else None


def parse_min_deposit(dep_str: str):
    s = " ".join(dep_str.split()).strip().lower()
    if "no minimum" in s:
        return 0.0
    m = re.search(r"\$?\s*([\d,]+)", s)
    if m:
        return float(m.group(1).replace(",", ""))
    return None


def main():
    with open(BANKRATE_HTML_PATH, "r", encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    offers = []

    for article in soup.select('article[id^="institution-details-"]'):
        name_el = article.select_one("h3")
        institution_name = name_el.get_text(strip=True) if name_el else None
        if not institution_name:
            continue

        dest_url = bank_destination_url(institution_name)

        for table in article.select("table"):
            for row in table.select("tbody tr"):
                cols = [c.get_text(" ", strip=True) for c in row.select("td")]
                if len(cols) < 3:
                    continue

                term_raw, apy_raw, dep_raw = cols[0], cols[1], cols[2]
                term_months = normalize_term_to_months(term_raw)
                apy = parse_apy(apy_raw)
                min_dep = parse_min_deposit(dep_raw)

                if term_months is None or apy is None:
                    continue

                offers.append(
                    {
                        "product_type": "bank_cd",
                        "institution_name": institution_name,
                        "brokerage_firm": None,
                        "issuing_bank": None,
                        "term_months": term_months,
                        "apy": apy,
                        "minimum_deposit": min_dep,
                        "fdic_insured": True,
                        "source_name": "Bankrate",
                        "source_url": SOURCE_URL,
                        "destination_url": dest_url,  # may be None (that’s fine now)
                        "retrieved_at": RETRIEVED_AT,
                    }
                )

    seen = set()
    deduped = []
    for o in offers:
        k = (o["institution_name"], o["term_months"], o["apy"], o["minimum_deposit"])
        if k in seen:
            continue
        seen.add(k)
        deduped.append(o)

    out_path = "data/raw/bank_cd.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    mapped = sum(1 for o in deduped if o.get("destination_url"))
    print(f"Parsed offers: {len(deduped)}")
    print(f"Destination mapped: {mapped} (unmapped will be rejected in ingest for bank_cd)")
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()