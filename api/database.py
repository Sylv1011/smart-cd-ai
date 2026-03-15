from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.resolved_database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
