import os
import logging
from datetime import datetime, timedelta
import json
import urllib.request

try:
    from supabase import create_client  # type: ignore
except Exception:
    create_client = None

logger = logging.getLogger("freshness_check")
logging.basicConfig(level=logging.INFO)


def send_alert(message: str):
    webhook = os.getenv("MONITOR_WEBHOOK_URL")
    logger.error(message)
    if not webhook:
        logger.info("No MONITOR_WEBHOOK_URL configured; skipping webhook notification")
        return
    payload = json.dumps({"text": message}).encode("utf-8")
    try:
        req = urllib.request.Request(webhook, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info(f"Sent alert webhook, status={resp.status}")
    except Exception as ex:
        logger.exception("Failed to send alert webhook: %s", ex)


def iso_to_date(dstr: str):
    try:
        return datetime.strptime(dstr, "%Y-%m-%d").date()
    except Exception:
        return None


def main():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    table = os.getenv("SUPABASE_TABLE", "offers")
    threshold_days = int(os.getenv("FRESHNESS_THRESHOLD_DAYS", "2"))

    if not supabase_url or not supabase_key or create_client is None:
        logger.warning("Supabase client not available or credentials missing; skipping freshness check")
        return

    sb = create_client(supabase_url, supabase_key)

    # Pull retrieved_at values for product types
    resp = sb.table(table).select("product_type,retrieved_at").execute()
    if resp.error:
        send_alert(f"Freshness check failed to query table {table}: {resp.error}")
        return

    rows = resp.data or []
    latest = {}
    for r in rows:
        pt = r.get("product_type")
        rt = r.get("retrieved_at")
        if not pt or not rt:
            continue
        d = iso_to_date(rt)
        if d is None:
            continue
        if pt not in latest or d > latest[pt]:
            latest[pt] = d

    now = datetime.utcnow().date()
    stale = []
    for pt, d in latest.items():
        delta = (now - d).days
        if delta > threshold_days:
            stale.append((pt, d.isoformat(), delta))

    if stale:
        msg = "Freshness alert: stale sources detected: " + ", ".join([f"{pt} (last={dt}, days_behind={days})" for pt, dt, days in stale])
        send_alert(msg)
        raise SystemExit(2)

    logger.info("Freshness check passed for all product types")


if __name__ == "__main__":
    main()
