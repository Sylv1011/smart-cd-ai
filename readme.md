SmartCD Ranking Engine

A FastAPI powered ranking engine that evaluates bank CDs, brokered CDs, and U.S. Treasuries and ranks them based on after tax return for a specific investor profile.

The system pulls financial product data from Supabase, applies federal, state, and local tax rules, computes expected interest earnings, and returns structured ranked investment options through a REST API.

This project is part of the SmartCD AI platform.


⸻

Features

• Tax aware ranking engine
• Federal + State + Local tax modeling
• Treasury state/local tax exemption handling
• Supports multiple product types
• Deterministic ranking algorithm
• FastAPI REST API
• Supabase data source
• Ready for cloud deployment (Render / Railway)

⸻

API Output

The engine returns structured results including:

Top Products By Category
top 10 bank CDs
top 10 brokered CDs
top treasury

Overall Ranking
top 5 overall products
full ranked list

Example API Response Structure
{
  "input": {...},
  "tax_context": {...},

  "bank_cds": [...],
  "brokered_cds": [...],
  "treasuries": [...],

  "overall_top": [...],

  "all_products": [...],
  "all_ranked": [...]
}