from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TrainingSessionBase(BaseModel):
    @field_validator("training_date", check_fields=False)
    @classmethod
    def validate_training_date(cls, v):
        if v is not None and v > date.today():
            raise ValueError("Training date must be in the past")
        return v

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


class TrainingSessionCreate(TrainingSessionBase):
    training_date: date
    place: str | None = None
    cost: Decimal
    note: str | None = None


class TrainingSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    training_date: date
    place: str | None = None
    cost: Decimal
    note: str | None = None


class TrainingSessionUpdate(TrainingSessionBase):
    training_date: date | None = None
    place: str | None = None
    cost: Decimal | None = None
    note: str | None = None


class SessionWeaponCreate(BaseModel):
    weapon_id: int
    magazines_count: int | None = None
    rounds_per_magazine: int | None = None
    rounds_fired: int | None = Field(default=None, gt=0)
    ammo_cost: Decimal | None = None


class SessionWeaponRead(BaseModel):
    id: int
    weapon_id: int
    session_id: int
    magazines_count: int | None = Field(default=None, gt=0)
    rounds_per_magazine: int | None = Field(default=None, gt=0)
    rounds_fired: int
    ammo_cost: Decimal | None = Field(default=None, gt=0)







