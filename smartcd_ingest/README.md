# SmartCD Ingestion Engine

Structured financial data ingestion pipeline for Certificates of Deposit and U.S. Treasury securities.

This system automatically collects, validates, normalizes, and stores fixed income product data with strict schema enforcement and deterministic deduplication.

---
Author -  Abhinav Ramineni 

## Overview

The engine supports three product types:

- bank_cd (Bank Certificates of Deposit)
- brokered_cd (Brokered Certificates of Deposit)
- treasury (U.S. Treasury Securities)

Data flows through a validation layer before optional database persistence.

---

## Architecture

### Data Flow

External Sources  
→ Raw HTML / JSON  
→ Parsing  
→ Validation + Normalization  
→ Deduplication (SHA256 record_hash)  
→ Clean Output  
→ Optional Supabase Insert

---

## Data Sources

### Bank CDs (Automated)

- Source: Bankrate CD rates page  
- Scraped daily → `data/raw/bankrate.html`  
- Parsed via `parse_bankrate.py`  
- Destination URLs mapped via `bank_maps.py`

---

### U.S. Treasury (Automated)

- Source: U.S. Treasury yield data  
- Scraped daily → `data/raw/treasury.html`  
- Parsed via `treasury_html_to_json.py`  
- Output → `data/raw/treasury.json`  

---

### Brokered CDs (Hybrid: Manual + Optional Automation)

- Source: Structured LLM output (Gemini)  
- Input file → `data/raw/brokered_cd.json`  
- Used in:
  - manual ingestion runs
  - optional scheduled ingestion (if automated later)

Brokerage values must strictly match:

- Fidelity  
- Charles Schwab  
- Vanguard  
- Morgan Stanley  
- E*Trade  

---

## Project Structure
smartcd_ingest/
│
├── scripts/
│   ├── run_daily_ingestion.py
│   ├── clear_data.sh
│   ├── fetch_bank_treasury.py
│   ├── fetch_brokered_cds.py
│   ├── parse_bankrate.py
│   ├── treasury_html_to_json.py
│   ├── ingest.py
│   ├── bank_maps.py
│
├── data/
│   ├── raw/
│   ├── clean/
│   ├── rejects/
│
├── requirements.txt
├── .env (not committed)
└── README.md
---

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt


Modes of Operation

1. Validation Mode (No Database)

If .env does NOT contain Supabase credentials:
python3 scripts/run_daily_ingestion.py

Behavior:
	•	Runs full pipeline
	•	Does NOT write to database
	•	Writes:
	•	data/clean/offers_clean.json
	•	data/rejects/offers_rejected.json

⸻

2. Full Production Mode

Add .env:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_TABLE=offers

Run: python3 scripts/run_daily_ingestion.py
"
Behavior:
	•	Replaces ALL products (bank + treasury + brokered)
	•	Inserts fresh daily snapshot

⸻

3. Brokered-Only Mode (Manual Override)

python3 scripts/ingest.py --mode brokered

ehavior:
	•	Deletes ONLY brokered_cd records
	•	Inserts new brokered CDs from brokered_cd.json
	•	Does NOT affect bank or treasury data

⸻

Data Replacement Strategy

This system does NOT maintain historical data.

Each run represents a fresh snapshot:

Mode- full ; Behavior- Replaces all products
Mode - brokered - Replaces only 


Validation Rules
	•	Strict product_type enforcement
	•	Allowed terms only: 3, 6, 12, 24, 60
	•	APY must be numeric
	•	FDIC rules enforced
	•	No callable / structured / secondary products
	•	No missing required fields
	•	Treasury always non-FDIC
	•	Brokered must be FDIC

⸻

Deduplication

Each record generates a SHA256 record_hash using:
	•	product_type
	•	institution_name
	•	brokerage_firm
	•	issuing_bank
	•	term_months
	•	apy
	•	minimum_deposit
	•	fdic_insured
	•	source_url
	•	destination_url
	•	retrieved_at

Ensures deterministic inserts.

⸻

Bank CD URL Enforcement
	•	Destination URL must map to official bank site
	•	If fallback to source occurs → record rejected
	•	Fix via bank_maps.py

⸻

Automated Daily Pipeline

python3 scripts/run_daily_ingestion.py

Steps executed:
	1.	Clear previous raw files
	2.	Fetch Bankrate HTML
	3.	Fetch Treasury HTML
	4.	Fetch brokered placeholder (or real data later)
	5.	Parse bank CDs
	6.	Parse treasury
	7.	Validate + normalize
	8.	Insert (if credentials present)

⸻

Deployment (Render)

Build Command

pip install -r requirements.txt

Start Command (Scheduled Job / Worker)

python scripts/run_daily_ingestion.py

Environment Variables

Set in Render dashboard:
	•	SUPABASE_URL
	•	SUPABASE_SERVICE_ROLE_KEY
	•	SUPABASE_TABLE

⸻

Notes
	•	.env must NEVER be committed
	•	Always test in validation mode first
	•	Brokered CDs can be updated independently
	•	Pipeline supports future LLM automation but does NOT depend on it

⸻

Current Capabilities
	•	Fully automated daily ingestion (bank + treasury)
	•	Hybrid ingestion for brokered CDs
	•	Deterministic data replacement
	•	Strict validation layer
	•	Clean separation from ranking engine
	•	Production-ready for scheduled deployment

⸻

Quick Start
# Install
python3 -m pip install -r requirements.txt

# Run pipeline (validation)
python3 scripts/run_daily_ingestion.py

# Run brokered-only update
python3 scripts/ingest.py --mode brokered


