# Strategy Engine Guide

This folder contains strategy-specific simulation logic used by the shared API endpoint:

- `POST /strategies/simulate`

Current files:

- `barbell.py`: implemented (v1)
- `ladder.py`: placeholder
- `bullet.py`: placeholder

## Why this structure

The endpoint is shared, but each strategy is isolated in its own module so multiple developers can work in parallel without changing one another's logic.

## Shared Endpoint Contract

Endpoint:

- `POST /strategies/simulate`

Request body:

```json
{
  "strategy_type": "barbell",
  "investment_amount": 10000,
  "state": "NY",
  "income_range": "$100,000 - $150,000",
  "filing_status": "single",
  "local_area": "manhattan",
  "time_horizon": "0.5",
  "liquidity_preference": "high",
  "rate_outlook": "rising"
}
```

Field notes:

- `strategy_type`: required, one of `barbell`, `ladder`, `bullet`
- `investment_amount`: required, `> 0`
- `state`: required, normalized to 2-letter code in `main.py`
- `income_range`: required
- `filing_status`: required
- `local_area`: optional
- `time_horizon`: optional, used for strategy fit warnings
- `liquidity_preference`: currently required for `barbell`
- `rate_outlook`: optional for `barbell`, defaults to `stable`

## Barbell Strategy (Implemented)

`barbell.py` provides `simulate_barbell(...)`.

Behavior:

1. Compute split with baseline `50/50`.
2. Adjust split by liquidity and rate outlook.
3. Clamp short-term allocation to `30%..70%`.
4. Rank products twice via existing engine:
   - short bucket: `6 months`
   - long bucket: `60 months`
5. Select preferred products from ranked results.
6. Compute:
   - blended APY
   - after-tax blended APY
   - nominal interest
   - after-tax interest
7. Build simulation scenarios (`rates_rise`, `rates_fall`).
8. Add warnings where relevant.

Edge handling:

- If `time_horizon < 1 year`: include warning.
- If no long-term offer: return graceful fallback suggestion to `ladder`.

## Response Shape (Barbell)

Typical success response:

```json
{
  "strategy": "barbell",
  "allocation": {
    "short_term_percentage": 70,
    "long_term_percentage": 30,
    "short_term_amount": 7000.0,
    "long_term_amount": 3000.0
  },
  "selected_products": {
    "short_term": {},
    "long_term": {}
  },
  "portfolio": {
    "blended_apy": 4.272,
    "after_tax_blended_apy": 2.9306,
    "nominal_interest_usd": 841.35,
    "after_tax_interest_usd": 577.17
  },
  "simulation": {
    "scenarios": [
      {
        "name": "rates_rise",
        "description": "...",
        "estimated_after_tax_interest_usd": 594.67
      },
      {
        "name": "rates_fall",
        "description": "...",
        "estimated_after_tax_interest_usd": 559.67
      }
    ]
  },
  "warnings": []
}
```

Fallback response (no long-term offer):

```json
{
  "strategy": "barbell",
  "fallback_strategy": "ladder",
  "message": "Long-term offers are unavailable. Consider ladder strategy for graceful degradation.",
  "allocation": {},
  "selected_products": {
    "short_term": {},
    "long_term": null
  },
  "warnings": [
    "No long-term CD data available; falling back to ladder suggestion."
  ]
}
```

## Implementing Ladder and Bullet

When implementing `ladder.py` and `bullet.py`, keep the same high-level design:

1. Validate strategy-specific inputs.
2. Reuse `RankingInput` and `rank_offers(...)` where possible.
3. Return consistent top-level keys where possible:
   - `strategy`
   - `allocation`
   - `selected_products`
   - `portfolio`
   - `simulation`
   - `warnings`
4. Prefer graceful fallback over hard failures for missing bucket data.
5. Keep tax behavior consistent with ranking engine.

Suggested module signatures:

```python
def simulate_ladder(*, data_client, investment_amount, state, income_range, filing_status, local_area, time_horizon=None, **kwargs) -> dict:
    ...

def simulate_bullet(*, data_client, investment_amount, state, income_range, filing_status, local_area, time_horizon=None, **kwargs) -> dict:
    ...
```

## Data Notes

Some preference rules (for example `no_penalty`, compounding frequency) depend on source fields. If those fields are absent in current data, strategy logic should degrade gracefully and still produce valid output.
