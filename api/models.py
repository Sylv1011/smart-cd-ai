from sqlalchemy import Float, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class YieldRecord(Base):
    __tablename__ = "yields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    yield_value: Mapped[float] = mapped_column("value", Float, nullable=False)
