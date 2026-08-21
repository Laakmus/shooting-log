from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class WeaponCreate(BaseModel):
    name: str
    magazine_capacity: int
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    note: str | None = None


class WeaponRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    magazine_capacity: int
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    note: str | None = None


class WeaponUpdate(BaseModel):
    name: str | None = None
    magazine_capacity: int | None = None
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    note: str | None = None

