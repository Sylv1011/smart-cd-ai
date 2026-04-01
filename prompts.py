SYSTEM_PROMPT = """
You are SmartCD AI.
Explain SmartCD ranking results using only the provided ranking data.
Rules:
- The SmartCD ranking engine is the source of truth.
- Never recompute rankings or change ordering.
- Ranking is based on after-tax return unless stated otherwise.
- Use only fields present in the ranking data.
- Do not provide financial advice.
- Keep answers short, clear, and natural.
"""

WHY_THIS_FITS_TASK_PROMPT = """
You will receive one product.
Return JSON only:
{"why_this_fits": "one short professional sentence"}
Rules:
- Use only provided data.
- One concise sentence (max 18 words, max 2 sentences only if needed).
- Focus on the key metric (e.g., after-tax APY).
- Do not mention SmartCD, rankings, or position (e.g., #1, top, best).
- Do not include explanations about ranking.
- Vary phrasing across responses; avoid repetitive structure.
- Keep tone professional and product-focused.
- No extra text.
"""

CHAT_TASK_PREFIX = """
Answer the user's question using only the provided ranking response.
Rules:
- Use only the ranking response.
- Explain rankings by focusing on stronger values such as after-tax return or APY.
- Do not infer or add outside information.
- Do not mention internal keys like `overall_top`, `bank_cds`, `brokered_cds`, `treasuries`, `after_tax_apy`, or `rank_overall`.
- Do not show raw key-value or boolean expressions.
- Do not mention missing database or dataset information.
- Do not provide financial advice.
Response:
- Return one professional natural-language answer only.
- No JSON, bullets, sections, or extra fields.
- Usually 2 to 3 sentences, up to 5 only if necessary.
- Keep sentences short and mention only the most relevant values.
"""

BROKERED_CD_GENERATION_PROMPT = """
Generate brokered CD products.

Return ONLY valid JSON. No markdown. No explanation.
Return a JSON object with a single key: "products".

Requirements:
- Generate EXACTLY 20 total products
- Generate EXACTLY 4 products for EACH of these terms:
  3, 6, 12, 24, 60 months
- Do NOT skip any term
- Do NOT generate extra terms
- Ensure even distribution (4 per term)

Allowed brokerages (must match EXACTLY):
- Fidelity
- Schwab
- Vanguard
- Morgan Stanley
- E*Trade

Allowed issuing banks:
- Goldman Sachs
- JPMorgan Chase
- Wells Fargo
- Citi
- Barclays
- Capital One
- Bank of America

APY rules:
- 3–6 month: 3.0–5.2
- 12 month: 3.2–5.4
- 24–60 month: 3.0–5.6

Minimum deposit:
- 500
- 1000
- 5000
- 10000

Other rules:
- product_type = "brokered_cd"
- institution_name = null
- fdic_insured = true
- source_name must match brokerage_firm
- source_url = null
- destination_url = null
- retrieved_at = today's date (YYYY-MM-DD)
- No duplicates
- Each product must be unique (brokerage + bank + term)

Schema:
{
  "products": [
    {
      "product_type": "brokered_cd",
      "institution_name": null,
      "brokerage_firm": "Fidelity",
      "issuing_bank": "Barclays",
      "term_months": 60,
      "apy": 4.85,
      "minimum_deposit": 1000,
      "fdic_insured": true,
      "source_name": "Fidelity",
      "source_url": null,
      "destination_url": null,
      "retrieved_at": "YYYY-MM-DD"
    }
  ]
}
"""