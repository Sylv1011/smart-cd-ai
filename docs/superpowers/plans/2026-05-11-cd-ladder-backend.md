# CD Ladder Backend Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /api/v1/strategy/ladder` to the main FastAPI backend (`api/`) that accepts user investment inputs, builds a staggered CD ladder across multiple maturity terms, applies tax calculations, and returns a structured response with blended after-tax APY and per-rung CD recommendations.

**Architecture:** Pure ladder logic lives in `api/ladder.py` (no DB/HTTP dependencies — fully unit-testable). The endpoint handler in `api/index.py` resolves tax rates using existing helpers, then delegates to `ladder.py`. Test infrastructure uses an in-memory SQLite DB seeded with deterministic fake offers so tests never need a real database.

**Tech Stack:** Python 3.9+, FastAPI, SQLAlchemy 2.0, Pydantic 2.x, pytest, httpx (FastAPI TestClient)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `api/ladder.py` | **Create** | All ladder business logic: weight calculation, CD selection per rung, blended APY, `build_ladder()` assembler |
| `api/schemas.py` | **Modify** | Add `LadderRequest`, `LadderRung`, `LadderResponse` Pydantic models |
| `api/index.py` | **Modify** | Register `POST /api/v1/strategy/ladder` and `POST /v1/strategy/ladder` routes |
| `api/requirements.txt` | **Modify** | Add `pytest`, `httpx`, `pytest-cov` |
| `api/tests/__init__.py` | **Create** | Makes tests a package |
| `api/tests/conftest.py` | **Create** | Shared pytest fixtures: in-memory SQLite engine, seeded `Offer` rows, app TestClient |
| `api/tests/test_ladder_unit.py` | **Create** | Unit tests for pure functions (no DB): weights, blended APY, rung term selection |
| `api/tests/test_ladder_integration.py` | **Create** | Integration tests via TestClient: full endpoint, edge cases, warnings |
| `scripts/demo_ladder.py` | **Create** | CLI POC tool — calls ladder logic directly, prints ASCII ladder + JSON for team demos |

---

## Task 1: Add Test Dependencies

**Files:**
- Modify: `api/requirements.txt`

- [ ] **Step 1: Add pytest and httpx to requirements**

Open `api/requirements.txt` and append:

```
pytest==8.3.5
pytest-cov==6.1.0
httpx==0.28.1
```

- [ ] **Step 2: Install dependencies**

```bash
cd api
pip install pytest==8.3.5 pytest-cov==6.1.0 httpx==0.28.1
```

Expected: packages install without errors.

- [ ] **Step 3: Verify pytest is available**

```bash
pytest --version
```

Expected output: `pytest 8.3.5`

- [ ] **Step 4: Commit**

```bash
git add api/requirements.txt
git commit -m "Add pytest, httpx, pytest-cov to api dependencies"
```

---

## Task 2: Test Infrastructure (conftest.py)

**Files:**
- Create: `api/tests/__init__.py`
- Create: `api/tests/conftest.py`

- [ ] **Step 1: Create the tests package**

Create `api/tests/__init__.py` as an empty file.

- [ ] **Step 2: Write conftest.py**

Create `api/tests/conftest.py`:

```python
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from api.models import Base, Offer
from api.index import app, get_db

SQLITE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    e = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=e)
    return e

@pytest.fixture()
def db(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    _seed_offers(session)
    yield session
    session.rollback()
    session.query(Offer).delete()
    session.commit()
    session.close()

def _seed_offers(session):
    """Insert one high-APY offer per standard ladder term."""
    rows = [
        Offer(record_hash="t-3",  product_type="Bank CDs",   institution_name="Alpha Bank",   term_months=3,  apy=4.50, minimum_deposit=500.0,  fdic_insured=True),
        Offer(record_hash="t-6",  product_type="Bank CDs",   institution_name="Beta Bank",    term_months=6,  apy=4.70, minimum_deposit=500.0,  fdic_insured=True),
        Offer(record_hash="t-12", product_type="Bank CDs",   institution_name="Gamma Bank",   term_months=12, apy=4.80, minimum_deposit=1000.0, fdic_insured=True),
        Offer(record_hash="t-24", product_type="Bank CDs",   institution_name="Delta Bank",   term_months=24, apy=4.60, minimum_deposit=1000.0, fdic_insured=True),
        Offer(record_hash="t-36", product_type="Bank CDs",   institution_name="Epsilon Bank", term_months=36, apy=4.40, minimum_deposit=1000.0, fdic_insured=True),
        Offer(record_hash="t-48", product_type="Bank CDs",   institution_name="Zeta Bank",    term_months=48, apy=4.30, minimum_deposit=1000.0, fdic_insured=True),
        Offer(record_hash="t-60", product_type="Bank CDs",   institution_name="Eta Bank",     term_months=60, apy=4.20, minimum_deposit=1000.0, fdic_insured=True),
        # Second offer at 12mo with lower APY (to verify we pick the best)
        Offer(record_hash="t-12b", product_type="Bank CDs",  institution_name="Worse Bank",   term_months=12, apy=3.00, minimum_deposit=500.0,  fdic_insured=True),
    ]
    session.add_all(rows)
    session.commit()

@pytest.fixture()
def client(db):
    """TestClient with the in-memory DB injected via dependency override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# Reusable valid request payload
@pytest.fixture()
def ladder_payload():
    return {
        "investment_amount": 10000,
        "time_horizon_years": 5,
        "liquidity_preference": "medium",
        "income_range": "$75,000 - $100,000",
        "state_selection": "NY",
        "city_county": "New York",
        "tax_filing_status": "single",
    }
```

- [ ] **Step 3: Verify fixtures load without error**

```bash
cd api
pytest tests/conftest.py --collect-only
```

Expected: no collection errors (0 tests collected is fine at this stage).

- [ ] **Step 4: Commit**

```bash
git add api/tests/__init__.py api/tests/conftest.py
git commit -m "Add test infrastructure: in-memory SQLite fixtures and TestClient setup"
```

---

## Task 3: Pydantic Schemas

**Files:**
- Modify: `api/schemas.py`

- [ ] **Step 1: Write a failing test for schema validation**

Create `api/tests/test_ladder_unit.py`:

```python
from api.schemas import LadderRequest, LadderRung, LadderResponse

def test_ladder_request_valid():
    req = LadderRequest(
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        income_range="$75,000 - $100,000",
        state_selection="NY",
        city_county="New York",
        tax_filing_status="single",
    )
    assert req.investment_amount == 10000
    assert req.time_horizon_years == 5
    assert req.liquidity_preference == "medium"

def test_ladder_request_rejects_bad_horizon():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        LadderRequest(
            investment_amount=10000,
            time_horizon_years=6,   # max is 5
            liquidity_preference="medium",
            income_range="$75,000 - $100,000",
            state_selection="NY",
            city_county="",
            tax_filing_status="single",
        )

def test_ladder_request_rejects_bad_liquidity():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        LadderRequest(
            investment_amount=10000,
            time_horizon_years=3,
            liquidity_preference="extreme",  # invalid
            income_range="$75,000 - $100,000",
            state_selection="NY",
            city_county="",
            tax_filing_status="single",
        )
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_ladder_unit.py -v
```

Expected: `ImportError` — `LadderRequest` does not exist yet.

- [ ] **Step 3: Add schemas to schemas.py**

Append to `api/schemas.py`:

```python
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class LadderRequest(BaseModel):
    investment_amount: float = Field(ge=1000, description="Minimum $1,000")
    time_horizon_years: int = Field(ge=1, le=5)
    liquidity_preference: Literal["low", "medium", "high"] = "medium"
    income_range: str
    user_state: str = Field(alias="state_selection")
    user_locality: str = Field(default="", alias="city_county")
    filing_status: str = Field(alias="tax_filing_status")
    zip_code: Optional[str] = Field(default=None, alias="zipcode")
    goal_type: Optional[str] = None

    model_config = {"populate_by_name": True}


class LadderRung(BaseModel):
    term_months: int
    amount: float
    allocation_pct: float       # e.g. 0.2000 for 20%
    provider: str
    product_type: str
    nominal_apy: float
    after_tax_apy: float
    nominal_interest: float     # gross interest earned over term
    after_tax_interest: float
    min_deposit: float
    maturity_date: str          # ISO date string e.g. "2027-05-11"
    source_url: Optional[str] = None


class LadderResponse(BaseModel):
    strategy: Literal["ladder"] = "ladder"
    investment_amount: float
    time_horizon_years: int
    liquidity_preference: str
    rungs: List[LadderRung]
    blended_nominal_apy: float
    blended_after_tax_apy: float
    total_nominal_interest: float
    total_after_tax_interest: float
    next_maturity_months: int   # term of the soonest-maturing rung
    warnings: List[str]
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_ladder_unit.py -v
```

Expected:
```
PASSED tests/test_ladder_unit.py::test_ladder_request_valid
PASSED tests/test_ladder_unit.py::test_ladder_request_rejects_bad_horizon
PASSED tests/test_ladder_unit.py::test_ladder_request_rejects_bad_liquidity
```

- [ ] **Step 5: Commit**

```bash
git add api/schemas.py api/tests/test_ladder_unit.py
git commit -m "Add LadderRequest, LadderRung, LadderResponse schemas with validation tests"
```

---

## Task 4: Weight Calculation (Pure Logic)

**Files:**
- Create: `api/ladder.py`
- Modify: `api/tests/test_ladder_unit.py`

- [ ] **Step 1: Write failing tests for calculate_weights**

Append to `api/tests/test_ladder_unit.py`:

```python
from api.ladder import calculate_weights

def test_weights_sum_to_one():
    for n in range(2, 6):
        for liquidity in ("low", "medium", "high"):
            weights = calculate_weights(n, liquidity)
            assert abs(sum(weights) - 1.0) < 1e-6, f"n={n} liquidity={liquidity} sum={sum(weights)}"

def test_medium_liquidity_equal_weights():
    weights = calculate_weights(5, "medium")
    assert len(weights) == 5
    for w in weights:
        assert abs(w - 0.2) < 1e-6

def test_high_liquidity_short_terms_heavier():
    weights = calculate_weights(5, "high")
    # Each subsequent rung should be lighter
    for i in range(len(weights) - 1):
        assert weights[i] > weights[i + 1], f"weights[{i}]={weights[i]} not > weights[{i+1}]={weights[i+1]}"

def test_low_liquidity_long_terms_heavier():
    weights = calculate_weights(5, "low")
    # Each subsequent rung should be heavier
    for i in range(len(weights) - 1):
        assert weights[i] < weights[i + 1], f"weights[{i}]={weights[i]} not < weights[{i+1}]={weights[i+1]}"

def test_high_liquidity_5_rungs_matches_spec():
    """The spec defines exact deltas: +0.1 shortest, +0.05 2nd, 0 mid, -0.05 4th, -0.1 longest."""
    weights = calculate_weights(5, "high")
    assert abs(weights[0] - 0.30) < 1e-6
    assert abs(weights[1] - 0.25) < 1e-6
    assert abs(weights[2] - 0.20) < 1e-6
    assert abs(weights[3] - 0.15) < 1e-6
    assert abs(weights[4] - 0.10) < 1e-6

def test_weights_all_positive():
    for n in range(2, 6):
        for liquidity in ("low", "medium", "high"):
            weights = calculate_weights(n, liquidity)
            assert all(w > 0 for w in weights), f"n={n} liquidity={liquidity} has non-positive weight"
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_ladder_unit.py::test_weights_sum_to_one -v
```

Expected: `ImportError` — `ladder` module does not exist.

- [ ] **Step 3: Implement calculate_weights in ladder.py**

Create `api/ladder.py`:

```python
from __future__ import annotations
from datetime import date, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from api.models import Offer
from api.schemas import LadderRung, LadderResponse

# Standard ladder rung terms per time horizon (months)
RUNG_TERMS: dict[int, list[int]] = {
    1: [3, 6, 12],
    2: [6, 12, 24],
    3: [12, 24, 36],
    4: [12, 24, 36, 48],
    5: [12, 24, 36, 48, 60],
}

# If investment_amount / n_rungs falls below this, reduce rung count
MIN_RUNG_AMOUNT = 500.0

# Maximum tilt applied at the shortest/longest rung for high/low liquidity
TILT_AMPLITUDE = 0.10


def calculate_weights(n_rungs: int, liquidity: str) -> List[float]:
    """
    Returns n_rungs allocation weights that sum to 1.0.

    medium  → equal weights (1/n each)
    high    → linear gradient, more weight on shorter terms
    low     → linear gradient, more weight on longer terms

    For 5 rungs, high liquidity matches the spec exactly:
      [0.30, 0.25, 0.20, 0.15, 0.10]
    """
    base = 1.0 / n_rungs
    weights = [base] * n_rungs

    if liquidity == "medium" or n_rungs < 2:
        return [round(w, 6) for w in weights]

    sign = 1.0 if liquidity == "high" else -1.0

    for i in range(n_rungs):
        # fraction goes 0.0 (shortest) → 1.0 (longest)
        fraction = i / (n_rungs - 1)
        # tilt: +AMPLITUDE at shortest, -AMPLITUDE at longest (for high)
        tilt = sign * TILT_AMPLITUDE * (1.0 - 2.0 * fraction)
        weights[i] += tilt

    # Clamp each weight to a minimum of 0.01 before normalizing
    weights = [max(0.01, w) for w in weights]

    total = sum(weights)
    return [round(w / total, 6) for w in weights]
```

- [ ] **Step 4: Run weight tests**

```bash
pytest tests/test_ladder_unit.py -k "weight" -v
```

Expected: all weight tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/ladder.py api/tests/test_ladder_unit.py
git commit -m "Implement calculate_weights with liquidity tilt and unit tests"
```

---

## Task 5: CD Selection Per Rung

**Files:**
- Modify: `api/ladder.py`
- Modify: `api/tests/test_ladder_unit.py`

- [ ] **Step 1: Write failing tests for fetch_best_offer_for_term**

Append to `api/tests/test_ladder_unit.py`:

```python
from api.ladder import fetch_best_offer_for_term

def test_fetch_best_offer_exact_term(db):
    offer = fetch_best_offer_for_term(db, term_months=12)
    assert offer is not None
    assert offer.term_months == 12
    assert offer.apy == 4.80  # Gamma Bank (highest at 12mo in fixtures)

def test_fetch_best_offer_picks_highest_apy(db):
    # Fixtures have two 12mo offers: 4.80 and 3.00
    offer = fetch_best_offer_for_term(db, term_months=12)
    assert offer.apy == 4.80

def test_fetch_best_offer_fallback_nearest_term(db):
    # No 18-month offer in fixtures; should fall back to nearest (12 or 24)
    offer = fetch_best_offer_for_term(db, term_months=18)
    assert offer is not None
    assert offer.term_months in (12, 24)

def test_fetch_best_offer_returns_none_when_no_data(db):
    # Query a term far outside the ±3 month window with no nearby offers
    offer = fetch_best_offer_for_term(db, term_months=120)
    assert offer is None
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_ladder_unit.py -k "fetch_best" -v
```

Expected: `ImportError` — `fetch_best_offer_for_term` not defined yet.

- [ ] **Step 3: Implement fetch_best_offer_for_term in ladder.py**

Append to `api/ladder.py` (inside the existing file, after `calculate_weights`):

```python
TERM_FALLBACK_WINDOW = 3  # months — how far to search if exact term unavailable


def fetch_best_offer_for_term(db: Session, term_months: int) -> Optional[Offer]:
    """
    Return the highest-APY offer at exactly term_months.
    If none found, return the highest-APY offer within ±TERM_FALLBACK_WINDOW months.
    Returns None if no offer exists within the fallback window.
    """
    offer = (
        db.query(Offer)
        .filter(Offer.term_months == term_months)
        .order_by(desc(Offer.apy))
        .first()
    )
    if offer:
        return offer

    offer = (
        db.query(Offer)
        .filter(Offer.term_months >= term_months - TERM_FALLBACK_WINDOW)
        .filter(Offer.term_months <= term_months + TERM_FALLBACK_WINDOW)
        .order_by(func.abs(Offer.term_months - term_months), desc(Offer.apy))
        .first()
    )
    return offer
```

- [ ] **Step 4: Run CD selection tests**

```bash
pytest tests/test_ladder_unit.py -k "fetch_best" -v
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/ladder.py api/tests/test_ladder_unit.py
git commit -m "Implement fetch_best_offer_for_term with exact-match and fallback window"
```

---

## Task 6: Blended APY Calculation (Pure Logic)

**Files:**
- Modify: `api/ladder.py`
- Modify: `api/tests/test_ladder_unit.py`

- [ ] **Step 1: Write failing tests**

Append to `api/tests/test_ladder_unit.py`:

```python
from api.ladder import compute_blended_apy
from api.schemas import LadderRung

def _make_rung(term_months, amount, nominal_apy, after_tax_apy):
    return LadderRung(
        term_months=term_months,
        amount=amount,
        allocation_pct=amount / 10000,
        provider="Test Bank",
        product_type="Bank CDs",
        nominal_apy=nominal_apy,
        after_tax_apy=after_tax_apy,
        nominal_interest=amount * nominal_apy / 100 * term_months / 12,
        after_tax_interest=amount * after_tax_apy / 100 * term_months / 12,
        min_deposit=1000.0,
        maturity_date="2027-05-11",
    )

def test_blended_apy_equal_weights():
    rungs = [
        _make_rung(12, 2000, 4.0, 3.0),
        _make_rung(24, 2000, 5.0, 3.75),
        _make_rung(36, 2000, 6.0, 4.5),
    ]
    nominal, after_tax = compute_blended_apy(rungs)
    assert abs(nominal - 5.0) < 0.01    # (4+5+6)/3 = 5.0
    assert abs(after_tax - 3.75) < 0.01  # (3+3.75+4.5)/3 = 3.75

def test_blended_apy_unequal_weights():
    rungs = [
        _make_rung(12, 3000, 4.0, 3.0),   # 30%
        _make_rung(60, 7000, 5.0, 3.75),   # 70%
    ]
    nominal, after_tax = compute_blended_apy(rungs)
    # nominal = (3000*4 + 7000*5) / 10000 = (12000 + 35000) / 10000 = 4.7
    assert abs(nominal - 4.70) < 0.01
    # after_tax = (3000*3 + 7000*3.75) / 10000 = (9000 + 26250) / 10000 = 3.525
    assert abs(after_tax - 3.525) < 0.01

def test_blended_apy_empty_rungs():
    nominal, after_tax = compute_blended_apy([])
    assert nominal == 0.0
    assert after_tax == 0.0
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_ladder_unit.py -k "blended" -v
```

Expected: `ImportError` — `compute_blended_apy` not defined.

- [ ] **Step 3: Implement compute_blended_apy in ladder.py**

Append to `api/ladder.py`:

```python
def compute_blended_apy(rungs: List[LadderRung]) -> Tuple[float, float]:
    """
    Weighted average APY across all rungs, weighted by dollar amount.
    Returns (blended_nominal_apy, blended_after_tax_apy).
    """
    total = sum(r.amount for r in rungs)
    if total == 0:
        return 0.0, 0.0
    nominal = sum(r.amount * r.nominal_apy for r in rungs) / total
    after_tax = sum(r.amount * r.after_tax_apy for r in rungs) / total
    return round(nominal, 2), round(after_tax, 2)
```

- [ ] **Step 4: Run blended APY tests**

```bash
pytest tests/test_ladder_unit.py -k "blended" -v
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/ladder.py api/tests/test_ladder_unit.py
git commit -m "Implement compute_blended_apy with weighted average and unit tests"
```

---

## Task 7: build_ladder Assembler

**Files:**
- Modify: `api/ladder.py`
- Modify: `api/tests/test_ladder_unit.py`

- [ ] **Step 1: Write failing integration tests for build_ladder**

Append to `api/tests/test_ladder_unit.py`:

```python
from api.ladder import build_ladder

def test_build_ladder_5yr_medium(db):
    rungs, warnings = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        fed_rate=0.22,
        state_rate=0.0685,
        local_rate=0.0,
    )
    assert len(rungs) == 5
    # Medium = equal weights → each rung gets $2,000
    for rung in rungs:
        assert abs(rung.amount - 2000.0) < 0.01
    # All rungs must have positive after-tax APY
    for rung in rungs:
        assert rung.after_tax_apy > 0

def test_build_ladder_rung_terms_match_horizon(db):
    from api.ladder import RUNG_TERMS
    for horizon in range(1, 6):
        rungs, _ = build_ladder(
            db=db,
            investment_amount=10000,
            time_horizon_years=horizon,
            liquidity_preference="medium",
            fed_rate=0.22,
            state_rate=0.05,
            local_rate=0.0,
        )
        expected_terms = RUNG_TERMS[horizon]
        actual_terms = [r.term_months for r in rungs]
        # All expected terms should appear (may have fallback term if exact missing)
        assert len(rungs) == len(expected_terms)

def test_build_ladder_high_liquidity_short_heavier(db):
    rungs, _ = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="high",
        fed_rate=0.22,
        state_rate=0.05,
        local_rate=0.0,
    )
    # First rung (shortest) must have more money than last rung (longest)
    assert rungs[0].amount > rungs[-1].amount

def test_build_ladder_maturity_dates_ordered(db):
    rungs, _ = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        fed_rate=0.22,
        state_rate=0.0,
        local_rate=0.0,
    )
    dates = [r.maturity_date for r in rungs]
    assert dates == sorted(dates)

def test_build_ladder_picks_best_apy_per_rung(db):
    rungs, _ = build_ladder(
        db=db,
        investment_amount=10000,
        time_horizon_years=5,
        liquidity_preference="medium",
        fed_rate=0.0,
        state_rate=0.0,
        local_rate=0.0,
    )
    rung_12 = next(r for r in rungs if r.term_months == 12)
    assert rung_12.nominal_apy == 4.80  # not 3.00 (Worse Bank)
    assert rung_12.provider == "Gamma Bank"
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_ladder_unit.py -k "build_ladder" -v
```

Expected: `ImportError` — `build_ladder` not defined.

- [ ] **Step 3: Implement build_ladder in ladder.py**

Append to `api/ladder.py`:

```python
def build_ladder(
    db: Session,
    investment_amount: float,
    time_horizon_years: int,
    liquidity_preference: str,
    fed_rate: float,
    state_rate: float,
    local_rate: float,
) -> Tuple[List[LadderRung], List[str]]:
    """
    Build a CD ladder for the given inputs.
    Returns (rungs, warnings).
    """
    terms = _select_terms(investment_amount, time_horizon_years)
    weights = calculate_weights(len(terms), liquidity_preference)
    warnings: List[str] = []

    if time_horizon_years == 1:
        warnings.append(
            "Short time horizon: a 1-year ladder provides limited diversification benefits."
        )

    today = date.today()
    rungs: List[LadderRung] = []

    for term, weight in zip(terms, weights):
        amount = round(investment_amount * weight, 2)
        offer = fetch_best_offer_for_term(db, term)

        if offer is None:
            warnings.append(f"No CD found near {term}-month term — rung skipped.")
            continue

        actual_term = offer.term_months
        if actual_term != term:
            warnings.append(
                f"No exact {term}-month CD found; using {actual_term}-month CD instead."
            )

        if offer.minimum_deposit and amount < offer.minimum_deposit:
            warnings.append(
                f"{actual_term}-month rung: allocated ${amount:,.0f} is below "
                f"the ${offer.minimum_deposit:,.0f} minimum deposit."
            )

        product_type = _map_product_type(offer.product_type)
        # Treasuries are exempt from state and local tax
        total_tax = fed_rate if product_type == "Treasuries" else (fed_rate + state_rate + local_rate)

        nominal_apy = offer.apy
        after_tax_apy = round(nominal_apy * (1.0 - total_tax), 2)

        gross_interest = round(amount * (nominal_apy / 100.0) * (actual_term / 12.0), 2)
        after_tax_interest = round(gross_interest * (1.0 - total_tax), 2)

        maturity_date = (today + timedelta(days=actual_term * 30)).isoformat()

        provider = offer.institution_name or offer.issuing_bank or offer.brokerage_firm or "Unknown"

        rungs.append(
            LadderRung(
                term_months=actual_term,
                amount=amount,
                allocation_pct=round(weight, 4),
                provider=provider,
                product_type=product_type,
                nominal_apy=round(nominal_apy, 2),
                after_tax_apy=after_tax_apy,
                nominal_interest=gross_interest,
                after_tax_interest=after_tax_interest,
                min_deposit=offer.minimum_deposit or 0.0,
                maturity_date=maturity_date,
                source_url=offer.source_url,
            )
        )

    return rungs, warnings


def _select_terms(investment_amount: float, time_horizon_years: int) -> List[int]:
    """Return rung terms for the horizon, reducing count if investment is too small."""
    terms = RUNG_TERMS[time_horizon_years]
    # Reduce rungs until each rung would receive at least MIN_RUNG_AMOUNT
    while len(terms) > 2 and investment_amount / len(terms) < MIN_RUNG_AMOUNT:
        terms = terms[1:]  # drop shortest rung
    return terms


def _map_product_type(raw: str) -> str:
    mapping = {
        "bank cds": "Bank CDs",
        "brokerage cds": "Brokerage CDs",
        "treasuries": "Treasuries",
        "treasury": "Treasuries",
    }
    return mapping.get(raw.lower(), raw)
```

- [ ] **Step 4: Run build_ladder tests**

```bash
pytest tests/test_ladder_unit.py -k "build_ladder" -v
```

Expected: all 5 tests pass.

- [ ] **Step 5: Run full unit test suite to check no regressions**

```bash
pytest tests/test_ladder_unit.py -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add api/ladder.py api/tests/test_ladder_unit.py
git commit -m "Implement build_ladder assembler: rung selection, tax calc, warnings"
```

---

## Task 8: API Endpoint

**Files:**
- Modify: `api/index.py`
- Create: `api/tests/test_ladder_integration.py`

- [ ] **Step 1: Write failing endpoint tests**

Create `api/tests/test_ladder_integration.py`:

```python
import pytest


def test_ladder_endpoint_returns_200(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 200


def test_ladder_response_structure(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    data = resp.json()
    assert data["strategy"] == "ladder"
    assert data["investment_amount"] == 10000
    assert data["time_horizon_years"] == 5
    assert len(data["rungs"]) == 5
    assert "blended_nominal_apy" in data
    assert "blended_after_tax_apy" in data
    assert "total_nominal_interest" in data
    assert "total_after_tax_interest" in data
    assert "next_maturity_months" in data
    assert "warnings" in data


def test_ladder_rung_fields(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    rung = resp.json()["rungs"][0]
    for field in ("term_months", "amount", "allocation_pct", "provider",
                  "product_type", "nominal_apy", "after_tax_apy",
                  "nominal_interest", "after_tax_interest", "min_deposit", "maturity_date"):
        assert field in rung, f"Missing field: {field}"


def test_ladder_amounts_sum_to_investment(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    rungs = resp.json()["rungs"]
    total = sum(r["amount"] for r in rungs)
    assert abs(total - ladder_payload["investment_amount"]) < 1.0  # rounding tolerance


def test_ladder_short_horizon_warning(client, ladder_payload):
    ladder_payload["time_horizon_years"] = 1
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 200
    warnings = resp.json()["warnings"]
    assert any("short" in w.lower() for w in warnings)


def test_ladder_rejects_below_minimum_investment(client, ladder_payload):
    ladder_payload["investment_amount"] = 500  # below $1,000 minimum
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 422


def test_ladder_rejects_invalid_liquidity(client, ladder_payload):
    ladder_payload["liquidity_preference"] = "extreme"
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 422


def test_ladder_next_maturity_is_shortest_rung(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    data = resp.json()
    shortest_term = min(r["term_months"] for r in data["rungs"])
    assert data["next_maturity_months"] == shortest_term


def test_ladder_no_auth_required(client, ladder_payload):
    """Endpoint is public — no auth headers needed."""
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code != 401
    assert resp.status_code != 403
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_ladder_integration.py -v
```

Expected: `404 Not Found` for all tests — endpoint not registered yet.

- [ ] **Step 3: Register the endpoint in index.py**

In `api/index.py`, add the import at the top with other imports:

```python
from api.ladder import build_ladder, compute_blended_apy
from api.schemas import LadderRequest, LadderResponse
```

Then add the endpoint function (place after the existing `fetch_yields` endpoint):

```python
@app.post("/api/v1/strategy/ladder", response_model=LadderResponse)
@app.post("/v1/strategy/ladder", response_model=LadderResponse)
def ladder_strategy(request: LadderRequest, db: Session = Depends(get_db)):
    income = estimate_income_from_range(request.income_range)
    filing_key = normalize_filing_status(request.filing_status)
    state_candidates = state_id_candidates(request.user_state)
    locality = normalize_locality(request.user_locality)

    fed_rate = get_federal_rate(db, filing_key, income, request.income_range, request.filing_status)
    state_rate = get_state_tax_rate(db, state_candidates, filing_key, income)
    local_rate = get_local_tax_rate(db, state_candidates, locality)

    rungs, warnings = build_ladder(
        db=db,
        investment_amount=request.investment_amount,
        time_horizon_years=request.time_horizon_years,
        liquidity_preference=request.liquidity_preference,
        fed_rate=fed_rate,
        state_rate=state_rate,
        local_rate=local_rate,
    )

    blended_nominal, blended_after_tax = compute_blended_apy(rungs)
    total_nominal = round(sum(r.nominal_interest for r in rungs), 2)
    total_after_tax = round(sum(r.after_tax_interest for r in rungs), 2)
    next_maturity = min((r.term_months for r in rungs), default=0)

    return LadderResponse(
        investment_amount=request.investment_amount,
        time_horizon_years=request.time_horizon_years,
        liquidity_preference=request.liquidity_preference,
        rungs=rungs,
        blended_nominal_apy=blended_nominal,
        blended_after_tax_apy=blended_after_tax,
        total_nominal_interest=total_nominal,
        total_after_tax_interest=total_after_tax,
        next_maturity_months=next_maturity,
        warnings=warnings,
    )
```

- [ ] **Step 4: Run integration tests**

```bash
pytest tests/test_ladder_integration.py -v
```

Expected: all 9 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
pytest tests/ -v
```

Expected: all tests pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add api/index.py api/tests/test_ladder_integration.py
git commit -m "Register POST /api/v1/strategy/ladder endpoint with integration tests"
```

---

## Task 9: Edge Cases

**Files:**
- Modify: `api/tests/test_ladder_integration.py`
- Modify: `api/tests/test_ladder_unit.py`

- [ ] **Step 1: Write edge case tests**

Append to `api/tests/test_ladder_unit.py`:

```python
from api.ladder import _select_terms

def test_small_investment_reduces_rungs():
    # $1,000 / 5 rungs = $200 per rung < MIN_RUNG_AMOUNT ($500)
    # Should reduce to 2 rungs ($500 each)
    terms = _select_terms(investment_amount=1000, time_horizon_years=5)
    assert len(terms) <= 2
    assert 1000 / len(terms) >= 500

def test_large_investment_keeps_all_rungs():
    terms = _select_terms(investment_amount=50000, time_horizon_years=5)
    assert len(terms) == 5

def test_min_rung_floor_is_2():
    # Even if investment is tiny, never reduce below 2 rungs
    terms = _select_terms(investment_amount=100, time_horizon_years=5)
    assert len(terms) >= 2
```

Append to `api/tests/test_ladder_integration.py`:

```python
def test_small_investment_reduces_rung_count(client, ladder_payload):
    ladder_payload["investment_amount"] = 1000
    ladder_payload["time_horizon_years"] = 5
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 200
    rungs = resp.json()["rungs"]
    # With $1,000 / 5 rungs = $200 < $500 threshold → expect fewer than 5 rungs
    assert len(rungs) < 5

def test_high_liquidity_weights_tilt_correctly(client, ladder_payload):
    ladder_payload["liquidity_preference"] = "high"
    ladder_payload["time_horizon_years"] = 5
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    rungs = resp.json()["rungs"]
    # First rung (shortest) must have more allocated than last (longest)
    assert rungs[0]["amount"] > rungs[-1]["amount"]

def test_low_liquidity_weights_tilt_correctly(client, ladder_payload):
    ladder_payload["liquidity_preference"] = "low"
    ladder_payload["time_horizon_years"] = 5
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    rungs = resp.json()["rungs"]
    # Last rung (longest) must have more allocated than first (shortest)
    assert rungs[-1]["amount"] > rungs[0]["amount"]
```

- [ ] **Step 2: Run edge case tests**

```bash
pytest tests/ -v
```

Expected: all tests pass including the new edge case tests.

- [ ] **Step 3: Commit**

```bash
git add api/tests/test_ladder_unit.py api/tests/test_ladder_integration.py
git commit -m "Add edge case tests: small investment rung reduction, liquidity weight direction"
```

---

## Task 10: Demo CLI (Local POC)

**Files:**
- Create: `scripts/demo_ladder.py`

- [ ] **Step 1: Create scripts/ directory if it doesn't exist**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Create demo_ladder.py**

Create `scripts/demo_ladder.py`:

```python
#!/usr/bin/env python3
"""
CD Ladder demo — calls ladder logic directly against the local database.
Run from the repo root:
    python scripts/demo_ladder.py
    python scripts/demo_ladder.py --scenario high_liquidity
    python scripts/demo_ladder.py --amount 20000 --horizon 3 --liquidity low --state CA
"""
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.ladder import build_ladder, compute_blended_apy
from api.index import (
    get_federal_rate, get_state_tax_rate, get_local_tax_rate,
    estimate_income_from_range, normalize_filing_status,
    state_id_candidates, normalize_locality,
)

DB_URL = os.getenv("DATABASE_URL", "sqlite:///test.db")

SCENARIOS = {
    "default": {
        "investment_amount": 10000,
        "time_horizon_years": 5,
        "liquidity_preference": "medium",
        "income_range": "$75,000 - $100,000",
        "state": "NY",
        "city_county": "New York",
        "filing_status": "single",
    },
    "high_liquidity": {
        "investment_amount": 25000,
        "time_horizon_years": 5,
        "liquidity_preference": "high",
        "income_range": "$100,000 - $150,000",
        "state": "CA",
        "city_county": "",
        "filing_status": "single",
    },
    "low_liquidity": {
        "investment_amount": 50000,
        "time_horizon_years": 5,
        "liquidity_preference": "low",
        "income_range": "$150,000 - $200,000",
        "state": "TX",
        "city_county": "",
        "filing_status": "joint",
    },
    "short_horizon": {
        "investment_amount": 10000,
        "time_horizon_years": 1,
        "liquidity_preference": "high",
        "income_range": "$50,000 - $75,000",
        "state": "FL",
        "city_county": "",
        "filing_status": "single",
    },
}


def run_demo(scenario: dict) -> None:
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        income = estimate_income_from_range(scenario["income_range"])
        filing_key = normalize_filing_status(scenario["filing_status"])
        state_candidates = state_id_candidates(scenario["state"])
        locality = normalize_locality(scenario.get("city_county", ""))

        fed_rate = get_federal_rate(db, filing_key, income, scenario["income_range"], scenario["filing_status"])
        state_rate = get_state_tax_rate(db, state_candidates, filing_key, income)
        local_rate = get_local_tax_rate(db, state_candidates, locality)

        rungs, warnings = build_ladder(
            db=db,
            investment_amount=scenario["investment_amount"],
            time_horizon_years=scenario["time_horizon_years"],
            liquidity_preference=scenario["liquidity_preference"],
            fed_rate=fed_rate,
            state_rate=state_rate,
            local_rate=local_rate,
        )

        blended_nominal, blended_after_tax = compute_blended_apy(rungs)
        total_nominal = sum(r.nominal_interest for r in rungs)
        total_after_tax = sum(r.after_tax_interest for r in rungs)

        print("\n" + "=" * 60)
        print(f"  CD LADDER — {scenario['state']} | "
              f"${scenario['investment_amount']:,.0f} | "
              f"{scenario['time_horizon_years']}yr | "
              f"{scenario['liquidity_preference'].upper()} liquidity")
        print("=" * 60)
        print(f"  Tax rates:  Federal {fed_rate:.1%}  |  State {state_rate:.1%}  |  Local {local_rate:.1%}")
        print(f"  Blended APY:  {blended_nominal:.2f}% nominal  →  {blended_after_tax:.2f}% after-tax")
        print(f"  Total interest:  ${total_nominal:,.2f} nominal  →  ${total_after_tax:,.2f} after-tax")
        print()

        # ASCII ladder visualization
        max_amount = max(r.amount for r in rungs) if rungs else 1
        bar_max = 30

        print(f"  {'TERM':>8}  {'AMOUNT':>10}  {'APY':>6}  {'AFTER-TAX':>9}  {'PROVIDER'}")
        print(f"  {'-'*8}  {'-'*10}  {'-'*6}  {'-'*9}  {'-'*20}")
        for rung in rungs:
            bar_len = int(rung.amount / max_amount * bar_max)
            bar = "█" * bar_len
            print(
                f"  {rung.term_months:>5}mo  "
                f"${rung.amount:>9,.0f}  "
                f"{rung.nominal_apy:>5.2f}%  "
                f"{rung.after_tax_apy:>8.2f}%  "
                f"{rung.provider:<20}  {bar}"
            )

        if warnings:
            print()
            print("  ⚠ Warnings:")
            for w in warnings:
                print(f"    - {w}")

        print()

        # JSON output
        output = {
            "scenario": scenario,
            "tax_rates": {"federal": fed_rate, "state": state_rate, "local": local_rate},
            "blended_nominal_apy": blended_nominal,
            "blended_after_tax_apy": blended_after_tax,
            "total_nominal_interest": round(total_nominal, 2),
            "total_after_tax_interest": round(total_after_tax, 2),
            "rungs": [r.model_dump() for r in rungs],
            "warnings": warnings,
        }
        print("  JSON output:")
        print(json.dumps(output, indent=2))

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="SmartCD Ladder POC Demo")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()), default="default")
    parser.add_argument("--amount", type=float)
    parser.add_argument("--horizon", type=int, choices=[1, 2, 3, 4, 5])
    parser.add_argument("--liquidity", choices=["low", "medium", "high"])
    parser.add_argument("--state", type=str)
    args = parser.parse_args()

    scenario = dict(SCENARIOS[args.scenario])
    if args.amount:
        scenario["investment_amount"] = args.amount
    if args.horizon:
        scenario["time_horizon_years"] = args.horizon
    if args.liquidity:
        scenario["liquidity_preference"] = args.liquidity
    if args.state:
        scenario["state"] = args.state

    run_demo(scenario)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Test the demo against the local SQLite test DB**

```bash
python scripts/demo_ladder.py --scenario default
```

Expected: ASCII ladder printed with 5 rungs and JSON output. If the test.db has no offer data, you'll see empty rungs — that's fine, it means the DB connection works and the logic runs.

```bash
python scripts/demo_ladder.py --scenario high_liquidity
python scripts/demo_ladder.py --amount 5000 --horizon 3 --liquidity high --state TX
```

- [ ] **Step 4: Commit**

```bash
git add scripts/demo_ladder.py
git commit -m "Add demo_ladder.py CLI tool for local POC and team demos"
```

---

## Task 11: Final Check and Coverage Report

- [ ] **Step 1: Run full test suite with coverage**

```bash
pytest tests/ -v --cov=api/ladder --cov=api/schemas --cov-report=term-missing
```

Expected: all tests pass. Coverage for `api/ladder.py` should be ≥ 85%.

- [ ] **Step 2: Start the server locally and verify the endpoint with curl**

```bash
cd api
uvicorn index:app --reload --port 8000
```

In a second terminal:

```bash
curl -s -X POST http://localhost:8000/api/v1/strategy/ladder \
  -H "Content-Type: application/json" \
  -d '{
    "investment_amount": 10000,
    "time_horizon_years": 5,
    "liquidity_preference": "medium",
    "income_range": "$75,000 - $100,000",
    "state_selection": "NY",
    "city_county": "New York",
    "tax_filing_status": "single"
  }' | python -m json.tool
```

Expected: valid JSON response with `strategy: "ladder"` and 5 rungs.

- [ ] **Step 3: Run the demo script for the team POC**

```bash
python scripts/demo_ladder.py --scenario default
python scripts/demo_ladder.py --scenario high_liquidity
python scripts/demo_ladder.py --scenario low_liquidity
```

Screenshot the output for the team in Discord.

- [ ] **Step 4: Final commit and push**

```bash
git add .
git commit -m "CD Ladder backend: endpoint, logic, tests, and demo tool complete"
git push origin <your-branch>
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Covered by |
|---|---|
| §3 Required inputs (investment_amount, time_horizon, liquidity_preference) | `LadderRequest` schema, Task 3 |
| §3 Optional inputs (goal_type) | `LadderRequest.goal_type`, Task 3 |
| §4 Baseline equal allocation | `calculate_weights` medium, Task 4 |
| §4 High/low liquidity dynamic adjustment | `calculate_weights` tilt, Task 4 |
| §5 Ladder bucket terms (6, 12, 24, 36, 48, 60mo) | `RUNG_TERMS`, Task 7 |
| §5 Highest APY per bucket | `fetch_best_offer_for_term` order_by desc(apy), Task 5 |
| §5 Nearest term fallback if exact unavailable | `fetch_best_offer_for_term` fallback, Task 5 |
| §6 Output structure (strategy, allocation, cds, blended_apy) | `LadderResponse`, Task 3 |
| §7 Blended APY weighted average formula | `compute_blended_apy`, Task 6 |
| §7 After-tax APY | `build_ladder` tax calc, Task 7 |
| §10 POST /strategy/ladder endpoint | `api/index.py`, Task 8 |
| §11 Investment below minimum → reduce rungs | `_select_terms`, Task 9 |
| §11 Short horizon (<1yr) warning | `build_ladder` warning, Task 7 |
| §11 Missing CD duration → nearest available | `fetch_best_offer_for_term` fallback + warning, Tasks 5 & 7 |
| §11 Very small investment → mini ladder | `_select_terms` MIN_RUNG_AMOUNT, Task 9 |
| Local POC / demo tool | `scripts/demo_ladder.py`, Task 10 |

**Not implemented (out of scope per spec):**
- §8 Simulation engine (rate scenario projections) — marked future in spec
- §9 Frontend UI components — frontend team's work
- §12 Future enhancements (AI-optimized spacing, auto-rollover) — Jun 2026 target

### No Placeholder Check ✓
All code blocks are complete. No TBDs.

### Type Consistency Check ✓
- `LadderRung` defined in Task 3, used identically in Tasks 6, 7, 8
- `build_ladder` returns `Tuple[List[LadderRung], List[str]]` — consistent across Tasks 7 and 8
- `compute_blended_apy` takes `List[LadderRung]`, returns `Tuple[float, float]` — consistent across Tasks 6 and 8
- `fetch_best_offer_for_term(db, term_months)` — consistent across Tasks 5, 7, 10
- `_select_terms(investment_amount, time_horizon_years)` — consistent across Tasks 7 and 9
