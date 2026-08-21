from datetime import date
from decimal import Decimal

from sqlalchemy import Numeric
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Weapon(Base):
    __tablename__ = "weapons"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    magazine_capacity: Mapped[int]
    purchase_date: Mapped[date | None]
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    note: Mapped[str | None]

