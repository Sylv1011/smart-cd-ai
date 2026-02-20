from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import YieldRecord
from api.schemas import HealthResponse, YieldResponse

app = FastAPI(title="SmartCD Backend API")

@app.get("/api/health", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="OK")


@app.get("/api/yield", response_model=YieldResponse)
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
