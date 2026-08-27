from datetime import date
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Weapon(Base):
    __tablename__ = "weapons"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    magazine_capacity: Mapped[int]
    purchase_date: Mapped[date | None]
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    note: Mapped[str | None]

    session_weapons: Mapped[list["SessionWeapon"]] = relationship(back_populates="weapon")

class TrainingSession(Base):
    __tablename__ = "training_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    training_date: Mapped[date]
    place: Mapped[str | None]
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    note: Mapped[str | None]

    session_weapons: Mapped[list["SessionWeapon"]] = relationship(back_populates="session")


class SessionWeapon(Base):
    __tablename__ = "sessions_weapons"
    id: Mapped[int] = mapped_column(primary_key=True)
    weapon_id: Mapped[int] = mapped_column(ForeignKey("weapons.id"))
    session_id: Mapped[int] = mapped_column(ForeignKey("training_sessions.id"))
    magazines_count: Mapped[int | None]
    rounds_per_magazine: Mapped[int | None]
    rounds_fired: Mapped[int]
    ammo_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    weapon: Mapped["Weapon"] = relationship(back_populates="session_weapons")
    session: Mapped["TrainingSession"] = relationship(back_populates="session_weapons")








