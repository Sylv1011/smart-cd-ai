from __future__ import annotations

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.convergence_cache import convergence_cache
from api.database import get_db
from api.index import app
from api.models import Base, Offer

# ---------------------------------------------------------------------------
# In-memory SQLite test DB — StaticPool so all sessions share one connection
# ---------------------------------------------------------------------------

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    convergence_cache._store.clear()
    yield


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture()
def client():
    return TestClient(app)


def make_offer(record_hash: str, term_months: int = 12, minimum_deposit: float = 1000.0, status: str = "active") -> Offer:
    return Offer(
        record_hash=record_hash,
        product_type="bank_cd",
        term_months=term_months,
        apy=5.0,
        minimum_deposit=minimum_deposit,
        status=status,
    )


FUTURE_DATE = (date.today() + timedelta(days=730)).isoformat()  # ~2 years out

BASE_REQUEST = {
    "target_maturity_date": FUTURE_DATE,
    "investment_amount": 30000,
    "tranches": [
        {"slot": 1, "buy_in_months": 0, "required_term_months": 24, "product_id": "prod-a", "allocation": 10000},
        {"slot": 2, "buy_in_months": 6, "required_term_months": 18, "product_id": "prod-b", "allocation": 10000},
        {"slot": 3, "buy_in_months": 12, "required_term_months": 12, "product_id": "prod-c", "allocation": 10000},
    ],
}


# ---------------------------------------------------------------------------
# Happy path tests
# ---------------------------------------------------------------------------

class TestHappyPath:
    def test_returns_200_with_all_products_active(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        resp = client.post("/strategy/bullet/convergence", json=BASE_REQUEST)
        assert resp.status_code == 200

    def test_response_has_required_top_level_fields(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        body = client.post("/strategy/bullet/convergence", json=BASE_REQUEST).json()
        for field in ("overall_score", "confidence_label", "target_maturity_date", "cache_hit", "tranches", "ai_summary_input"):
            assert field in body, f"missing field: {field}"

    def test_tranche_results_count_matches_input(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        body = client.post("/strategy/bullet/convergence", json=BASE_REQUEST).json()
        assert len(body["tranches"]) == 3

    def test_high_confidence_when_all_products_match_exactly(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24, minimum_deposit=1000),
            make_offer("prod-b", term_months=18, minimum_deposit=1000),
            make_offer("prod-c", term_months=12, minimum_deposit=1000),
        ])
        db.commit()

        body = client.post("/strategy/bullet/convergence", json=BASE_REQUEST).json()
        # All term scores 100, availability 100, deposit 100 → composite 100 → label High
        assert body["confidence_label"] == "High"
        assert body["overall_score"] == pytest.approx(100.0)

    def test_single_tranche_request(self, client, db):
        db.add(make_offer("prod-a", term_months=24))
        db.commit()

        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 10000,
            "tranches": [{"slot": 1, "buy_in_months": 0, "required_term_months": 24, "product_id": "prod-a", "allocation": 10000}],
        }
        resp = client.post("/strategy/bullet/convergence", json=req)
        assert resp.status_code == 200

    def test_ai_summary_input_fields(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        body = client.post("/strategy/bullet/convergence", json=BASE_REQUEST).json()
        ai = body["ai_summary_input"]
        for field in ("overall_score", "confidence_label", "target_maturity_date", "tranche_count", "flags", "deviations", "at_risk_tranches", "limited_availability_tranches"):
            assert field in ai, f"missing ai_summary_input field: {field}"

    def test_tranche_result_fields(self, client, db):
        db.add(make_offer("prod-a", term_months=24))
        db.commit()

        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 10000,
            "tranches": [{"slot": 1, "buy_in_months": 0, "required_term_months": 24, "product_id": "prod-a", "allocation": 10000}],
        }
        body = client.post("/strategy/bullet/convergence", json=req).json()
        t = body["tranches"][0]
        for field in ("slot", "buy_in_months", "product_id", "term_match_score", "availability_score", "deposit_score", "tranche_score", "actual_maturity_date", "deviation_days", "flags"):
            assert field in t, f"missing tranche field: {field}"


# ---------------------------------------------------------------------------
# Cache behaviour
# ---------------------------------------------------------------------------

class TestCacheBehavior:
    def test_first_request_is_cache_miss(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        body = client.post("/strategy/bullet/convergence", json=BASE_REQUEST).json()
        assert body["cache_hit"] is False

    def test_second_identical_request_is_cache_hit(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        client.post("/strategy/bullet/convergence", json=BASE_REQUEST)
        body = client.post("/strategy/bullet/convergence", json=BASE_REQUEST).json()
        assert body["cache_hit"] is True

    def test_different_date_is_cache_miss(self, client, db):
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        client.post("/strategy/bullet/convergence", json=BASE_REQUEST)

        req2 = dict(BASE_REQUEST)
        req2["target_maturity_date"] = (date.today() + timedelta(days=800)).isoformat()
        body2 = client.post("/strategy/bullet/convergence", json=req2).json()
        assert body2["cache_hit"] is False

    def test_different_investment_amount_is_cache_hit(self, client, db):
        """investment_amount is excluded from the cache key."""
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
            make_offer("prod-c", term_months=12),
        ])
        db.commit()

        client.post("/strategy/bullet/convergence", json=BASE_REQUEST)

        req2 = dict(BASE_REQUEST)
        req2["investment_amount"] = 99999
        body2 = client.post("/strategy/bullet/convergence", json=req2).json()
        assert body2["cache_hit"] is True


# ---------------------------------------------------------------------------
# Error handling / edge cases
# ---------------------------------------------------------------------------

class TestErrorHandling:
    def test_past_target_date_returns_400(self, client):
        req = dict(BASE_REQUEST)
        req["target_maturity_date"] = "2020-01-01"
        resp = client.post("/strategy/bullet/convergence", json=req)
        assert resp.status_code == 400
        assert "future" in resp.json()["detail"].lower()

    def test_empty_tranches_returns_4xx(self, client):
        req = dict(BASE_REQUEST)
        req["tranches"] = []
        resp = client.post("/strategy/bullet/convergence", json=req)
        # Pydantic min_length=1 fires before the handler → 422
        assert resp.status_code in (400, 422)

    def test_missing_product_id_returns_400(self, client):
        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 10000,
            "tranches": [{"slot": 1, "buy_in_months": 0, "required_term_months": 12, "product_id": "", "allocation": 5000}],
        }
        resp = client.post("/strategy/bullet/convergence", json=req)
        assert resp.status_code == 400

    def test_product_not_found_returns_product_not_found_flag(self, client, db):
        # No offers seeded — all products missing
        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 10000,
            "tranches": [{"slot": 1, "buy_in_months": 0, "required_term_months": 12, "product_id": "ghost-id", "allocation": 5000}],
        }
        body = client.post("/strategy/bullet/convergence", json=req).json()
        assert body["status_code"] if "status_code" in body else True  # 200 body
        tranche = body["tranches"][0]
        assert "product_not_found" in tranche["flags"]

    def test_missing_product_scores_zero_not_seventy(self, client, db):
        """A missing product must get 0 for all sub-scores, not the ~70 from
        the default actual_term==required_term + min_deposit==0 fallbacks."""
        db.add_all([
            make_offer("prod-a", term_months=24),
            make_offer("prod-b", term_months=18),
        ])
        db.commit()

        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 30000,
            "tranches": [
                {"slot": 1, "buy_in_months": 0, "required_term_months": 24, "product_id": "prod-a", "allocation": 10000},
                {"slot": 2, "buy_in_months": 6, "required_term_months": 18, "product_id": "prod-b", "allocation": 10000},
                {"slot": 3, "buy_in_months": 12, "required_term_months": 12, "product_id": "ghost-id", "allocation": 10000},
            ],
        }
        body = client.post("/strategy/bullet/convergence", json=req).json()

        missing = next(t for t in body["tranches"] if t["slot"] == 3)
        assert missing["term_match_score"] == 0.0
        assert missing["availability_score"] == 0.0
        assert missing["deposit_score"] == 0.0
        assert missing["tranche_score"] == 0.0
        assert "product_not_found" in missing["flags"]

        # Two perfect tranches (100) + one missing (0) → ~66.7 → Medium, not High
        assert body["overall_score"] == pytest.approx(200 / 3, rel=1e-3)
        assert body["confidence_label"] == "Medium"

    def test_all_products_not_found_forces_at_risk(self, client, db):
        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 30000,
            "tranches": [
                {"slot": 1, "buy_in_months": 0, "required_term_months": 24, "product_id": "ghost-1", "allocation": 10000},
                {"slot": 2, "buy_in_months": 6, "required_term_months": 18, "product_id": "ghost-2", "allocation": 10000},
            ],
        }
        body = client.post("/strategy/bullet/convergence", json=req).json()
        assert body["overall_score"] == 0.0
        assert body["confidence_label"] == "At Risk"

    def test_limited_status_product_adds_flag(self, client, db):
        db.add(make_offer("prod-lim", term_months=12, status="limited"))
        db.commit()

        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 10000,
            "tranches": [{"slot": 1, "buy_in_months": 0, "required_term_months": 12, "product_id": "prod-lim", "allocation": 5000}],
        }
        body = client.post("/strategy/bullet/convergence", json=req).json()
        tranche = body["tranches"][0]
        assert "product_availability_limited" in tranche["flags"]

    def test_deposit_shortfall_adds_flag(self, client, db):
        db.add(make_offer("prod-a", term_months=12, minimum_deposit=10000))
        db.commit()

        req = {
            "target_maturity_date": FUTURE_DATE,
            "investment_amount": 10000,
            "tranches": [{"slot": 1, "buy_in_months": 0, "required_term_months": 12, "product_id": "prod-a", "allocation": 500}],
        }
        body = client.post("/strategy/bullet/convergence", json=req).json()
        tranche = body["tranches"][0]
        assert "deposit_shortfall" in tranche["flags"]

    def test_invalidate_cache_endpoint(self, client):
        resp = client.post(
            "/strategy/bullet/convergence/invalidate-cache",
            json=["prod-a", "prod-b"],
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["invalidated"] is True
        assert set(body["product_ids"]) == {"prod-a", "prod-b"}
