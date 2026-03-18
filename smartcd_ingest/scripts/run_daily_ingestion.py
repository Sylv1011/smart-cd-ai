import subprocess
import sys
import logging
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
    try:
        logger.info(f"\n➡️  Starting: {step_name}")
        logger.info("Command: %s", " ".join(str(part) for part in cmd))
        subprocess.run(cmd, check=True, cwd=BASE_DIR)
        logger.info(f"✅ Completed: {step_name}")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed: {step_name}")
        raise e


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

    logger.info("\n========== DAILY INGESTION COMPLETE ==========")