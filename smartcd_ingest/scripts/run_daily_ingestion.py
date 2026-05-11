import subprocess
import sys
import logging
import os
import time
import json
import urllib.request
from pathlib import Path

# --- logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("daily_ingestion")

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"


def run(cmd, step_name):
    """
    Runs a command from the project root and logs success/failure clearly.
    """
    max_retries = int(os.getenv("INGEST_STEP_RETRIES", "3"))
    backoff_base = float(os.getenv("INGEST_BACKOFF_BASE", "1"))

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"\n➡️  Starting: {step_name} (attempt {attempt}/{max_retries})")
            logger.info("Command: %s", " ".join(str(part) for part in cmd))
            subprocess.run(cmd, check=True, cwd=BASE_DIR)
            logger.info(f"✅ Completed: {step_name} (attempt {attempt})")
            return
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed: {step_name} (attempt {attempt}) -> {e}")
            if attempt == max_retries:
                # final failure — notify via webhook if configured, then raise
                send_alert(f"Ingestion step failed: {step_name} after {max_retries} attempts. Error: {e}")
                raise
            else:
                # exponential backoff
                wait = backoff_base * (attempt ** 2)
                logger.info(f"Retrying in {wait:.1f}s...")
                time.sleep(wait)


def send_alert(message: str):
    """Send a simple alert to a configured webhook and log the message."""
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


if __name__ == "__main__":
    logger.info("\n========== DAILY INGESTION PIPELINE START ==========")
    logger.info("Project root: %s", BASE_DIR)

    # 1. Clear existing raw/clean/reject files
    run(["bash", str(SCRIPTS_DIR / "clear_data.sh")], "Clear data")

    # 2. Fetch fresh data (Bank + Treasury)
    run([sys.executable, str(SCRIPTS_DIR / "fetch_bank_treasury.py")], "Fetch bank + treasury data")

    # 3. (Optional) Fetch brokered CDs automatically
    run([sys.executable, str(SCRIPTS_DIR / "fetch_brokered_cds.py")], "Fetch brokered CDs")

    # 4. Parse raw data
    run([sys.executable, str(SCRIPTS_DIR / "parse_bankrate.py")], "Parse bankrate HTML")
    run([sys.executable, str(SCRIPTS_DIR / "treasury_html_to_json.py")], "Parse treasury HTML")

    # 5. Run ingestion (full refresh)
    run([sys.executable, str(SCRIPTS_DIR / "ingest.py"), "--mode", "full"], "Ingest into database")
    # 6. Freshness validation + alerts
    run([sys.executable, str(SCRIPTS_DIR / "freshness_check.py")], "Freshness check")

    logger.info("\n========== DAILY INGESTION COMPLETE ==========")