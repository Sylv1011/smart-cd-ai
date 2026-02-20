from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str


class YieldResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    yield_value: float = Field(serialization_alias="yield")
