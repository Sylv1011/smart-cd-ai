from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import YieldRecord
from app.schemas import HealthResponse, YieldResponse

settings = get_settings()

app = FastAPI(title="SmartCD Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.resolved_cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="OK")


@app.get("/yield", response_model=YieldResponse)
def get_current_yield(db: Session = Depends(get_db)) -> YieldResponse:
    try:
        row = db.query(YieldRecord).order_by(desc(YieldRecord.id)).first()
    except SQLAlchemyError:
        # Graceful failure when PostgreSQL is unavailable or query fails.
        raise HTTPException(status_code=503, detail="Database is not reachable")

    if row is None:
        raise HTTPException(status_code=404, detail="No yield data available")

    return YieldResponse(yield_value=row.yield_value)
