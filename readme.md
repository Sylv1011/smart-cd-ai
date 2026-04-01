# SmartCD AI Layer

This service adds an AI explanation layer on top of the SmartCD ranking engine.

It does not compute rankings or financial returns itself.

The ranking engine remains the source of truth.
This AI layer only explains ranking results and answers user questions using the structured ranking response.

---

## What this service does

The AI layer provides two main capabilities:

1. Product-level explanations
   Generates a short "Why this fits" explanation for a selected product.

2. Chatbot responses
   It answers user questions about ranked products using the ranking response as context.

Examples:
- Why is E*TRADE ranked first?
- Why is the Treasury below the top CD?
- Which option has the best after-tax return?
- What is the tradeoff between brokered CDs and bank CDs?

---

## Architecture

Frontend
↓
POST /rank
↓
Ranking Engine
↓
ranking_response
↓
POST /explain-why-this-fits or /chat/stream
↓
SmartCD AI Layer
↓
GPT-5 mini
↓
Explanation / chatbot response

The ranking engine determines:
- product ordering
- tax-adjusted return
- after-tax APY
- after-tax interest

The AI layer only explains those results in natural language.

---

## Tech stack

- Python
- FastAPI
- Uvicorn
- OpenAI API
- Pydantic
- python-dotenv

---

## Project structure

```bash
smartcd_ai_layer/
├── main.py
├── ai_service.py
├── prompts.py
├── requirements.txt
└── README.md


Setup

1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

2. Install dependencies
pip install -r requirements.txt

3. Create a .env file
OPENAI_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-5-mini


Run locally
python3 -m uvicorn main:app --reload --port 8001

Open Swagger UI:
http://127.0.0.1:8001/docs

API endpoints

GET /health

Health check endpoint.

Example response:{
  "status": "ok"
}

POST /explain-why-this-fits

Generates a short "Why this fits" explanation for a selected product.

Request body:
{
  "product_type": "bank_cd",
  "institution_name": "Ally Bank",
  "term_months": 12,
  "apy_nominal": 4.5,
  "after_tax_apy": 3.2,
  "minimum_deposit": 0,
  "after_tax_interest_usd": 1600,
  "fdic_insured": true,
  "rank_overall": 1
}

Response example:
{
  "why_this_fits": "Highest after-tax APY at 3.2% for this term."
}

POST /chat/stream

Streams a chatbot response using the ranking response as context.

Request body:
{
  "question": "Why is Ally Bank ranked first?",
  "ranking_response": {
    "bank_cds": [],
    "brokered_cds": [],
    "treasuries": [],
    "overall_top": []
  }
}

Response:
Plain text streamed progressively (chunked response).

Prompt design

This project uses prompt constraints to keep the model grounded.

The prompts enforce that the AI layer:
	•	uses only the ranking response
	•	does not recompute rankings
	•	does not introduce outside information
	•	does not provide financial advice
	•	explains products in natural language