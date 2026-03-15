# SmartCD Ranking Engine API

## Overview

SmartCD Ranking Engine is a FastAPI service that ranks investment products based on **after-tax return**, not just nominal APY.

Instead of showing only the highest listed rate, this engine adjusts for:

- federal tax
- state tax
- local tax
- treasury tax treatment differences

This makes the ranking more realistic for end users, especially in high-tax states and cities.

The service is designed to support SmartCD frontend experiences where users enter their investment preferences and receive:

- top bank CDs
- top brokered CDs
- top treasury options
- top 5 overall ranked products

---

## What the API Does

The ranking engine accepts user inputs such as:

- investment amount
- term in months
- state
- income range
- filing status
- local area

Using those inputs, it:

1. fetches matching offers from Supabase
2. fetches the appropriate federal tax bracket
3. fetches the appropriate state tax bracket
4. fetches local tax if applicable
5. computes after-tax yield and interest
6. ranks products based on actual after-tax return
7. returns structured JSON for frontend consumption

---

## Tech Stack

- Python
- FastAPI
- Uvicorn
- Supabase
- Pydantic
- Requests
- HTTPX
- Python Dotenv

Deployment target:

- Render

---

## Project Structure

```text
ranking-engine/
├── __init__.py
├── main.py
├── engine.py
├── data.py
├── tax.py
├── demo.py
├── requirements.txt
└── README.md

Core Files

main.py

API entry point.

Responsibilities:
	•	initializes FastAPI
	•	defines routes
	•	handles request and response models
	•	exposes /, /health, /docs, and /rank

engine.py

Core ranking logic.

Responsibilities:
	•	computes after-tax APY
	•	computes nominal and after-tax interest
	•	applies treasury tax treatment
	•	ranks all products
	•	separates results into categories

data.py

Supabase data access layer.

Responsibilities:
	•	fetches offers
	•	fetches federal tax rates
	•	fetches state tax rates
	•	fetches local tax rates
	•	normalizes filing status handling
	•	caches tax lookups and offer lookups in memory

tax.py

Tax support logic.

Responsibilities:
	•	income parsing
	•	rate support
	•	tax-related helper calculations

demo.py

Local testing script for quick validation and debugging.

⸻

Features
	•	ranks by after-tax APY
	•	supports:
	•	bank CDs
	•	brokered CDs
	•	treasuries
	•	federal, state, and local tax aware
	•	treasury state/local exemption handled
	•	returns grouped and overall ranked results
	•	simple in-memory caching for:
	•	federal tax lookups
	•	state tax lookups
	•	local tax lookups
	•	offer lookups by term

⸻

Input Schema

POST /rank

Request body:
{
  "investment_amount": 50000,
  "term_months": 12,
  "state": "NY",
  "income_range": "$100,000 - $150,000",
  "filing_status": "single",
  "local_area": "manhattan"
}
ield Details
	•	investment_amount → dollar amount user plans to invest
	•	term_months → desired maturity term
	•	state → two-letter state code
	•	income_range → income band used to estimate income for tax calculation
	•	filing_status → single, joint, or hoh
	•	local_area → city or county if local taxes apply

⸻

Output Schema

The API returns four main sections:
	•	bank_cds
	•	brokered_cds
	•	treasuries
	•	overall_top

Example structure:
{
  "bank_cds": [...],
  "brokered_cds": [...],
  "treasuries": [...],
  "overall_top": [...]
}

Each product includes fields like:
	•	product type
	•	institution name
	•	brokerage firm if applicable
	•	term
	•	nominal APY
	•	after-tax APY
	•	minimum deposit
	•	source URL
	•	destination URL
	•	FDIC status
	•	nominal interest in dollars
	•	after-tax interest in dollars
	•	applied federal tax rate
	•	applied state tax rate
	•	applied local tax rate
	•	overall rank where applicable

⸻

Ranking Logic

Products are ranked by after-tax return, not nominal APY.

General flow
	1.	fetch offers for selected term
	2.	estimate user income from income range
	3.	determine tax rates:
	•	federal
	•	state
	•	local
	4.	apply tax treatment:
	•	bank CDs and brokered CDs use federal + state + local
	•	treasuries use federal only for interest tax treatment
	5.	compute:
	•	nominal interest
	•	after-tax interest
	•	after-tax APY
	6.	sort descending by best after-tax outcome

⸻

Tax Handling Rules

Federal

Federal tax depends on:
	•	estimated income
	•	filing status

State

State tax depends on:
	•	state
	•	estimated income
	•	filing status

Local

Local tax depends on:
	•	state
	•	city or county match from local_area

Head of Household

Policy used in this engine:
	•	federal treats hoh separately
	•	state and local treat hoh as single

Treasuries

Treasury interest is treated as:
	•	taxable at federal level
	•	exempt from state and local taxes

⸻

In-Memory Caching

This project includes lightweight in-memory caching to reduce repeated Supabase calls.

Cached items:
	•	offers by term_months
	•	federal marginal tax lookup
	•	state marginal tax lookup
	•	local tax lookup

This improves performance for repeated ranking requests within the same running service instance.

Note:
	•	cache resets when Render restarts the instance
	•	cache resets after a new deploy
	•	cache resets when a free instance spins down

    Environment Variables

This service expects environment variables for Supabase access.

Typical variables:
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEBUG_TAX=0
Important

Do not commit real .env files to GitHub.

Recommended:
	•	keep .env local only
	•	commit .env.example
	•	configure production values in Render dashboard

⸻

Example .env.example
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=


Installation

1. Clone the repository
git clone https://github.com/Sylv1011/smart-cd-ai.git
cd smart-cd-ai/ranking-engine
2. Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate
3. Install dependencies
pip install -r requirements.txt
4. Create a local .env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

5. Start the API
uvicorn main:app --reload

Local Endpoints

Once running locally:
	•	Root: http://127.0.0.1:8000/
	•	Health: http://127.0.0.1:8000/health
	•	Swagger Docs: http://127.0.0.1:8000/docs
	•	Rank Endpoint: http://127.0.0.1:8000/rank

⸻

Example Curl Request
curl -X POST http://127.0.0.1:8000/rank \
-H "Content-Type: application/json" \
-d '{
  "investment_amount": 50000,
  "term_months": 12,
  "state": "NY",
  "income_range": "$100,000 - $150,000",
  "filing_status": "single",
  "local_area": "manhattan"
}'

Example Production Curl Request
curl -X POST https://smart-cd-ai.onrender.com/rank \
-H "Content-Type: application/json" \
-d '{
  "investment_amount": 50000,
  "term_months": 12,
  "state": "NY",
  "income_range": "$100,000 - $150,000",
  "filing_status": "single",
  "local_area": "manhattan"
}'

Example Root Response
{
  "name": "SmartCD Ranking API",
  "version": "1.0",
  "status": "ok",
  "health": "/health",
  "docs": "/docs",
  "rank": "/rank"
}

Example Health Response
{
  "status": "ok"
}

Frontend Integration Guide

Frontend only needs to call one endpoint:

Endpoint
POST /rank

Required payload
{
  "investment_amount": 50000,
  "term_months": 12,
  "state": "NY",
  "income_range": "$100,000 - $150,000",
  "filing_status": "single",
  "local_area": "manhattan"
}
Frontend should display
	•	Top Bank CDs
	•	Top Brokered CDs
	•	Top Treasuries
	•	Top 5 Overall

Example frontend fetch
const response = await fetch("https://smart-cd-ai.onrender.com/rank", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    investment_amount: 50000,
    term_months: 12,
    state: "NY",
    income_range: "$100,000 - $150,000",
    filing_status: "single",
    local_area: "manhattan"
  })
})

const data = await response.json()
console.log(data)

Deployment on Render

This service is deployed as a Python web service on Render.

Recommended Render Settings

Root Directory: ranking-engine
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port 10000
