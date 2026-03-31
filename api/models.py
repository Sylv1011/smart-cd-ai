from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class YieldRecord(Base):
    __tablename__ = "yields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    yield_value: Mapped[float] = mapped_column("value", Float, nullable=False)


class FederalTax(Base):
    __tablename__ = "federal_taxes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filing_status: Mapped[str] = mapped_column(String, nullable=False)
    rate: Mapped[float] = mapped_column(Float, nullable=False)
    min_income: Mapped[float] = mapped_column(Float, nullable=False)
    max_income: Mapped[float] = mapped_column(Float, nullable=True)


class LocalTax(Base):
    __tablename__ = "local_taxes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    state: Mapped[str] = mapped_column(String, nullable=False)
    county: Mapped[str] = mapped_column(String, nullable=True)
    city: Mapped[str] = mapped_column(String, nullable=True)
    tax_rate: Mapped[float] = mapped_column(Float, nullable=False)


class Offer(Base):
    __tablename__ = "offers"

    record_hash: Mapped[str] = mapped_column(String, primary_key=True)
    product_type: Mapped[str] = mapped_column(String, nullable=False)
    institution_name: Mapped[str] = mapped_column(String, nullable=True)
    brokerage_firm: Mapped[str] = mapped_column(String, nullable=True)
    issuing_bank: Mapped[str] = mapped_column(String, nullable=True)
    term_months: Mapped[int] = mapped_column(Integer, nullable=False)
    apy: Mapped[float] = mapped_column(Float, nullable=False)
    minimum_deposit: Mapped[float] = mapped_column(Float, nullable=False)
    fdic_insured: Mapped[bool] = mapped_column(Boolean, nullable=True)
    source_name: Mapped[str] = mapped_column(String, nullable=True)
    source_url: Mapped[str] = mapped_column(String, nullable=True)
    destination_url: Mapped[str] = mapped_column(String, nullable=True)
    retrieved_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)


class StatesTaxConfig(Base):
    __tablename__ = "states_tax_config"

    state_id: Mapped[str] = mapped_column(String, primary_key=True)
    has_tax: Mapped[bool] = mapped_column(Boolean, nullable=False)
    std_ded_sgl: Mapped[float] = mapped_column(Float, nullable=True)
    std_ded_jnt: Mapped[float] = mapped_column(Float, nullable=True)
    is_exmpt_credit: Mapped[bool] = mapped_column(Boolean, nullable=True)
    pers_exmpt_sgl: Mapped[float] = mapped_column(Float, nullable=True)
    pers_exmpt_jnt: Mapped[float] = mapped_column(Float, nullable=True)
    dep_exmpt: Mapped[float] = mapped_column(Float, nullable=True)


class TaxBracket(Base):
    __tablename__ = "tax_brackets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    state_id: Mapped[str] = mapped_column(String, nullable=False)
    filing_status: Mapped[str] = mapped_column(String, nullable=False)
    tax_rate: Mapped[float] = mapped_column(Float, nullable=False)
    bracket_thrld: Mapped[float] = mapped_column(Float, nullable=False)
