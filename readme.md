# SmartCD AI Layer

This service adds an AI explanation layer on top of the SmartCD ranking engine.

It does not compute rankings or financial returns itself.

The ranking engine remains the source of truth.
This AI layer only explains ranking results and answers user questions using the structured ranking response.

---

## What this service does

The AI layer provides two main capabilities:

1. Top product explanations
   It generates "Why this Fits" explanations for the top-ranked products returned by the ranking engine.

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
POST /explain-top-3 or /chat
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

POST /explain-top-3

Generates structured “Why this Fits” explanations for the top-ranked products.

Request body:
{
  "ranking_response": {
    "overall_top": []
  }
}

Response example:
{
  "products": [
    {
      "rank_overall": 1,
      "title": "E*TRADE 12-Month CD",
      "why_this_fits": "This CD ranks first because it delivers the strongest after-tax return in the current results.",
      "highlights": [
        "Top after-tax return",
        "FDIC insured",
        "No minimum deposit"
      ]
    }
  ]
}

POST /chat

Answers a user question using the full ranking response as context.

Request body:
{
  "question": "Why is E*TRADE ranked first?",
  "ranking_response": {
    "bank_cds": [],
    "brokered_cds": [],
    "treasuries": [],
    "overall_top": []
  }
}

Response example:
{
  "response": "E*TRADE is ranked first because it delivers the highest after-tax return among the products in the current results."
}

Prompt design

This project uses prompt constraints to keep the model grounded.

The prompts enforce that the AI layer:
	•	uses only the ranking response
	•	does not recompute rankings
	•	does not introduce outside information
	•	does not provide financial advice
	•	explains products in natural language