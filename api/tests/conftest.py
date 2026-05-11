import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from api.models import Base, Offer
from api.index import app
from api.database import get_db

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
