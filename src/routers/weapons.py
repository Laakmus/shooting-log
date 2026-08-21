from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from src.database import get_db
from src.models import Weapon
from src.schemas import WeaponCreate, WeaponRead, WeaponUpdate

router = APIRouter(prefix="/weapons", tags=["weapons"])


def current_weapon(weapon_id: int, db: DBSession):
    weapon = db.get(Weapon, weapon_id)
    if not weapon:
        raise HTTPException(status_code=404, detail="Weapon not found")
    return weapon


@router.post("/", response_model=WeaponRead, status_code=201)
def add_weapon(data: WeaponCreate, db: DBSession = Depends(get_db)) -> WeaponRead:
    weapon = Weapon(**data.model_dump())
    db.add(weapon)
    db.commit()
    db.refresh(weapon)
    return weapon


@router.get("/", response_model=list[WeaponRead], status_code=200)
def get_weapons(db: DBSession = Depends(get_db)) -> list[WeaponRead]:
    return db.execute(select(Weapon)).scalars().all()


@router.get("/{weapon_id}", response_model=WeaponRead, status_code=200)
def get_current_weapon(weapon_id: int, db: DBSession = Depends(get_db)):
    return current_weapon(weapon_id, db)


@router.patch("/{weapon_id}", response_model=WeaponRead, status_code=200)
def change_current_weapon(weapon_id: int, data: WeaponUpdate, db: DBSession = Depends(get_db)) -> WeaponRead:
    response = current_weapon(weapon_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(response, field, value)
    db.commit()
    db.refresh(response)
    return response


@router.delete("/{weapon_id}", status_code=204)
def delete_current_weapon(weapon_id: int, db: DBSession = Depends(get_db)):
    response = current_weapon(weapon_id, db)
    db.delete(response)
    db.commit()








