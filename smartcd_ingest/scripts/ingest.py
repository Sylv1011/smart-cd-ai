# scripts/ingest.py
import argparse
import hashlib
import json
import os
import re
from datetime import datetime
from urllib.parse import urlparse

from dotenv import load_dotenv

try:
    from supabase import create_client  # type: ignore
except Exception:
    create_client = None

from bank_maps import BANK_DEST_URL_MAP, canonical_bank_key  # unified bank map


# ---------------- config ----------------
ALLOWED_PRODUCT_TYPES = {"bank_cd", "brokered_cd", "treasury"}
ALLOWED_TERM_MONTHS = {3, 6, 9, 12, 18, 24, 36, 48, 60}

APY_MIN = 0.01
APY_MAX = 15.0

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

RAW_FILES = [
    ("bank_cd", "data/raw/bank_cd.json"),
    ("brokered_cd", "data/raw/brokered_cd.json"),
    ("treasury", "data/raw/treasury.json"),
]

CLEAN_OUT = "data/clean/offers_clean.json"
REJECT_OUT = "data/rejects/offers_rejected.json"

SKIP_CALLABLE_FIELD = True

TREASURY_DESTINATION_URL = "https://www.treasurydirect.gov/marketable-securities/"


# ---------------- name normalization (brokerages) ----------------
def _norm_name(s: str) -> str:
    s = (s or "").strip().lower()
    s = s.replace("&", "and")
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


BROKER_NAME_ALIASES = {
    _norm_name("ETRADE"): _norm_name("E*Trade"),
    _norm_name("E TRADE"): _norm_name("E*Trade"),
    _norm_name("E*TRADE"): _norm_name("E*Trade"),
    _norm_name("Charles Schwab"): _norm_name("Schwab"),
    _norm_name("Charles Schwab & Co."): _norm_name("Schwab"),
}

def _canonical_broker_key(name: str) -> str:
    n = _norm_name(name)
    return BROKER_NAME_ALIASES.get(n, n)


BROKERAGE_URL_MAP_RAW = {
    "Fidelity": "https://fixedincome.fidelity.com/ftgw/fi/FILanding",
    "Schwab": "https://www.schwab.com/brokerage",
    "Vanguard": "https://investor.vanguard.com/investment-products/cds",
    "Morgan Stanley": "https://www.morganstanley.com/what-we-do/wealth-management/cd-savings",
    "E*Trade": "https://us.etrade.com/what-we-offer/pricing-and-rates?icid=et-brokerage_pricingbanner_see-all",
}
BROKERAGE_URL_MAP = {_norm_name(k): v for k, v in BROKERAGE_URL_MAP_RAW.items()}


def _maybe_copy_with(r: dict, **updates) -> dict:
    if not updates:
        return r
    out = dict(r)
    out.update(updates)
    return out


# ---------------- helpers ----------------
def _is_valid_date(s: str) -> bool:
    if not isinstance(s, str) or not DATE_RE.match(s):
        return False
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def _is_valid_url(u: str) -> bool:
    try:
        p = urlparse(u)
        return p.scheme in {"http", "https"} and bool(p.netloc)
    except Exception:
        return False


def _to_number(x):
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    if isinstance(x, str):
        s = x.strip().replace("%", "")
        try:
            return float(s)
        except ValueError:
            return None
    return None


def _record_hash(r: dict) -> str:
    key_fields = [
        r.get("product_type"),
        r.get("institution_name"),
        r.get("brokerage_firm"),
        r.get("issuing_bank"),
        r.get("term_months"),
        r.get("apy"),
        r.get("minimum_deposit"),
        r.get("fdic_insured"),
        r.get("source_url"),
        r.get("destination_url"),
        r.get("retrieved_at"),
    ]
    raw = json.dumps(key_fields, sort_keys=False, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _fill_urls_best_effort(r: dict, flags: list[str]) -> dict:
    pt = r.get("product_type")

    # ---- source_url fill (best-effort) ----
    if not r.get("source_url"):
        if pt == "brokered_cd":
            bf = r.get("brokerage_firm")
            if isinstance(bf, str) and bf.strip():
                key = _canonical_broker_key(bf)
                url = BROKERAGE_URL_MAP.get(key)
                if url:
                    r = _maybe_copy_with(r, source_url=url)
                    flags.append("source_url_filled_from_brokerage_map")
                else:
                    flags.append("brokerage_firm_unknown_for_source_url")
            else:
                flags.append("brokerage_firm_missing_for_source_url")

        elif pt == "bank_cd":
            inst = r.get("institution_name")
            if isinstance(inst, str) and inst.strip():
                # For bank_cd, we only have ONE unified map: BANK_DEST_URL_MAP
                url = BANK_DEST_URL_MAP.get(canonical_bank_key(inst))
                if url:
                    r = _maybe_copy_with(r, source_url=url)
                    flags.append("source_url_filled_from_bank_map")
                else:
                    flags.append("institution_unknown_for_source_url")
            else:
                flags.append("institution_missing_for_source_url")

    # ---- destination_url fill ----
    if not r.get("destination_url"):
        dest = None

        if pt == "treasury":
            dest = TREASURY_DESTINATION_URL
            flags.append("destination_url_filled_treasurydirect_marketable")

        elif pt == "brokered_cd":
            bf = r.get("brokerage_firm")
            if isinstance(bf, str) and bf.strip():
                key = _canonical_broker_key(bf)
                dest = BROKERAGE_URL_MAP.get(key)
                if dest:
                    flags.append("destination_url_filled_from_brokerage_map")

        elif pt == "bank_cd":
            inst = r.get("institution_name")
            if isinstance(inst, str) and inst.strip():
                dest = BANK_DEST_URL_MAP.get(canonical_bank_key(inst))
                if dest:
                    flags.append("destination_url_filled_from_bank_map")

        if dest and _is_valid_url(dest):
            r = _maybe_copy_with(r, destination_url=dest)
        else:
            # IMPORTANT RULE CHANGE:
            # bank_cd must NOT fallback destination_url -> source_url.
            # If we cannot map a real bank destination page, we keep it missing and let validation reject it.
            if pt == "bank_cd":
                flags.append("bank_cd_destination_url_missing")
            else:
                su = r.get("source_url")
                if isinstance(su, str) and _is_valid_url(su):
                    r = _maybe_copy_with(r, destination_url=su)
                    flags.append("destination_url_filled_from_source_url")
                else:
                    flags.append("destination_url_missing")

    return r


def _validate_and_normalize(r: dict):
    reasons = []
    flags: list[str] = []

    if not isinstance(r, dict):
        return None, ["record_not_object"], []

    pt = r.get("product_type")
    if pt not in ALLOWED_PRODUCT_TYPES:
        reasons.append("invalid_product_type")

    r = _fill_urls_best_effort(r, flags)

    term = r.get("term_months")
    if not isinstance(term, int) or term not in ALLOWED_TERM_MONTHS:
        reasons.append("invalid_term_months")

    apy = _to_number(r.get("apy"))
    if apy is None:
        reasons.append("apy_not_numeric")
    elif not (APY_MIN <= apy <= APY_MAX):
        reasons.append("apy_out_of_range")

    source_url = r.get("source_url")
    if pt in {"bank_cd", "treasury"}:
        if not isinstance(source_url, str) or not _is_valid_url(source_url):
            reasons.append("invalid_source_url")
    else:
        if source_url is None:
            flags.append("source_url_missing")
        elif not isinstance(source_url, str) or not _is_valid_url(source_url):
            reasons.append("invalid_source_url")

    destination_url = r.get("destination_url")

    # NEW RULE: bank_cd must have a real destination_url (not source fallback)
    if pt == "bank_cd":
        if not isinstance(destination_url, str) or not _is_valid_url(destination_url):
            reasons.append("bank_cd_missing_destination_url")

    # For non-bank types, destination_url must be valid if present
    if pt != "bank_cd" and destination_url is not None:
        if not isinstance(destination_url, str) or not _is_valid_url(destination_url):
            reasons.append("invalid_destination_url")

    retrieved_at = r.get("retrieved_at")
    if not _is_valid_date(retrieved_at):
        reasons.append("invalid_retrieved_at")

    fdic = r.get("fdic_insured")
    if not isinstance(fdic, bool):
        reasons.append("fdic_insured_not_bool")

    if pt in {"bank_cd", "brokered_cd"}:
        if fdic is not True:
            reasons.append("cd_not_fdic_true")

    if pt == "treasury":
        if fdic is not False:
            reasons.append("treasury_fdic_must_be_false")
        if r.get("institution_name") != "U.S. Treasury":
            reasons.append("treasury_institution_name_must_be_us_treasury")

    min_dep = _to_number(r.get("minimum_deposit"))
    if min_dep is None and pt in {"bank_cd", "brokered_cd"}:
        flags.append("minimum_deposit_missing")
    if min_dep is not None and min_dep < 0:
        reasons.append("minimum_deposit_negative")

    if not isinstance(r.get("source_name"), str) or not r.get("source_name").strip():
        reasons.append("missing_source_name")

    if reasons:
        return None, reasons, flags

    normalized = {
        "product_type": pt,
        "institution_name": r.get("institution_name"),
        "brokerage_firm": r.get("brokerage_firm"),
        "issuing_bank": r.get("issuing_bank"),
        "term_months": term,
        "apy": float(apy),
        "minimum_deposit": float(min_dep) if min_dep is not None else None,
        "fdic_insured": fdic,
        "source_name": r.get("source_name"),
        "source_url": source_url,
        "destination_url": destination_url,
        "retrieved_at": retrieved_at,
    }

    normalized["record_hash"] = _record_hash(normalized)
    normalized["flags"] = flags
    return normalized, [], flags


def _load_json_array(path: str) -> list:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing raw file: {path}")

    with open(path, "r", encoding="utf-8") as f:
        raw = f.read().strip()

    if not raw:
        raise ValueError(f"{path} is empty. Paste a JSON array into this file.")

    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError(f"{path} must be a JSON array (top-level list).")

    return data


def _summarize(clean, rejected):
    by_type = {}
    for r in clean:
        by_type[r["product_type"]] = by_type.get(r["product_type"], 0) + 1

    reason_counts = {}
    for rr in rejected:
        for reason in rr.get("reasons", []):
            reason_counts[reason] = reason_counts.get(reason, 0) + 1

    flag_counts = {}
    for r in clean:
        for fl in r.get("flags", []):
            flag_counts[fl] = flag_counts.get(fl, 0) + 1

    print("\n--- SUMMARY ---")
    print(f"Clean records: {len(clean)}")
    print(f"Rejected records: {len(rejected)}")
    print(f"By product_type: {by_type}")
    if flag_counts:
        print(f"Flags (non-blocking): {flag_counts}")
    if reason_counts:
        top10 = dict(sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:10])
        print(f"Top reject reasons: {top10}")
    print("---------------\n")


def main():
    load_dotenv()

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["full", "brokered"], default="full")
    args = parser.parse_args()
    mode = args.mode

    print(f"Running ingestion mode: {mode}")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    table = os.getenv("SUPABASE_TABLE", "offers")

    supabase_mode = bool(supabase_url and supabase_key and create_client is not None)
    if not supabase_mode:
        print("No Supabase creds found (or supabase lib missing). Running validation-only mode.")

    clean = []
    rejected = []

    files_to_process = RAW_FILES if mode == "full" else [("brokered_cd", "data/raw/brokered_cd.json")]

    for expected_type, path in files_to_process:
        records = _load_json_array(path)

        for record in records:
            if SKIP_CALLABLE_FIELD and isinstance(record, dict) and "callable" in record:
                record = dict(record)
                record.pop("callable", None)

            normalized, reasons, flags = _validate_and_normalize(record)

            if normalized is None:
                rejected.append(
                    {
                        "raw": record,
                        "reasons": reasons,
                        "flags": flags,
                        "source_file": path,
                    }
                )
                continue

            if normalized["product_type"] != expected_type:
                rejected.append(
                    {
                        "raw": record,
                        "reasons": ["product_type_mismatch_for_file"],
                        "flags": flags,
                        "source_file": path,
                    }
                )
                continue

            clean.append(normalized)

    dedup = {record["record_hash"]: record for record in clean}
    clean = list(dedup.values())

    os.makedirs(os.path.dirname(CLEAN_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(REJECT_OUT), exist_ok=True)

    with open(CLEAN_OUT, "w", encoding="utf-8") as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)

    with open(REJECT_OUT, "w", encoding="utf-8") as f:
        json.dump(rejected, f, ensure_ascii=False, indent=2)

    _summarize(clean, rejected)

    print(f"Wrote: {CLEAN_OUT}")
    print(f"Wrote: {REJECT_OUT}")

    if not supabase_mode:
        return

    sb = create_client(supabase_url, supabase_key)
    db_rows = [{k: v for k, v in record.items() if k != "flags"} for record in clean]

    if not db_rows:
        print("No valid rows to write to database.")
        return

    if mode == "full":
        if len(db_rows) < 5:
            raise RuntimeError("Too few valid records. Aborting full refresh.")

        # delete only product types we are refreshing
        product_types = list({row["product_type"] for row in db_rows})

        print(f"Refreshing {table} for product_types={product_types}...")

        for pt in product_types:
            sb.table(table).delete().eq("product_type", pt).execute()

        sb.table(table).insert(db_rows).execute()
        print(f"Inserted {len(db_rows)} row(s) into {table}.")
        return

    # Replace brokered CDs instead of upserting (no historical data)
    print(f"Refreshing {table} for product_type=brokered_cd...")

    sb.table(table).delete().eq("product_type", "brokered_cd").execute()
    sb.table(table).insert(db_rows).execute()

    print(f"Replaced {len(db_rows)} brokered row(s) into {table}.")


if __name__ == "__main__":
    main()